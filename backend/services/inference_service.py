from __future__ import annotations

import json
import uuid
from pathlib import Path

import cv2
from ultralytics import YOLO

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DEFAULT_WEIGHTS = (
    PROJECT_ROOT
    / "runs/detect/runs/production/idd_speed_benchmark_batch24/weights/best.pt"
)
HELMET_WEIGHTS = (
    PROJECT_ROOT
    / "runs/detect/runs/helmet/helmet_v6_binary_yolo11n/weights/best.pt"
)
EVIDENCE_ROOT = PROJECT_ROOT / "storage" / "evidence"

HELMET_CONF = 0.25
HELMET_IMGSZ = 640
HELMET_CROP_PADDING = 0.35
RIDER_CLASS_NAMES = {"rider", "person"}


def run_video_inference(
    source_path: Path,
    confidence: float = 0.25,
    weights_path: Path = DEFAULT_WEIGHTS,
) -> dict:
    """Run vehicle tracking and helmet review-candidate inference."""
    source_path = Path(source_path).resolve()
    weights_path = Path(weights_path).resolve()

    if not source_path.is_file():
        raise FileNotFoundError("Input video does not exist.")
    if not weights_path.is_file():
        raise FileNotFoundError(f"Vehicle checkpoint not found: {weights_path}")
    if not HELMET_WEIGHTS.is_file():
        raise FileNotFoundError(f"Helmet checkpoint not found: {HELMET_WEIGHTS}")
    if not 0.0 < confidence < 1.0:
        raise ValueError("Confidence must be between 0 and 1.")

    job_id = uuid.uuid4().hex
    output_dir = EVIDENCE_ROOT / job_id
    output_dir.mkdir(parents=True, exist_ok=False)

    video_out = output_dir / "annotated.mp4"
    events_out = output_dir / "detections.jsonl"
    helmet_events_out = output_dir / "helmet_events.jsonl"

    vehicle_model = YOLO(str(weights_path))
    helmet_model = YOLO(str(HELMET_WEIGHTS))

    cap = cv2.VideoCapture(str(source_path))
    if not cap.isOpened():
        raise ValueError("Could not open the uploaded video.")

    fps = cap.get(cv2.CAP_PROP_FPS)
    fps = fps if fps > 0 else 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if width <= 0 or height <= 0:
        cap.release()
        raise ValueError("Video has invalid dimensions.")

    writer = cv2.VideoWriter(
        str(video_out),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )
    if not writer.isOpened():
        cap.release()
        raise RuntimeError("Could not create the annotated output video.")

    rider_classes = {
        int(class_id)
        for class_id, name in vehicle_model.names.items()
        if str(name).strip().lower() in RIDER_CLASS_NAMES
    }

    frame_index = 0
    detection_count = 0
    helmet_crops_tested = 0
    helmet_detections = 0
    helmet_review_candidates = 0

    try:
        with (
            events_out.open("w", encoding="utf-8") as vehicle_log,
            helmet_events_out.open("w", encoding="utf-8") as helmet_log,
        ):
            while True:
                ok, frame = cap.read()
                if not ok:
                    break

                result = vehicle_model.track(
                    frame,
                    persist=True,
                    tracker="bytetrack.yaml",
                    imgsz=800,
                    conf=confidence,
                    device=0,
                    verbose=False,
                )[0]

                annotated = result.plot()

                if result.boxes is not None:
                    boxes = result.boxes
                    xyxy = boxes.xyxy.cpu().tolist()
                    classes = boxes.cls.int().cpu().tolist()
                    scores = boxes.conf.cpu().tolist()
                    track_ids = (
                        boxes.id.int().cpu().tolist()
                        if boxes.id is not None
                        else [None] * len(classes)
                    )

                    for bbox, class_id, score, track_id in zip(
                        xyxy, classes, scores, track_ids
                    ):
                        vehicle_log.write(json.dumps({
                            "frame_index": frame_index,
                            "timestamp_seconds": round(frame_index / fps, 3),
                            "class_id": class_id,
                            "class_name": vehicle_model.names.get(
                                class_id, str(class_id)
                            ),
                            "confidence": score,
                            "track_id": track_id,
                            "bbox_xyxy": bbox,
                        }) + "\n")
                        detection_count += 1

                    for bbox, class_id, track_id in zip(
                        xyxy, classes, track_ids
                    ):
                        if class_id not in rider_classes:
                            continue

                        x1, y1, x2, y2 = bbox
                        box_w = x2 - x1
                        box_h = y2 - y1
                        pad_x = box_w * HELMET_CROP_PADDING
                        pad_y = box_h * HELMET_CROP_PADDING

                        left = max(0, int(x1 - pad_x))
                        top = max(0, int(y1 - pad_y))
                        right = min(width, int(x2 + pad_x))
                        bottom = min(height, int(y2 + pad_y))

                        if right <= left or bottom <= top:
                            continue

                        crop = frame[top:bottom, left:right]
                        if crop.size == 0:
                            continue

                        helmet_crops_tested += 1
                        helmet_result = helmet_model.predict(
                            crop,
                            imgsz=HELMET_IMGSZ,
                            conf=HELMET_CONF,
                            device=0,
                            verbose=False,
                        )[0]

                        base_event = {
                            "frame_index": frame_index,
                            "timestamp_seconds": round(frame_index / fps, 3),
                            "track_id": track_id,
                            "rider_class": vehicle_model.names.get(
                                class_id, str(class_id)
                            ),
                            "rider_bbox_xyxy": bbox,
                            "candidate_violation": False,
                            "review_required": True,
                        }

                        helmet_boxes = helmet_result.boxes
                        if helmet_boxes is None or len(helmet_boxes) == 0:
                            helmet_log.write(json.dumps({
                                **base_event,
                                "status": "no_helmet_detection",
                                "confidence": None,
                                "helmet_bbox_xyxy": None,
                            }) + "\n")
                            continue

                        crop_boxes = helmet_boxes.xyxy.cpu().tolist()
                        crop_classes = helmet_boxes.cls.int().cpu().tolist()
                        crop_scores = helmet_boxes.conf.cpu().tolist()
                        best_idx = max(
                            range(len(crop_scores)),
                            key=lambda i: crop_scores[i],
                        )

                        helmet_bbox = crop_boxes[best_idx]
                        helmet_class = crop_classes[best_idx]
                        helmet_score = float(crop_scores[best_idx])
                        helmet_name = str(
                            helmet_model.names.get(helmet_class, helmet_class)
                        ).strip().lower()

                        global_bbox = [
                            round(helmet_bbox[0] + left, 2),
                            round(helmet_bbox[1] + top, 2),
                            round(helmet_bbox[2] + left, 2),
                            round(helmet_bbox[3] + top, 2),
                        ]

                        is_candidate = helmet_name == "without_helmet"
                        if is_candidate:
                            helmet_review_candidates += 1

                        helmet_detections += 1

                        helmet_log.write(json.dumps({
                            **base_event,
                            "status": helmet_name,
                            "confidence": round(helmet_score, 5),
                            "helmet_bbox_xyxy": global_bbox,
                            "candidate_violation": is_candidate,
                        }) + "\n")

                        color = (0, 0, 255) if is_candidate else (0, 200, 0)
                        hx1, hy1, hx2, hy2 = map(int, global_bbox)
                        cv2.rectangle(
                            annotated, (hx1, hy1), (hx2, hy2), color, 2
                        )
                        cv2.putText(
                            annotated,
                            f"{helmet_name} {helmet_score:.2f}",
                            (hx1, max(18, hy1 - 6)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.5,
                            color,
                            2,
                        )

                writer.write(annotated)
                frame_index += 1

                if frame_index % 50 == 0:
                    print(
                        f"Frames: {frame_index} | "
                        f"vehicle detections: {detection_count} | "
                        f"helmet crops: {helmet_crops_tested} | "
                        f"helmet candidates: {helmet_review_candidates}"
                    )
    finally:
        cap.release()
        writer.release()

    return {
        "job_id": job_id,
        "frames_processed": frame_index,
        "detections_recorded": detection_count,
        "helmet_crops_tested": helmet_crops_tested,
        "helmet_detections": helmet_detections,
        "helmet_review_candidates": helmet_review_candidates,
        "annotated_video": str(video_out),
        "detection_log": str(events_out),
        "helmet_event_log": str(helmet_events_out),
    }
