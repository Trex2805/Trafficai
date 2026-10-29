"""
Evidence capture service.

Call capture_violation_evidence(...) from the video pipeline ONCE when a
violation event is confirmed. The image is saved to EVIDENCE_DIR, while
MongoDB stores searchable metadata and an API URL to retrieve the image.
"""
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import cv2
from mongo_connection import db

PROJECT_DIR = Path(__file__).resolve().parent
_configured_dir = Path(os.getenv("EVIDENCE_DIR", "./data/evidence"))
EVIDENCE_DIR = _configured_dir if _configured_dir.is_absolute() else PROJECT_DIR / _configured_dir
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

def normalize_plate(plate_number: str | None) -> str | None:
    """Normalize a plate for exact searches: uppercase and remove spaces/hyphens."""
    if not plate_number:
        return None
    normalized = re.sub(r"[^A-Z0-9]", "", plate_number.upper())
    return normalized or None

def capture_violation_evidence(
    frame,
    *,
    camera_id: str,
    violation_type: str,
    plate_number: str | None = None,
    confidence: float | None = None,
    track_id: str | int | None = None,
    location: dict[str, Any] | None = None,
    timestamp: datetime | None = None,
    extra_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Save the supplied OpenCV BGR frame and create violation/evidence records.

    Args:
        frame: OpenCV/numpy image frame at the moment the violation is confirmed.
        camera_id: ID of the camera/source.
        violation_type: e.g. red_light_violation or helmet_violation.
        plate_number: OCR-recognized number plate, if available. Can be None.
        confidence: Optional model/rule confidence.
        track_id: Optional ByteTrack ID.
        location: Optional location dictionary.
        timestamp: Optional event timestamp; defaults to UTC now.
        extra_metadata: Optional additional non-sensitive metadata.

    Returns:
        IDs and API URL for the saved evidence.
    """
    if frame is None or getattr(frame, "size", 0) == 0:
        raise ValueError("frame is empty; cannot save evidence.")
    if not camera_id.strip():
        raise ValueError("camera_id is required.")
    if not violation_type.strip():
        raise ValueError("violation_type is required.")

    event_time = timestamp or datetime.now(timezone.utc)
    if event_time.tzinfo is None:
        event_time = event_time.replace(tzinfo=timezone.utc)

    suffix = uuid.uuid4().hex[:12].upper()
    stamp = event_time.strftime("%Y%m%dT%H%M%SZ")
    violation_id = f"VIO-{stamp}-{suffix}"
    evidence_id = f"EVD-{stamp}-{suffix}"
    normalized_plate = normalize_plate(plate_number)

    image_filename = f"{evidence_id}.jpg"
    image_path = EVIDENCE_DIR / image_filename

    saved = cv2.imwrite(str(image_path), frame)
    if not saved:
        raise RuntimeError(f"OpenCV could not write evidence image: {image_path}")

    relative_path = image_path.relative_to(PROJECT_DIR).as_posix()
    evidence_url = f"/api/evidence/{evidence_id}/image"

    violation_doc = {
        "violation_id": violation_id,
        "camera_id": camera_id,
        "track_ref": str(track_id) if track_id is not None else None,
        "violation_type": violation_type,
        "timestamp": event_time,
        "location": location or {},
        "confidence": confidence,
        "plate_number": plate_number.strip().upper() if plate_number else None,
        "plate_normalized": normalized_plate,
        "evidence_ids": [evidence_id],
        "review_status": "pending",
        "model_version": None,
        "metadata": extra_metadata or {},
    }

    evidence_doc = {
        "evidence_id": evidence_id,
        "violation_id": violation_id,
        "camera_id": camera_id,
        "captured_at": event_time,
        "frame_number": None,
        "plate_number": plate_number.strip().upper() if plate_number else None,
        "plate_normalized": normalized_plate,
        "image_filename": image_filename,
        "image_path": relative_path,
        "image_url": evidence_url,
        "content_type": "image/jpeg",
    }

    try:
        db.violations.insert_one(violation_doc)
        db.evidence.insert_one(evidence_doc)
    except Exception:
        # Avoid leaving an unreferenced image if the DB write fails.
        try:
            image_path.unlink(missing_ok=True)
        except OSError:
            pass
        # If first insert succeeded and second failed, remove the partial violation.
        db.violations.delete_one({"violation_id": violation_id})
        raise

    return {
        "violation_id": violation_id,
        "evidence_id": evidence_id,
        "plate_number": evidence_doc["plate_number"],
        "image_path": relative_path,
        "image_url": evidence_url,
        "captured_at": event_time.isoformat(),
    }
