from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import cv2
import easyocr
import torch
from ultralytics import YOLO

from backend.services.plate_association import associate_plate_to_vehicle

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PLATE_WEIGHTS = (
    PROJECT_ROOT / "models" / "plate_recognition" / "license_plate_v1n.pt"
)


def run_plate_pipeline(
    source_path: str | Path,
    detection_log: str | Path,
    evidence_dir: str | Path,
    job_id: str,
    frame_stride: int = 5,
) -> dict:
    """Detect plate candidates, run OCR, associate tracks, and persist review records."""
    source_path = Path(source_path).resolve()
    detection_log = Path(detection_log).resolve()
    evidence_dir = Path(evidence_dir).resolve()

    if not source_path.is_file():
        raise FileNotFoundError(f"Source video not found: {source_path}")
    if not detection_log.is_file():
        raise FileNotFoundError(f"Vehicle detection log not found: {detection_log}")
    if not PLATE_WEIGHTS.is_file():
        raise FileNotFoundError(f"Plate checkpoint not found: {PLATE_WEIGHTS}")
    if frame_stride < 1:
        raise ValueError("frame_stride must be at least 1")

    # Index vehicle detections by their original frame number.
    vehicles_by_frame: dict[int, list[dict]] = {}
    with detection_log.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            item = json.loads(line)
            frame = int(item.get("frame_index", -1))
            if frame >= 0:
                vehicles_by_frame.setdefault(frame, []).append(item)

    crops_dir = evidence_dir / "plate_crops"
    crops_dir.mkdir(parents=True, exist_ok=True)
    events_path = evidence_dir / "plate_events.jsonl"

    plate_model = YOLO(str(PLATE_WEIGHTS))
    reader = easyocr.Reader(["en"], gpu=torch.cuda.is_available())

    cap = cv2.VideoCapture(str(source_path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open source video: {source_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    frame_index = 0
    frames_sampled = 0
    candidates = []

    try:
        with events_path.open("w", encoding="utf-8") as output:
            while True:
                ok, frame = cap.read()
                if not ok:
                    break

                if frame_index % frame_stride == 0:
                    frames_sampled += 1
                    prediction = plate_model.predict(
                        frame,
                        imgsz=1280,
                        conf=0.25,
                        device=0 if torch.cuda.is_available() else "cpu",
                        verbose=False,
                    )[0]

                    boxes = prediction.boxes
                    if boxes is not None:
                        for box_index, box in enumerate(boxes):
                            x1, y1, x2, y2 = map(
                                int, box.xyxy[0].cpu().tolist()
                            )
                            height, width = frame.shape[:2]
                            x1, x2 = max(0, x1), min(width, x2)
                            y1, y2 = max(0, y1), min(height, y2)

                            if x2 <= x1 or y2 <= y1:
                                continue

                            crop = frame[y1:y2, x1:x2]
                            crop_name = (
                                f"{job_id}_f{frame_index}_p{box_index}.jpg"
                            )
                            crop_path = crops_dir / crop_name
                            if not cv2.imwrite(str(crop_path), crop):
                                continue

                            # Enhance only the OCR input; preserve the original crop as evidence.
                            gray_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                            upscaled_crop = cv2.resize(
                                gray_crop,
                                None,
                                fx=4,
                                fy=4,
                                interpolation=cv2.INTER_CUBIC,
                            )
                            enhanced_crop = cv2.createCLAHE(
                                clipLimit=2.0,
                                tileGridSize=(4, 4),
                            ).apply(upscaled_crop)

                            ocr_results = reader.readtext(
                                enhanced_crop,
                                detail=1,
                                paragraph=False,
                                allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
                            )
                            best_text, best_ocr_conf = "", 0.0
                            for _, text, confidence in ocr_results:
                                text = str(text).strip().upper()
                                confidence = float(confidence)
                                if text and confidence > best_ocr_conf:
                                    best_text = text
                                    best_ocr_conf = confidence

                            vehicle_candidates = vehicles_by_frame.get(
                                frame_index, []
                            )
                            association = associate_plate_to_vehicle(
                                [x1, y1, x2, y2],
                                vehicle_candidates,
                            )

                            detector_conf = float(box.conf[0].item())
                            identity = (
                                f"{job_id}|{frame_index}|{box_index}|"
                                f"{x1},{y1},{x2},{y2}"
                            )
                            record = {
                                "record_id": hashlib.sha256(
                                    identity.encode("utf-8")
                                ).hexdigest(),
                                "job_id": job_id,
                                "source_video": str(source_path),
                                "frame_number": frame_index,
                                "timestamp_seconds": (
                                    round(frame_index / fps, 3)
                                    if fps > 0 else None
                                ),
                                "plate_box_index": box_index,
                                "plate_bbox_xyxy": [x1, y1, x2, y2],
                                "plate_text_raw": best_text or None,
                                "detector_confidence": detector_conf,
                                "ocr_confidence": best_ocr_conf,
                                "crop_path": str(crop_path),
                                "recognition_status": (
                                    "ocr_candidate" if best_text else "no_text"
                                ),
                                "vehicle_track_id": association.get(
                                    "vehicle_track_id"
                                ),
                                "vehicle_class": association.get("vehicle_class"),
                                "association_status": association[
                                    "association_status"
                                ],
                                "review_status": "pending",
                                "is_verified": False,
                                "updated_at": datetime.now(timezone.utc),
                            }
                            candidates.append(record)
                            output.write(
                                json.dumps(record, default=str) + "\n"
                            )
                frame_index += 1
    finally:
        cap.release()

    # Persist only after the video has been processed successfully.
    from backend.core.mongodb import client, db

    db["plate_readings"].create_index(
        "record_id", unique=True, name="uq_plate_reading_record_id"
    )
    db["plate_readings"].create_index(
        [("job_id", 1), ("review_status", 1)],
        name="ix_plate_job_review",
    )

    collection = db["plate_readings"]
    for record in candidates:
        collection.update_one(
            {"record_id": record["record_id"]},
            {
                "$set": record,
                "$setOnInsert": {
                    "created_at": datetime.now(timezone.utc)
                },
            },
            upsert=True,
        )

    client.admin.command("ping")

    return {
        "status": "completed",
        "frames_processed": frame_index,
        "frames_sampled": frames_sampled,
        "frame_stride": frame_stride,
        "plate_candidates": len(candidates),
        "ocr_candidates": sum(
            r["recognition_status"] == "ocr_candidate" for r in candidates
        ),
        "unreadable_candidates": sum(
            r["recognition_status"] == "no_text" for r in candidates
        ),
        "associated_candidates": sum(
            r["association_status"] == "geometry_candidate"
            for r in candidates
        ),
        "review_pending": len(candidates),
        "events_file": str(events_path),
        "crop_directory": str(crops_dir),
        "database": db.name,
        "collection": collection.name,
    }
