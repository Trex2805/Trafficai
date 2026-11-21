import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

_configured_root = os.getenv("TRAFFICAI_STORAGE_ROOT", "").strip()
if _configured_root:
    STORAGE_ROOT = Path(_configured_root).expanduser().resolve()
elif os.getenv("VERCEL") == "1":
    STORAGE_ROOT = Path("/tmp/trafficai")
else:
    STORAGE_ROOT = PROJECT_ROOT / "storage"

EVIDENCE_ROOT = STORAGE_ROOT / "evidence"
JOB_ROOT = EVIDENCE_ROOT / "jobs"
