# Evidence management system

## Active job evidence

The active job pipeline stores generated artifacts under `storage/evidence/<job_id>` (and job inputs under `storage/evidence/jobs/<job_id>`). Typical files are:

- `annotated.mp4`
- `detections.jsonl`
- `helmet_events.jsonl`
- `plate_events.jsonl`
- `plate_crops/<job>_f<frame>_p<index>.jpg`
- `event_processing/` JSON reports
- `review_cases/review_cases.json` and review-frame JPG files

The review-frame endpoint checks a basename-only filename and returns a JPEG. Plate crop retrieval resolves the path and checks it is inside the evidence root.

## MongoDB records

`jobs` stores lifecycle and result paths. `plate_readings` stores OCR candidates and review state. `review_cases` stores candidate metadata, evidence path, review history, and confirmation state.

`MongoDB/Connection/evidence_service.py` defines a separate `capture_violation_evidence` function. It writes a JPEG named `EVD-<UTC stamp>-<UUID suffix>.jpg`, then inserts a `violations` document and an `evidence` document. It records camera, violation type, optional plate, confidence, track reference, location, timestamp, relative path, and an API URL. No active FastAPI route exposes `/api/evidence/{evidence_id}/image`, so this is not a verified end-to-end feature.

## Missing behavior

- No active evidence-ID lookup/download route for the standalone evidence collection.
- No plate/violation search API.
- No configured retention, object storage, cleanup, checksums, content-size limit, or transactional MongoDB write.
- The standalone service's broad `except Exception` cleanup can mask a second cleanup failure and is separate from the active job path.

## Recommendation

Choose one evidence model, make its root configurable and access-controlled, add ownership/authorization checks, and test missing files, path traversal, partial database writes, and duplicate requests before exposing it as a production API.
