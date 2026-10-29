from pathlib import Path
import shutil

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from backend.services.job_service import (
    JOB_ROOT,
    create_job,
    get_job,
    process_job,
)

router = APIRouter(prefix="/inference", tags=["Inference"])

ALLOWED_SUFFIXES = {".mp4", ".avi", ".mov", ".mkv"}
MAX_UPLOAD_BYTES = 500 * 1024 * 1024


@router.post("/video", status_code=202)
def submit_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    filename = Path(file.filename or "upload.mp4").name
    suffix = Path(filename).suffix.lower()

    if suffix not in ALLOWED_SUFFIXES:
        file.file.close()
        raise HTTPException(
            status_code=400,
            detail="Unsupported video extension. Use MP4, AVI, MOV, or MKV.",
        )

    job = None
    input_path = None

    try:
        job = create_job(filename)
        input_path = Path(job["job_dir"]) / f"input{suffix}"
        total = 0

        with input_path.open("wb") as output:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="Video exceeds the 500 MiB upload limit.",
                    )
                output.write(chunk)

        if total == 0:
            raise HTTPException(status_code=400, detail="Uploaded video is empty.")

        background_tasks.add_task(
            process_job, job["job_id"], str(input_path)
        )

        return {
            "job_id": job["job_id"],
            "status": "queued",
            "status_url": f"/api/v1/inference/jobs/{job['job_id']}",
        }

    except HTTPException:
        if input_path:
            input_path.unlink(missing_ok=True)
        if job:
            shutil.rmtree(job["job_dir"], ignore_errors=True)
        raise
    except Exception as exc:
        if input_path:
            input_path.unlink(missing_ok=True)
        if job:
            shutil.rmtree(job["job_dir"], ignore_errors=True)
        raise HTTPException(
            status_code=500,
            detail=f"Could not accept video: {type(exc).__name__}: {exc}",
        ) from exc
    finally:
        file.file.close()


@router.get("/jobs/{job_id}")
def job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found in this server process.",
        )

    job.pop("job_dir", None)
    result = job.get("result") or {}
    job["evidence"] = {
        "annotated_video": result.get("annotated_video"),
        "detection_log": result.get("detection_log"),
    }
    return job


@router.get("/jobs/{job_id}/video")
def job_video(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    result = job.get("result") or {}
    path = Path(result.get("annotated_video", ""))
    if job["status"] != "completed" or not path.is_file():
        raise HTTPException(status_code=409, detail="Annotated video is not ready.")

    return FileResponse(path, media_type="video/mp4", filename="annotated.mp4")


@router.get("/jobs/{job_id}/events")
def job_events(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    result = job.get("result") or {}
    path = Path(result.get("detection_log", ""))
    if job["status"] != "completed" or not path.is_file():
        raise HTTPException(status_code=409, detail="Detection log is not ready.")

    return FileResponse(
        path,
        media_type="application/x-ndjson",
        filename="detections.jsonl",
    )

@router.get("/jobs/{job_id}/analysis")
def job_analysis(job_id: str):
    import json

    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job["status"] != "completed":
        raise HTTPException(
            status_code=409,
            detail="Analysis is not ready. Check the job status first.",
        )

    result = job.get("result") or {}
    analysis = result.get("analysis") or {}
    report_path = Path(analysis.get("report", ""))
    tracks_path = Path(analysis.get("tracks", ""))
    events_path = Path(analysis.get("candidate_events", ""))

    if not all(p.is_file() for p in (report_path, tracks_path, events_path)):
        raise HTTPException(
            status_code=404,
            detail="Processed analysis files were not found.",
        )

    helmet_log_path = Path(result.get("helmet_event_log", ""))
    helmet_events = []

    if helmet_log_path.is_file():
        with helmet_log_path.open("r", encoding="utf-8") as helmet_log:
            for line in helmet_log:
                line = line.strip()
                if line:
                    helmet_events.append(json.loads(line))

    from backend.services.helmet_aggregation import aggregate_helmet_events

    helmet_aggregation = aggregate_helmet_events(helmet_events)

    return {
        "job_id": job_id,
        "summary": json.loads(report_path.read_text(encoding="utf-8")),
        "tracks": json.loads(tracks_path.read_text(encoding="utf-8")),
        "candidate_events": json.loads(events_path.read_text(encoding="utf-8")),
        "helmet_events": helmet_events,
        "helmet_review_candidate_count": helmet_aggregation["review_case_count"],
        "helmet_aggregation": helmet_aggregation,
        "notice": (
            "Vehicle and helmet events are model-generated review candidates. "
            "They require human review and are not confirmed violations."
        ),
    }



@router.get("/jobs/{job_id}/review-cases")
def job_review_cases(job_id: str):
    import json

    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    result = job.get("result") or {}
    annotated_video = result.get("annotated_video")

    if not annotated_video:
        raise HTTPException(
            status_code=404,
            detail="This job has no annotated video path.",
        )

    evidence_dir = Path(annotated_video).parent
    cases_path = Path(
        result.get("review_cases_json")
        or (evidence_dir / "review_cases" / "review_cases.json")
    )

    if not cases_path.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"Review cases not found for this job. Expected: {cases_path}",
        )

    if not cases_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Review cases not found. Generate evidence for this job first.",
        )

    cases = json.loads(cases_path.read_text(encoding="utf-8"))
    for case in cases:
        frame = case.get("evidence_frame")
        case["evidence_url"] = (
            f"/api/v1/inference/jobs/{job_id}/review-cases/"
            f"frames/{Path(frame).name}"
            if frame else None
        )

    return {
        "job_id": job_id,
        "review_case_count": len(cases),
        "review_cases": cases,
        "notice": "Review candidates are not confirmed violations.",
    }


@router.get("/jobs/{job_id}/review-cases/frames/{filename}")
def job_review_frame(job_id: str, filename: str):
    from fastapi.responses import FileResponse

    if Path(filename).name != filename or not filename.endswith(".jpg"):
        raise HTTPException(status_code=400, detail="Invalid evidence filename.")

    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    result = job.get("result") or {}
    evidence_dir = Path(result.get("annotated_video", "")).parent
    review_json_path = result.get("review_cases_json")
    review_dir = (
        Path(review_json_path).parent
        if review_json_path
        else evidence_dir / "review_cases"
    )
    frame_path = review_dir / filename

    if not frame_path.is_file():
        raise HTTPException(status_code=404, detail="Evidence frame not found.")

    return FileResponse(frame_path, media_type="image/jpeg")


# Prototype plate-review API. Production use requires authenticated,
# authorized reviewers and server-side audit controls.
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field
from backend.core.mongodb import db


class PlateReviewUpdate(BaseModel):
    action: Literal["correct", "verify", "reject"]
    corrected_plate_text: str | None = Field(default=None, max_length=20)


@router.get("/jobs/{job_id}/plates")
def list_job_plates(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    records = list(
        db["plate_readings"].find(
            {"job_id": job_id},
            {"_id": 0, "crop_path": 0, "review_history": 0},
        ).sort("frame_number", 1)
    )

    for record in records:
        record["crop_url"] = (
            f"/api/v1/inference/jobs/{job_id}/plates/"
            f"{record['record_id']}/crop"
        )

    return {"job_id": job_id, "count": len(records), "plates": records}


@router.get("/jobs/{job_id}/plates/{record_id}/crop")
def get_plate_crop(job_id: str, record_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    record = db["plate_readings"].find_one(
        {"job_id": job_id, "record_id": record_id},
        {"_id": 0, "crop_path": 1},
    )
    if not record:
        raise HTTPException(status_code=404, detail="Plate record not found.")

    evidence_root = (Path(__file__).resolve().parents[3] / "storage" / "evidence").resolve()
    crop_path = Path(record.get("crop_path") or "").resolve()

    try:
        crop_path.relative_to(evidence_root)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid evidence path.")

    if not crop_path.is_file() or crop_path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
        raise HTTPException(status_code=404, detail="Plate crop not found.")

    media_type = "image/png" if crop_path.suffix.lower() == ".png" else "image/jpeg"
    return FileResponse(crop_path, media_type=media_type)


@router.patch("/jobs/{job_id}/plates/{record_id}/review")
def review_plate(job_id: str, record_id: str, payload: PlateReviewUpdate):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    collection = db["plate_readings"]
    record = collection.find_one({"job_id": job_id, "record_id": record_id})
    if not record:
        raise HTTPException(status_code=404, detail="Plate record not found.")

    corrected_text = (payload.corrected_plate_text or "").strip().upper()
    if payload.action in {"correct", "verify"} and not corrected_text:
        raise HTTPException(
            status_code=422,
            detail="Provide corrected_plate_text when correcting or verifying a plate.",
        )

    now = datetime.now(timezone.utc).isoformat()
    changes = {
        "updated_at": now,
        "last_review_action": payload.action,
        "last_reviewed_at": now,
    }

    if payload.action == "correct":
        changes["plate_text_corrected"] = corrected_text
        # Correction alone does not verify identity.
        changes["review_status"] = "pending"
        changes["is_verified"] = False
    elif payload.action == "verify":
        changes["plate_text_corrected"] = corrected_text
        changes["review_status"] = "verified"
        changes["is_verified"] = True
    else:
        changes["review_status"] = "rejected"
        changes["is_verified"] = False

    collection.update_one(
        {"job_id": job_id, "record_id": record_id},
        {
            "$set": changes,
            "$push": {
                "review_history": {
                    "action": payload.action,
                    "corrected_plate_text": corrected_text or None,
                    "reviewed_at": now,
                }
            },
        },
    )

    updated = collection.find_one(
        {"job_id": job_id, "record_id": record_id},
        {"_id": 0, "crop_path": 0, "review_history": 0},
    )
    return {"message": "Plate review saved.", "plate": updated}


# Database-backed helmet review queue.
class ReviewCaseDecision(BaseModel):
    action: Literal["confirm", "reject"]


@router.get("/jobs/{job_id}/persisted-review-cases")
def list_persisted_review_cases(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    collection = db["review_cases"]
    cases = list(collection.find(
        {"job_id": job_id},
        {"_id": 0},
    ).sort("timestamp_seconds", 1))

    for case in cases:
        frame = case.get("evidence_frame")
        case["evidence_url"] = (
            f"/api/v1/inference/jobs/{job_id}/review-cases/frames/"
            f"{Path(frame).name}"
            if frame else None
        )

    return {
        "job_id": job_id,
        "count": len(cases),
        "review_cases": cases,
        "notice": "Model-generated candidates require human review.",
    }


@router.patch("/jobs/{job_id}/review-cases/{case_id}/decision")
def decide_review_case(
    job_id: str,
    case_id: str,
    payload: ReviewCaseDecision,
):
    if not get_job(job_id):
        raise HTTPException(status_code=404, detail="Job not found.")

    collection = db["review_cases"]
    current = collection.find_one({"job_id": job_id, "case_id": case_id})
    if not current:
        raise HTTPException(status_code=404, detail="Review case not found.")

    now = datetime.now(timezone.utc).isoformat()
    status = "confirmed" if payload.action == "confirm" else "rejected"

    collection.update_one(
        {"job_id": job_id, "case_id": case_id},
        {
            "$set": {
                "review_status": status,
                "is_confirmed_violation": payload.action == "confirm",
                "reviewed_at": now,
                "updated_at": now,
            },
            "$push": {
                "review_history": {
                    "action": payload.action,
                    "reviewed_at": now,
                    "previous_status": current.get("review_status", "pending"),
                }
            },
        },
    )

    updated = collection.find_one(
        {"job_id": job_id, "case_id": case_id},
        {"_id": 0},
    )
    return {"message": "Review decision saved.", "review_case": updated}
