# TrafficAI

A modular traffic-violation detection application for Indian road environments. This repository contains the application source code and setup templates. Training datasets, model checkpoints, uploaded evidence, credentials, logs, and generated artifacts are intentionally excluded.

> **Project status:** Initial code publication. Follow the component-specific instructions below and verify dependencies against the current source before deploying.

## Repository layout

The project source is organized into components including:

- `backend/`: API service and application logic
- `frontend/`: browser UI
- `src/`: shared/application modules
- `database/` and `MongoDB/`: database integration
- `configs/`: configuration templates
- `scripts/`: maintenance, conversion, and inference utilities
- `tests/`: automated tests
- `docs/`: architecture and developer notes

Not every optional model/data workflow is required to start the API or frontend.

## Prerequisites

Install these on the development machine:

- Git
- Python 3.11 or the version supported by the project dependencies
- Node.js LTS and npm
- Access to a MongoDB Atlas database if running features that use MongoDB
- Qdrant access only if the enabled application features require vector search
- A compatible GPU and separately obtained model weights only for GPU/model inference

Do not copy a Python virtual environment or `node_modules` from another computer. Recreate them locally.

## Quick start

### 1. Clone

```bash
git clone https://github.com/Trex2805/Trafficai.git
cd Trafficai
```

### 2. Backend environment

Create and activate a virtual environment:

```bash
python3 -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows PowerShell:
# .venv\\Scripts\\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Copy the environment template and fill in the values locally:

```bash
cp .env.example .env
```

On Windows, copy `.env.example` to `.env` using File Explorer or PowerShell. Never commit the populated `.env`.

Review `backend/main.py` and `backend/core/config.py` (if present) for the application's current startup and configuration requirements. A common FastAPI launch command is:

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

If that import path or settings differ in the current branch, use the entrypoint defined by the source.

### 3. Frontend

```bash
cd frontend
npm ci
npm run
```

The last command lists available scripts. Start the development server using the script listed in `frontend/package.json` (commonly `npm run dev`).

### 4. Data and model files

This Git repository does not include datasets, training outputs, video evidence, or model weights. Obtain approved datasets/model files separately and place them in the paths expected by the selected config or inference script. Never upload restricted or licensed datasets without permission.

## Configuration and secrets

- Copy `.env.example` to `.env` and supply local credentials.
- Keep MongoDB Atlas URI, Qdrant credentials, JWT/auth secrets, email API keys, and service passwords private.
- `MongoDB/atlas-credentials.env` is intentionally excluded. Use the environment variables documented in `.env.example`.
- Never put real credentials in source code, logs, screenshots, issue reports, or pull requests.
- If a secret is accidentally committed, revoke/rotate it immediately. Removing the file in a later commit does not remove it from repository history.

## Tests

Run from the repository root after installing the backend dependencies:

```bash
python -m pytest
```

Some integration tests may require external services or environment variables. Configure safe test credentials and local/test databases before running them.

## Team workflow

1. Create a branch for each task: `git switch -c feature/short-description`.
2. Make small, focused commits.
3. Run the relevant tests and frontend checks.
4. Push the branch: `git push -u origin feature/short-description`.
5. Open a pull request into `main` and request review before merging.
6. Pull the latest changes before starting another task: `git switch main && git pull`.

## Known exclusions

Large datasets, model checkpoints, Python/Node environments, caches, application logs, backups, user uploads, generated evidence, local secrets, and temporary build output are not part of this source repository.

## License

No license is specified yet. Until a license is added, do not assume others have permission to redistribute or reuse this project's code beyond rights granted by applicable law and GitHub's platform terms.
