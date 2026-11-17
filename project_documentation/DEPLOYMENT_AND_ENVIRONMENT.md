# Deployment and environment

## Verified local startup

From `Trafficai`:

```powershell
python app.py
```

`app.py` starts Uvicorn with `backend.main:app` on `127.0.0.1:8000` and runs `npm run dev` in `frontend` on port 5173. Direct commands are:

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
cd frontend
npm run dev
```

The Vite proxy forwards `/api` to port 8000.

## Dependencies

Python dependencies include FastAPI/Uvicorn, Pydantic settings, PyMongo, Ultralytics, OpenCV, NumPy, EasyOCR's transitive/runtime needs, PyTorch managed separately, testing packages, Qdrant, MLflow, and TensorBoard. Frontend dependencies are declared in `frontend/package.json`; use `npm ci` with the lockfile.

## Environment names

Only names are documented: `FRONTEND_BASE_URL`, `MONGODB_DATABASE`, `MONGODB_PASSWORD`, `MONGODB_URI`, `MONGODB_USERNAME`, `RESEND_API_KEY`, `RESEND_FROM`, `TRAFFICAI_ADMIN_KEY`, and `TRAFFICAI_AUTH_SECRET`.

## Deployment cautions

- Linux/Ubuntu and a `torch-env` are project expectations in the brief, not verified deployment facts.
- The active vehicle/helmet path expects GPU device 0.
- Model weights, datasets, storage, and env files are excluded from Git.
- No container, CI, process manager, migration runner, or production reverse-proxy configuration was verified.
- Do not deploy with the local shared admin-key model or unrestricted job access.
