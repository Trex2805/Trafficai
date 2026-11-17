# Complete project structure

## Inspection summary

The documentation scope contained 184 files after excluding `.git`, `.venv`, `node_modules`, generated runs, storage, backups, and dataset trees. It included 61 Python files, 29 TypeScript/TSX files, and 31 backup/alternate source files. Large dependency and artifact trees exist locally and are intentionally not treated as application source.

## Active application areas

| Path | Role | Status |
|---|---|---|
| `backend/main.py` | FastAPI application construction and router registration | Active |
| `backend/api/routes/auth.py` | Registration, login, JWT validation, administration, password reset | Active |
| `backend/api/routes/health.py` | Model/evidence/database health response | Active |
| `backend/api/routes/inference.py` | Upload, job output, plate review, helmet review | Active |
| `backend/core/config.py` | Pydantic settings and paths | Active |
| `backend/core/mongodb.py` | Primary MongoDB client, collections, job index | Active |
| `backend/services/job_service.py` | Job lifecycle, processing orchestration, review persistence | Active |
| `backend/services/inference_service.py` | Vehicle tracking and helmet inference | Active |
| `backend/services/plate_pipeline.py` | Plate detection, OCR, association, persistence | Active |
| `backend/services/event_processing.py` | JSONL aggregation and review candidates | Active |
| `backend/services/helmet_aggregation.py` | Conservative helmet evidence scoring | Active |
| `backend/services/plate_association.py` | Geometric candidate association | Active |
| `backend/services/plate_reading_service.py` | CSV import/upsert helper | Active utility |
| `backend/scripts/` | Administrative scripts | Active utilities |
| `MongoDB/` | Older/parallel connection and evidence utilities | Partly duplicated |
| `src/` | Standalone/legacy inference utilities | Separate from FastAPI path |
| `scripts/` | Dataset, inference, audit, and evidence tools | Mixed operational/experimental |
| `frontend/src/` | React pages, components, services, mock data | Active UI, mixed integration |
| `tests/` | Unit and policy tests | Active test sources |
| `models/`, `runs/`, `storage/` | Checkpoints, generated outputs, evidence | Local artifacts |
| `backups/` | Historical source and frontend snapshots | Do not edit/delete |

## Configuration and documentation

- `requirements.txt`: Python dependencies.
- `frontend/package.json` and `package-lock.json`: frontend dependencies/scripts.
- `.env`: local secret-bearing configuration; values were not documented.
- `MongoDB/atlas-credentials.env`: alternate secret-bearing configuration; values were not documented.
- `.gitignore`: excludes secrets, datasets, model weights, media, storage, backups, logs, and environments.
- `README.md`: setup guidance and project direction; it warns that the published repository may not be a complete runnable release.
- `docs/models/` and `docs/datasets/`: model/dataset notes and reports.

## Backup policy

Backups include pre-access-management, pre-MongoDB, pre-analysis, pre-helmet, pre-plate-review, pre-route-fix, stage, and frontend snapshots. They may explain historical behavior but are not active code. A future agent should compare a backup before removing or replacing an active flow, never overwrite a backup.

## Important boundary

The top-level `Trafficai` directory is the Git repository; the workspace parent is not. Paths in the remaining documents are relative to `Trafficai`.
