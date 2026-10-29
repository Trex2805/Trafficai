from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from uuid import uuid4

import numpy as np
from bson import BSON
from bson.errors import InvalidDocument
from fastapi.encoders import jsonable_encoder
from pymongo.errors import PyMongoError

from backend.core.mongodb import ensure_job_indexes, jobs
from backend.services.inference_service import run_video_inference
from backend.services.event_processing import save_processed_events

PROJECT_ROOT = Path(__file__).resolve().parents[2]
JOB_ROOT = PROJECT_ROOT / "storage" / "evidence" / "jobs"


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def _mongo_safe(value):
    """Convert common Python, NumPy and path values to BSON-safe values."""
    if isinstance(value, Path):
        return str(value)

    if isinstance(value, np.ndarray):
        return _mongo_safe(value.tolist())

    if isinstance(value, np.generic):
        return _mongo_safe(value.item())

    if isinstance(value, dict):
        return {str(key): _mongo_safe(item) for key, item in value.items()}

    if isinstance(value, (list, tuple, set)):
        return [_mongo_safe(item) for item in value]

    # Preserve the existing JSON-friendly API representation.
    return jsonable_encoder(value)


def create_job(filename: str) -> dict:
    job_id = uuid4().hex
    job_dir = JOB_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=False)

    now = utc_now()
    record = {
        "job_id": job_id,
        "filename": filename,
        "status": "queued",
        "progress": 0,
        "created_at": now,
        "updated_at": now,
        "error": None,
        "result": None,
        "job_dir": str(job_dir),
    }

    try:
        ensure_job_indexes()
        jobs.insert_one(_mongo_safe(record))
    except Exception:
        # Do not leave an orphan directory if job registration fails.
        try:
            job_dir.rmdir()
        except OSError:
            pass
        raise

    return record.copy()


def get_job(job_id: str) -> dict | None:
    record = jobs.find_one({"job_id": job_id}, {"_id": 0})
    return dict(record) if record else None


def update_job(job_id: str, **fields):
    fields["updated_at"] = utc_now()
    safe_fields = _mongo_safe(fields)

    # Avoid silently accepting values BSON cannot encode.
    try:
        BSON.encode(safe_fields)
    except InvalidDocument as exc:
        raise ValueError(
            f"Job update contains a value MongoDB cannot store: {exc}"
        ) from exc

    jobs.update_one(
        {"job_id": job_id},
        {"$set": safe_fields},
    )


def process_job(job_id: str, input_path: str):
    path = Path(input_path)

    try:
        update_job(job_id, status="processing", progress=5)
        result = run_video_inference(path)

        # Optional second pass for number-plate review candidates.
        evidence_dir = Path(result["annotated_video"]).parent
        try:
            from backend.services.plate_pipeline import run_plate_pipeline

            result["plate_pipeline"] = run_plate_pipeline(
                source_path=path,
                detection_log=result["detection_log"],
                evidence_dir=evidence_dir,
                job_id=job_id,
                frame_stride=5,
            )
        except Exception as plate_exc:
            result["plate_pipeline"] = {
                "status": "failed",
                "error": f"{type(plate_exc).__name__}: {plate_exc}",
            }
            print(
                f"Plate pipeline failed for job {job_id}: "
                f"{type(plate_exc).__name__}: {plate_exc}"
            )


        # Build human-review evidence in the inference output directory.
        import subprocess
        import sys

        evidence_dir = Path(result["annotated_video"]).parent
        builder = PROJECT_ROOT / "scripts" / "build_review_evidence.py"

        review_build = subprocess.run(
            [
                sys.executable,
                str(builder),
                "--evidence-dir",
                str(evidence_dir),
            ],
            capture_output=True,
            text=True,
            check=False,
        )

        if review_build.returncode == 0:
            result["review_cases_json"] = str(
                evidence_dir / "review_cases" / "review_cases.json"
            )
            result["review_evidence_build"] = "completed"
        else:
            result["review_evidence_build"] = "failed"
            result["review_evidence_error"] = (
                review_build.stderr[-2000:]
                or review_build.stdout[-2000:]
            )

        # Process detections before marking the job completed.
        detection_log = Path(result["detection_log"])
        analysis_dir = detection_log.parent / "event_processing"
        analysis = save_processed_events(detection_log, analysis_dir)

        result["analysis"] = {
            "directory": str(analysis_dir),
            "report": str(analysis_dir / "processing_report.json"),
            "tracks": str(analysis_dir / "track_summaries.json"),
            "candidate_events": str(analysis_dir / "candidate_events.json"),
            "summary": analysis,
        }

        update_job(
            job_id,
            status="completed",
            progress=100,
            result=result,
        )

    except Exception as exc:
        try:
            update_job(
                job_id,
                status="failed",
                error=f"{type(exc).__name__}: {exc}",
            )
        except Exception as persistence_error:
            # Keep the original processing error visible in server logs.
            print(
                f"Failed to persist job {job_id} failure status: "
                f"{type(persistence_error).__name__}: {persistence_error}"
            )
            print(
                f"Original job error: {type(exc).__name__}: {exc}"
            )
    finally:
        path.unlink(missing_ok=True)
