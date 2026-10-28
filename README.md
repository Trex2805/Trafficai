# TrafficAI
### Continual Learning Framework for Adaptive Traffic Violation Detection in Dynamic Indian Road Environments

TrafficAI is a modular project for detecting traffic-related events in Indian road scenes. The long-term project direction includes object detection, tracking, violation analysis, evidence handling, and continual learning so that the system can adapt to changing road conditions.

> **Repository status:** The GitHub repository currently publishes the README and setup guidance. The application source code must be pushed from the development machine before another developer can clone and run the complete application. This README does not claim that the published repository is currently a complete runnable release.

## Planned/implemented project components

The local project architecture has been organized around the following components. Check the actual source branch for which modules are currently available and enabled.

- **Backend API:** Python and FastAPI
- **Computer vision:** PyTorch, YOLO-family detectors, and OpenCV
- **Tracking and video processing:** intended to support frame-level detections and tracks
- **Continual learning:** planned methods include experience replay and Elastic Weight Consolidation (EWC)
- **Database:** MongoDB Atlas for application records
- **Vector search:** Qdrant may be used where vector similarity is needed
- **Frontend:** React and Vite
- **Evidence and artifacts:** local storage paths for processed media and model artifacts

These technologies describe the project direction; they should not be interpreted as a guarantee that every module is complete or production-ready.

## Repository contents and exclusions

The source repository is intended to contain application code, configuration templates, documentation, scripts, tests, and dependency manifests.

Large and machine-specific files should remain outside Git, including:

- IDD, BDD100K, AI City, or other datasets and annotation archives
- Trained model checkpoints and training runs
- Uploaded videos, generated evidence, and inference outputs
- Virtual environments, `node_modules`, caches, and build output
- Backups, local logs, and secrets

Datasets and trained weights must be obtained separately and placed at the paths expected by the selected config or inference pipeline. Confirm dataset licenses and access terms before copying or redistributing them.

## Prerequisites

Install on each development computer:

- Git
- Python compatible with the project's dependency files
- Node.js LTS and npm
- MongoDB Atlas access for features that use MongoDB
- Qdrant access only if the selected features require vector search
- A compatible GPU and separately acquired model weights for GPU inference

Do not copy a Python virtual environment or `node_modules` from another machine. Recreate them locally.

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/Trex2805/Trafficai.git
cd Trafficai
```

**Note:** At the time this README was updated, the remote repository contained only the README. Push the application source from the development machine before following the application startup steps below.

### 2. Set up the Python environment

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

On Windows PowerShell, activate with:

```powershell
.venv\Scripts\Activate.ps1
```

If the repository's current dependency manifest is named differently, use the manifest committed with the source.

### 3. Configure environment variables

Once `.env.example` has been pushed, copy it to a local `.env` file and fill in values using the variable names required by the code:

```bash
cp .env.example .env
```

Keep MongoDB Atlas connection details, Qdrant credentials, authentication secrets, email-provider API keys, and passwords private. Never commit `.env` or any credentials file. Do not paste secret values into issues or chat.

### 4. Start the backend

After the source has been pushed, verify the actual entrypoint and configuration required by the current branch. If `backend/main.py` defines `app`, the typical FastAPI command is:

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

If the entrypoint, settings, or required environment variables differ, follow the source code and tests rather than assuming this example will work unchanged.

### 5. Start the frontend

```bash
cd frontend
npm ci
npm run
```

The final command lists available npm scripts. Start the app with the script defined in `frontend/package.json`, commonly `npm run dev`.

### 6. Models and datasets

Model inference will not be fully functional until the separately maintained model weights and any required datasets/configuration are available on the machine. Use only approved dataset copies and model artifacts. Do not commit large weights or training outputs to this source repository.

## Testing

Once the source and Python dependencies are present, run the relevant tests from the repository root:

```bash
python -m pytest
```

Some tests may require environment variables, a test database, model weights, or local media fixtures. Use test credentials and a non-production database.

## Team collaboration workflow

1. Update the local branch before starting work: `git switch main && git pull --ff-only`.
2. Create a task branch: `git switch -c feature/short-description`.
3. Make a focused change and run the relevant tests.
4. Review staged files before committing: `git status --short` and `git diff --cached --stat`.
5. Push the branch: `git push -u origin feature/short-description`.
6. Open a pull request to `main` and review it before merging.

Never use `git add -f` on datasets, credentials, trained weights, or generated evidence.

## Security notes

- Keep the repository free of populated environment files and API keys.
- If a secret is ever committed, revoke or rotate it immediately. Deleting it in a later commit does not remove it from Git history.
- If collaborators need write access, add them through GitHub repository settings. A public repository can be cloned by anyone, but public visibility alone does not grant write permission.

## License

No project license has been specified in this repository yet. Until one is added, do not assume others have permission to reuse or redistribute the code beyond the rights granted by applicable law and GitHub's platform terms.
