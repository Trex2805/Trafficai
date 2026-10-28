from __future__ import annotations

VEHICLE_CLASSES = {
    "car",
    "motorcycle",
    "bus",
    "truck",
    "autorickshaw",
}


def associate_plate_to_vehicle(
    plate_bbox: list[float],
    vehicle_detections: list[dict],
) -> dict:
    """
    Return a geometric plate-to-vehicle candidate.

    This is not verified vehicle identity. Ambiguous or weak matches
    remain unassigned for later review.
    """
    unassigned = {
        "vehicle_track_id": None,
        "vehicle_class": None,
        "association_status": "unassigned",
    }

    if not plate_bbox or len(plate_bbox) != 4:
        return unassigned

    try:
        px1, py1, px2, py2 = map(float, plate_bbox)
    except (TypeError, ValueError):
        return unassigned

    if px2 <= px1 or py2 <= py1:
        return unassigned

    plate_area = (px2 - px1) * (py2 - py1)
    plate_cx = (px1 + px2) / 2
    plate_cy = (py1 + py2) / 2
    candidates = []

    for vehicle in vehicle_detections:
        if not isinstance(vehicle, dict):
            continue

        track_id = vehicle.get("track_id")
        class_name = str(vehicle.get("class_name", "")).lower()
        bbox = vehicle.get("bbox_xyxy")

        if track_id is None or class_name not in VEHICLE_CLASSES:
            continue

        if not isinstance(bbox, (list, tuple)) or len(bbox) != 4:
            continue

        try:
            x1, y1, x2, y2 = map(float, bbox)
        except (TypeError, ValueError):
            continue

        if x2 <= x1 or y2 <= y1:
            continue

        intersection_w = max(0.0, min(px2, x2) - max(px1, x1))
        intersection_h = max(0.0, min(py2, y2) - max(py1, y1))
        plate_coverage = (
            intersection_w * intersection_h / plate_area
        )

        center_inside = (
            x1 <= plate_cx <= x2 and y1 <= plate_cy <= y2
        )

        # Avoid associating a plate based on a tiny accidental overlap.
        if not center_inside and plate_coverage < 0.60:
            continue

        vehicle_area = (x2 - x1) * (y2 - y1)

        # Prefer stronger plate containment, then the smaller enclosing
        # vehicle box when two boxes provide similar geometric evidence.
        candidates.append((
            plate_coverage,
            int(center_inside),
            -vehicle_area,
            vehicle,
        ))

    if not candidates:
        return unassigned

    _, _, _, best = max(
        candidates,
        key=lambda item: (item[0], item[1], item[2]),
    )

    return {
        "vehicle_track_id": best["track_id"],
        "vehicle_class": str(best["class_name"]).lower(),
        "association_status": "geometry_candidate",
    }
