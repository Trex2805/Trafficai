from collections import defaultdict


VALID_STATUSES = {"with_helmet", "without_helmet"}


def aggregate_helmet_events(events: list[dict]) -> dict:
    """Score helmet evidence conservatively without confirming violations."""
    grouped = defaultdict(list)
    unassociated = []
    excluded_non_riders = []

    for event in events:
        # A person detection alone does not establish that the person
        # is riding a motorcycle.
        if event.get("rider_class") != "rider":
            excluded_non_riders.append(event)
            continue

        track_id = event.get("track_id")
        if track_id is None:
            unassociated.append(event)
        else:
            grouped[str(track_id)].append(event)

    summaries = []

    for track_id, observations in grouped.items():
        observations.sort(
            key=lambda e: e.get("timestamp_seconds", 0)
        )

        classified = [
            e for e in observations
            if e.get("status") in VALID_STATUSES
        ]
        without = [
            e for e in classified
            if e.get("status") == "without_helmet"
        ]
        with_helmet = [
            e for e in classified
            if e.get("status") == "with_helmet"
        ]

        candidate_frames = sorted({
            e["frame_index"] for e in without
            if e.get("frame_index") is not None
        })
        classified_frames = {
            e["frame_index"] for e in classified
            if e.get("frame_index") is not None
        }

        total = len(classified)
        without_ratio = len(without) / total if total else 0.0
        both_classes = bool(without and with_helmet)

        # Priority is a review aid, never a legal/confirmed verdict.
        if total < 3 or len(classified_frames) < 3:
            priority = "insufficient_evidence"
        elif both_classes and 0.30 <= without_ratio <= 0.70:
            priority = "conflicting_evidence"
        elif without_ratio >= 0.70 and len(candidate_frames) >= 3:
            priority = "high_priority_review"
        elif without_ratio >= 0.50:
            priority = "review_candidate"
        elif without:
            priority = "conflicting_evidence" if both_classes else "low_priority_review"
        else:
            priority = "no_without_helmet_evidence"

        best_candidate = max(
            without,
            key=lambda e: e.get("confidence") or 0,
            default=None,
        )

        summaries.append({
            "track_id": track_id,
            "first_timestamp": observations[0].get("timestamp_seconds"),
            "last_timestamp": observations[-1].get("timestamp_seconds"),
            "observation_count": len(observations),
            "classified_observation_count": total,
            "without_helmet_observations": len(without),
            "with_helmet_observations": len(with_helmet),
            "no_helmet_detection_observations": sum(
                e.get("status") == "no_helmet_detection"
                for e in observations
            ),
            "without_helmet_ratio": round(without_ratio, 4),
            "distinct_classified_frames": len(classified_frames),
            "distinct_without_helmet_frames": len(candidate_frames),
            "review_priority": priority,
            "is_confirmed_violation": False,
            "best_candidate": best_candidate,
        })

    summaries.sort(
        key=lambda s: (
            s["review_priority"] == "high_priority_review",
            s["without_helmet_ratio"],
            s["classified_observation_count"],
        ),
        reverse=True,
    )

    unassociated_candidates = [
        e for e in unassociated
        if e.get("status") == "without_helmet"
    ]

    tracked_candidate_tracks = [
        s for s in summaries if s["without_helmet_observations"] > 0
    ]

    return {
        "tracked_rider_summaries": summaries,
        "unassociated_helmet_events": unassociated,
        "excluded_non_rider_events": excluded_non_riders,
        "helmet_review_candidate_track_count": len(tracked_candidate_tracks),
        "high_priority_review_track_count": sum(
            s["review_priority"] == "high_priority_review"
            for s in summaries
        ),
        "conflicting_evidence_track_count": sum(
            s["review_priority"] == "conflicting_evidence"
            for s in summaries
        ),
        "insufficient_evidence_track_count": sum(
            s["review_priority"] == "insufficient_evidence"
            for s in summaries
        ),
        "unassociated_review_candidate_count": len(unassociated_candidates),
        "review_case_count": (
            len(tracked_candidate_tracks) + len(unassociated_candidates)
        ),
        "notice": (
            "All scores are review aids, not confirmed violations. "
            "Unassociated observations may belong to the same rider. "
            "Non-rider person detections are excluded from rider counts."
        ),
    }
