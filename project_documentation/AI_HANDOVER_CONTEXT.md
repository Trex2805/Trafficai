# AI handover context

## Mission

TrafficAI analyzes traffic video and produces model-generated review candidates. Treat the current system as a human-in-the-loop review platform, not an automatic enforcement engine.

## Start here

1. Read `backend/main.py`, `backend/core/config.py`, and `backend/core/mongodb.py`.
2. Trace `backend/api/routes/inference.py` into `backend/services/job_service.py`.
3. Trace `job_service.process_job` into `inference_service.py`, `plate_pipeline.py`, `build_review_evidence.py`, and `event_processing.py`.
4. Read `auth.py` before changing any protected route.
5. Read `frontend/src/services/authService.ts`, `VideoInference.tsx`, `HelmetReviewPanel.tsx`, and `PlateReviewPanel.tsx` before changing UI/API contracts.

## Current end-to-end contract

Upload is `POST /api/v1/inference/video` with multipart `file`. It returns a UUID4 `job_id`. Poll `/jobs/{job_id}`. On completion, consume `/analysis`, `/review-cases`, `/video`, `/events`, and the plate/review endpoints. Vehicle and helmet output is model evidence; only the authority decision endpoint sets a review case to confirmed.

## Data stores

MongoDB database defaults to `TrafficAI`. Active collections are users, invitations, password resets, jobs, plate readings, and review cases, plus declared handles for vehicles, violations, detections, and image embeddings. A separate MongoDB utility defines evidence, cameras, tracks, model versions, and verification tasks. Do not add a new collection until its ownership, indexes, timestamps, retention, and API contract are defined.

## Models

The active pipeline expects vehicle and helmet checkpoints under `runs/` and a plate checkpoint under `models/plate_recognition/`. All are local artifacts excluded from Git. Vehicle and helmet inference currently target GPU device 0; plate inference chooses CUDA when available. Model output must remain a candidate until reviewed.

## Known blockers

- Developer invitation tests and the active registration request model are inconsistent.
- Job/output endpoints lack ownership checks.
- Most dashboard/fine/violation services are mock-only.
- Standalone evidence capture is not wired into FastAPI.
- No active search endpoint exists.
- There is no verified legal traffic-rule engine.

## Do-not-break rules

- Preserve the candidate-versus-confirmed distinction.
- Do not expose or log env values, JWT secrets, MongoDB credentials, invitation tokens, or reset tokens.
- Do not assume a tracker ID is a permanent vehicle identity.
- Do not treat geometric plate association or OCR as verified registration identity.
- Keep evidence paths confined to the configured evidence root.
- Preserve backups and generated model/storage artifacts.
- Keep route prefixes and bearer-token behavior compatible with the frontend until clients are migrated.

## Safe next implementation

Add focused tests and minimal fixes for: invitation request validation, per-job authorization, CPU-configurable inference, and protected file path handling. Then define typed response models and replace the frontend mock review/violation data with real, authenticated endpoints. Avoid implementing fines or legal rules until the authority and audit requirements are explicit.

## Inspection summary

The read-only inspection scope contained 184 relevant files, including 61 Python files, 29 TypeScript/TSX files, and 31 backup/alternate files. Ten authentication endpoints and fourteen inference/health/root endpoints were identified (24 route decorators total, counting the root). The active code references 15 MongoDB collections across the primary backend, standalone utilities, and initialization script. The main model families are vehicle YOLO, helmet YOLO, plate YOLO, EasyOCR, and ByteTrack.
