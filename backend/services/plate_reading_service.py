from __future__ import annotations

import csv
import hashlib
from datetime import datetime, timezone
from pathlib import Path


def _utc_now():
    return datetime.now(timezone.utc)


def _make_record(row: dict, source_video: str) -> dict:
    frame = int(row.get("frame") or 0)
    box = int(row.get("plate_box") or 0)
    crop_path = str(row.get("crop_path") or "")
    raw_text = str(row.get("plate_text_raw") or "").strip().upper()

    # Stable key makes repeated imports idempotent.
    identity = f"{source_video}|{frame}|{box}|{crop_path}"
    record_id = hashlib.sha256(identity.encode("utf-8")).hexdigest()

    det_conf = float(row.get("detector_confidence") or 0)
    ocr_conf = float(row.get("ocr_confidence") or 0)

    return {
        "record_id": record_id,
        "source_video": source_video,
        "frame_number": frame,
        "plate_box_index": box,
        "plate_text_raw": raw_text or None,
        "detector_confidence": det_conf,
        "ocr_confidence": ocr_conf,
        "crop_path": crop_path or None,
        "recognition_status": "ocr_candidate" if raw_text else "no_text",
        "review_status": "pending",
        "is_verified": False,
        "vehicle_track_id": None,
        "updated_at": _utc_now(),
    }


def load_candidate_records(csv_path: str | Path, source_video: str) -> list[dict]:
    path = Path(csv_path)
    if not path.is_file():
        raise FileNotFoundError(f"OCR CSV not found: {path}")

    with path.open("r", newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    records = [_make_record(row, source_video) for row in rows]
    return records


def persist_candidate_records(
    records: list[dict],
    database_name: str = "TrafficAI",
) -> dict:
    # Import only when persistence is requested.
    from backend.core.mongodb import client, db

    if db.name != database_name:
        raise RuntimeError(
            f"Connected database is {db.name!r}, expected {database_name!r}. "
            "Check MONGODB_DATABASE in your environment."
        )

    collection = db["plate_readings"]
    collection.create_index("record_id", unique=True, name="uq_plate_reading_record_id")
    collection.create_index(
        [("review_status", 1), ("updated_at", -1)],
        name="ix_plate_review_status_updated",
    )

    inserted_or_updated = 0
    for record in records:
        collection.update_one(
            {"record_id": record["record_id"]},
            {
                "$set": record,
                "$setOnInsert": {"created_at": _utc_now()},
            },
            upsert=True,
        )
        inserted_or_updated += 1

    client.admin.command("ping")
    return {
        "database": db.name,
        "collection": collection.name,
        "records_upserted": inserted_or_updated,
        "total_records": collection.count_documents({}),
    }
