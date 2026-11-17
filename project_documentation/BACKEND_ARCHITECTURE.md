# Backend architecture

## Runtime

The backend is FastAPI 0.143.3 with Uvicorn. `backend/main.py` creates the app, reads `settings`, and registers authentication, health, and inference routers under `/api/v1`. The root endpoint is `/`.

## Request lifecycle

1. The browser sends a request through the Vite `/api` proxy to port 8000.
2. Authentication routes validate request models and credentials where required.
3. Inference routes authorize `developer` or `authority` roles, create a MongoDB job, and stream the upload to a job directory.
4. `BackgroundTasks` invokes `job_service.process_job`.
5. The job runs vehicle/helmet inference, plate processing, review-evidence generation, JSONL aggregation, and MongoDB updates.
6. The browser polls job status and downloads protected output through bearer-authenticated requests.

## Service responsibilities

- `core.config.Settings`: app name/version, API prefix, model path, evidence directory, and Qdrant URL.
- `core.mongodb`: root `.env` loading, Atlas client with TLS CA and selection timeout, database handle, base collections, and one-time job index.
- `job_service`: job IDs are UUID4 hex strings; job records are stored in `jobs`; input videos are deleted in `finally`.
- `inference_service`: reads the video frame by frame and writes `annotated.mp4`, `detections.jsonl`, and `helmet_events.jsonl`.
- `event_processing`: creates track summaries and review candidates; it does not confirm violations.
- `plate_pipeline`: writes plate crops/events and upserts `plate_readings`.
- `helmet_aggregation`: groups rider observations and assigns review priority.

## Error behavior

Routes return explicit HTTP errors for invalid extensions, empty/oversized uploads, missing jobs/files, invalid path components, and insufficient role. Processing failures update a job to `failed` when possible. Some background failures are printed rather than logged through the application logger.

## Important implementation risks

- `BackgroundTasks` is in-process; a worker restart loses the ability to continue a job, although the MongoDB record remains.
- `get_job` is not filtered by current user, camera, or tenant. Any authenticated developer/authority who knows a job ID can request its outputs.
- Job output paths come from stored result data and should remain confined to a configured evidence root.
- The active inference route imports `require_roles`; this dependency is defined at the bottom of `auth.py`, so import order must be preserved.
- `MongoDB/Connection/evidence_service.py` imports `mongo_connection` as a top-level module and is not part of the FastAPI router graph.
