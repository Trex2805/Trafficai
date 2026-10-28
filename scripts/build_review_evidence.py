from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2


def read_jsonl(path: Path) -> list[dict]:
    records = []
    if not path.is_file():
        return records
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
                if isinstance(item, dict):
                    records.append(item)
            except json.JSONDecodeError:
                continue
    return records


def box_center(box):
    x1, y1, x2, y2 = map(float, box)
    return ((x1 + x2) / 2, (y1 + y2) / 2)


def associate_motorcycle(rider_box, motorcycles):
    """Associate only when a motorcycle is geometrically plausible."""
    rx, ry = box_center(rider_box)
    best = None
    best_score = float("inf")

    for item in motorcycles:
        box = item.get("bbox_xyxy")
        if not box or len(box) != 4:
            continue

        x1, y1, x2, y2 = map(float, box)
        mx, my = box_center(box)
        width = max(1.0, x2 - x1)
        height = max(1.0, y2 - y1)

        # A rider should be in or immediately above/near the motorcycle.
        inside = x1 <= rx <= x2 and y1 - 0.35 * height <= ry <= y2
        distance = (((rx - mx) / width) ** 2 +
                    ((ry - my) / height) ** 2) ** 0.5

        if inside:
            score = distance
        elif distance <= 1.25:
            score = distance + 0.5
        else:
            continue

        if score < best_score:
            best_score = score
            best = item

    # Avoid pretending a weak geometric match is certain.
    if best is None:
        return None, "unassigned"
    return best.get("track_id"), "geometry_candidate"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-dir", required=True, type=Path)
    args = parser.parse_args()

    root = args.evidence_dir.resolve()
    video = root / "annotated.mp4"
    detections_path = root / "detections.jsonl"

    helmet_path = root / "helmet_events.jsonl"
    if not helmet_path.is_file():
        candidates = [
            root / "video3_combined.jsonl",
            root / "combined_helmet_events.jsonl",
        ]
        helmet_path = next((p for p in candidates if p.is_file()), helmet_path)

    if not video.is_file():
        raise SystemExit(f"Missing annotated video: {video}")
    if not detections_path.is_file():
        raise SystemExit(f"Missing vehicle detection log: {detections_path}")
    if not helmet_path.is_file():
        raise SystemExit(
            f"Missing helmet event log in {root}. "
            "Expected helmet_events.jsonl."
        )

    vehicle_records = read_jsonl(detections_path)
    helmet_records = read_jsonl(helmet_path)

    # Support either one event per JSONL line or per-frame records
    # containing a nested helmet_events list.
    flattened = []
    for item in helmet_records:
        nested = item.get("helmet_events")
        if isinstance(nested, list):
            for event in nested:
                if isinstance(event, dict):
                    flattened.append({**item, **event})
        elif "status" in item:
            flattened.append(item)

    motorcycles_by_frame = {}
    for item in vehicle_records:
        name = str(item.get("class_name", "")).lower()
        if name == "motorcycle":
            motorcycles_by_frame.setdefault(
                int(item.get("frame_index", -1)), []
            ).append(item)

    output_dir = root / "review_cases"
    output_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise SystemExit(f"Could not open video: {video}")

    cases = []
    saved_frames = set()
    try:
        for index, event in enumerate(flattened):
            if not event.get("review_required", True):
                continue

            status = str(event.get("status", "unknown"))
            if status not in {"without_helmet", "no_helmet_detection"}:
                continue

            frame_index = int(event.get("frame_index", -1))
            rider_box = event.get("rider_bbox_xyxy")
            if frame_index < 0 or not rider_box or len(rider_box) != 4:
                continue

            motorcycle_id, association_status = associate_motorcycle(
                rider_box, motorcycles_by_frame.get(frame_index, [])
            )

            case_id = f"frame_{frame_index:06d}_event_{index:04d}"
            evidence_path = output_dir / f"{case_id}.jpg"

            if frame_index not in saved_frames:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
                ok, frame = cap.read()
                if ok:
                    x1, y1, x2, y2 = map(int, rider_box)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 165, 255), 3)

                    helmet_box = event.get("helmet_bbox_xyxy")
                    if helmet_box and len(helmet_box) == 4:
                        hx1, hy1, hx2, hy2 = map(int, helmet_box)
                        cv2.rectangle(
                            frame, (hx1, hy1), (hx2, hy2), (0, 0, 255), 2
                        )

                    label = f"{status} | confidence={event.get('confidence')}"
                    cv2.putText(
                        frame, label, (max(5, x1), max(25, y1 - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 255), 2
                    )
                    cv2.imwrite(str(evidence_path), frame)
                    saved_frames.add(frame_index)
                else:
                    evidence_path = None

            cases.append({
                "case_id": case_id,
                "frame_index": frame_index,
                "timestamp_seconds": event.get("timestamp_seconds"),
                "rider_track_id": event.get("track_id"),
                "motorcycle_track_id": motorcycle_id,
                "association_status": association_status,
                "helmet_status": status,
                "helmet_confidence": event.get("confidence"),
                "candidate_violation": status == "without_helmet",
                "review_required": True,
                "evidence_frame": (
                    str(evidence_path.relative_to(root))
                    if evidence_path and evidence_path.is_file() else None
                ),
                "notice": "Model-generated review candidate, not a confirmed violation."
            })
    finally:
        cap.release()

    output_json = output_dir / "review_cases.json"
    output_json.write_text(
        json.dumps(cases, indent=2), encoding="utf-8"
    )

    print("Evidence generation complete")
    print(f"Helmet observations reviewed: {len(flattened)}")
    print(f"Review cases: {len(cases)}")
    print(f"Frames saved: {len(saved_frames)}")
    print(f"Review JSON: {output_json}")


if __name__ == "__main__":
    main()
