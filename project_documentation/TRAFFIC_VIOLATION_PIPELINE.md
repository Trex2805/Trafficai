# Traffic violation pipeline

## Actual order

1. `POST /api/v1/inference/video` validates extension and a 500 MiB limit.
2. A UUID4 job directory is created under `storage/evidence/jobs/<job_id>` and the upload is persisted.
3. `run_video_inference` reads frames with OpenCV.
4. The vehicle model detects/tracks each frame with ByteTrack and writes annotations and vehicle JSONL.
5. Rider/person crops are sent to the helmet model; helmet observations are written to a second JSONL.
6. The plate pipeline samples frames, detects plate boxes, saves original crops, enhances OCR input, runs EasyOCR, and associates a candidate vehicle geometrically.
7. `build_review_evidence.py` extracts review frames for helmet-related candidate events.
8. Review cases are upserted into `review_cases`; plate candidates are upserted into `plate_readings`.
9. `event_processing` creates track summaries and traffic review candidates.
10. The job becomes `completed` with output paths and analysis metadata, or `failed`.
11. Authority users can review plate/helmet candidates. Only an explicit review-case confirmation sets `is_confirmed_violation=True`.

## What is not in the pipeline

There is no verified active rule engine that evaluates a traffic signal, speed, seatbelt, triple riding, or other legal rule. There is no active automatic call from inference to the standalone `capture_violation_evidence` service. Consequently, the current pipeline is detection plus human-review preparation, not automatic violation adjudication.

## IDs and deduplication

- Job ID: UUID4 hex.
- Plate record ID: SHA-256 of job/frame/box/bounding-box identity.
- Review case ID: generated from frame and event index by the evidence builder.
- Confirmed review case update: `(job_id, case_id)` unique index and `$setOnInsert`.
- Standalone evidence IDs: UTC timestamp plus 12-character UUID suffix, but that service is not wired into the active route.
