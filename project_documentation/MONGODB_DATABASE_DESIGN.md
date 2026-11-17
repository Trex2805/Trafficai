# MongoDB database design

## Connection configuration

The active backend loads the project `.env`, falls back to `MongoDB/atlas-credentials.env` when `MONGODB_URI` is absent, uses `MONGODB_DATABASE` with default `TrafficAI`, enables Atlas Server API version 1, TLS CA verification through `certifi`, and a 10-second server-selection timeout. Secret values are intentionally omitted.

## Collections observed in code

| Collection | Active use |
|---|---|
| `users` | accounts, roles, status, password hash |
| `developer_invitations` | hashed one-time invitation tokens |
| `password_resets` | hashed reset tokens and expiry/consumption |
| `jobs` | video job lifecycle and result paths |
| `plate_readings` | plate detector/OCR candidates and review history |
| `review_cases` | helmet/traffic review candidates and decisions |
| `vehicles`, `violations`, `detections`, `image_embeddings` | handles declared, but no active FastAPI CRUD found |
| `evidence` | used by the standalone evidence service |
| `cameras`, `vehicle_tracks`, `model_versions`, `verification_tasks` | initialized by the separate `init_db.py` script |

## Indexes

Verified indexes include unique `jobs.job_id`, unique `users.email`, unique `plate_readings.record_id`, `(job_id, review_status)` for plates, unique `(job_id, case_id)` for review cases, and `(job_id, review_status)` for review cases. `MongoDB/Connection/init_db.py` defines additional camera, detection, track, violation, evidence, model, and verification indexes, but its execution is not proven by the FastAPI startup.

## Schema cautions

The active code stores paths and ISO strings in some job/review fields while other services store timezone-aware datetimes. The `violations` and `evidence` schemas are split between an active collection handle and a standalone writer. A future migration must normalize timestamps, ownership, retention, and cross-collection references.
