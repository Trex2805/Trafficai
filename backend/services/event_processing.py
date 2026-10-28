from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path


def read_detection_log(path: str | Path) -> list[dict]:
    """Read normal JSONL and logs containing literal escaped newlines."""
    path = Path(path)
    text = path.read_text(encoding="utf-8").strip()

    if not text:
        return []

    try:
        records = [json.loads(line) for line in text.splitlines() if line.strip()]
        if all(isinstance(record, dict) for record in records):
            return records
    except json.JSONDecodeError:
        pass

    # Compatibility with the existing log writer, which may have
    # written literal backslash-n separators instead of real newlines.
    normalized = text.replace("\\n", "\n")
    records = []

    for line in normalized.splitlines():
        line = line.strip()
        if not line:
            continue
        record = json.loads(line)
        if not isinstance(record, dict):
            raise ValueError("Detection log contains a non-object record.")
        records.append(record)

    return records


def process_detection_log(path: str | Path) -> dict:
    records = read_detection_log(path)

    tracks = defaultdict(lambda: {
        "track_id": None,
        "class_counts": Counter(),
        "frames": [],
        "confidences": [],
        "first_timestamp": None,
        "last_timestamp": None,
        "sample_bbox_xyxy": None,
    })

    class_totals = Counter()
    candidate_events = []

    for record in records:
        frame_index = int(record.get("frame_index", 0))
        timestamp = float(record.get("timestamp_seconds", 0.0))

        # Current API logs one object per record.
        class_name = str(record.get("class_name", "unknown"))
        track_id = record.get("track_id")
        confidence = float(record.get("confidence", 0.0))
        bbox = record.get("bbox_xyxy")

        class_totals[class_name] += 1

        if track_id is None:
            continue

        key = str(track_id)
        track = tracks[key]
        track["track_id"] = track_id
        track["class_counts"][class_name] += 1
        track["frames"].append(frame_index)
        track["confidences"].append(confidence)

        if track["first_timestamp"] is None:
            track["first_timestamp"] = timestamp
            track["sample_bbox_xyxy"] = bbox

        track["last_timestamp"] = timestamp

    track_summaries = []

    for track in tracks.values():
        frames = track.pop("frames")
        confidences = track.pop("confidences")
        class_counts = track.pop("class_counts")

        track_summaries.append({
            **track,
            "class_counts": dict(class_counts),
            "observed_frames": len(frames),
            "first_frame": min(frames) if frames else None,
            "last_frame": max(frames) if frames else None,
            "mean_confidence": (
                round(sum(confidences) / len(confidences), 4)
                if confidences else None
            ),
            "max_confidence": (
                round(max(confidences), 4) if confidences else None
            ),
        })

    # Create review candidates, not confirmed violations.
    # A track being a rider or motorcycle is only a reason to review it.
    for track in track_summaries:
        observed_classes = set(track["class_counts"])
        relevant = observed_classes.intersection(
            {"rider", "motorcycle", "person"}
        )
        if relevant:
            candidate_events.append({
                "event_type": "traffic_review_candidate",
                "reason": "Tracked rider/person/motorcycle requires review",
                "track_id": track["track_id"],
                "first_timestamp": track["first_timestamp"],
                "last_timestamp": track["last_timestamp"],
                "observed_frames": track["observed_frames"],
                "observed_classes": sorted(relevant),
                "review_status": "pending",
                "is_confirmed_violation": False,
            })

    return {
        "source_log": str(Path(path).resolve()),
        "records_processed": len(records),
        "unique_tracks": len(track_summaries),
        "class_counts": dict(class_totals),
        "tracks": sorted(
            track_summaries,
            key=lambda item: item["observed_frames"],
            reverse=True,
        ),
        "candidate_events": candidate_events,
        "notice": (
            "Review candidates are not confirmed violations. "
            "Human verification and violation-specific evidence are required."
        ),
    }


def save_processed_events(source: str | Path, output_dir: str | Path) -> dict:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    result = process_detection_log(source)

    tracks_path = output_dir / "track_summaries.json"
    events_path = output_dir / "candidate_events.json"
    report_path = output_dir / "processing_report.json"

    tracks_path.write_text(
        json.dumps(result["tracks"], indent=2),
        encoding="utf-8",
    )
    events_path.write_text(
        json.dumps(result["candidate_events"], indent=2),
        encoding="utf-8",
    )
    report_path.write_text(
        json.dumps({
            key: value for key, value in result.items()
            if key not in {"tracks", "candidate_events"}
        }, indent=2),
        encoding="utf-8",
    )

    return {
        "records_processed": result["records_processed"],
        "unique_tracks": result["unique_tracks"],
        "candidate_events": len(result["candidate_events"]),
        "class_counts": result["class_counts"],
        "track_summaries": str(tracks_path.resolve()),
        "candidate_events_file": str(events_path.resolve()),
        "report": str(report_path.resolve()),
    }
