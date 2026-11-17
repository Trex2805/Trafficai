# TrafficAI project overview

## Scope and evidence standard

This documentation is based on a read-only inspection of the local workspace. It distinguishes:

- **Verified**: directly supported by active source, configuration, tests, or repository metadata.
- **Not verified**: expected by the project brief but not demonstrated by the inspected active code.
- **Recommendation**: a proposed next step, not an existing capability.

No credentials, token values, or connection strings are reproduced here.

## Purpose

TrafficAI is intended to analyze Indian traffic video with object detection, tracking, number-plate recognition, helmet review, evidence generation, MongoDB persistence, and role-based web administration. The active implementation is a review-oriented video processing system: it generates model candidates and requires human review before a candidate becomes a confirmed review-case violation.

## Verified current capabilities

- FastAPI application at `backend.main:app`, mounted under `/api/v1`.
- Health, authentication, video-upload, job-status, annotated-video, JSONL-event, analysis, evidence-frame, plate-review, and review-case endpoints.
- MongoDB job persistence and indexes.
- Video inference using a configured vehicle YOLO checkpoint with Ultralytics tracking and ByteTrack.
- A second YOLO helmet pass over rider crops.
- A separate YOLO plate detector plus EasyOCR pass sampled every fifth frame by default.
- Geometry-based plate-to-vehicle association marked as a candidate, not identity proof.
- Evidence/review frames and JSON reports under `storage/evidence`.
- React/Vite UI with developer and authority routes.
- JWT bearer authentication, Argon2-backed password hashing through `pwdlib`, authority approval, developer invitation endpoints, and password reset workflow.

## Not verified or incomplete

- No active endpoint exposes the standalone `MongoDB/Connection/evidence_service.py` capture function.
- No active enforcement/fine API is connected to the backend; the frontend fine and violation controls use mock data.
- No active search endpoint for vehicle plate or violation ID.
- The frontend dashboard data service is predominantly simulated with `mockData.ts`.
- Signal jumping, triple riding, seatbelt, camera ingestion, live streams, and automatic legal violation rules are not demonstrated.
- Continual-learning screens exist, but an active training/EWC/replay pipeline is not verified.
- The configured path and active checkpoint availability are environment-dependent.

## Important safety boundary

Model output is explicitly described by the active routes and frontend as review candidates. A future coding agent must not change this into automatic enforcement without defining legal/business rules, audit history, operator authorization, and tests.

## Recommended next task

First stabilize and test the active inference and review flow: make authentication tests agree with the request model, add endpoint-level tests for job isolation and file authorization, then connect one dashboard surface to real backend data without removing the candidate-versus-confirmed distinction.
