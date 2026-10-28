from pathlib import Path

from fastapi import APIRouter

from backend.core.config import settings
from backend.core.mongodb import test_connection

router = APIRouter(tags=["Health"])


@router.get("/health")
def health():
    model_path = Path(settings.model_path)
    evidence_path = Path(settings.evidence_dir)

    database_connected = False
    try:
        test_connection()
        database_connected = True
    except Exception:
        # Do not expose connection strings or credentials in the API response.
        database_connected = False

    healthy = (
        model_path.is_file()
        and evidence_path.is_dir()
        and database_connected
    )

    return {
        "status": "ok" if healthy else "degraded",
        "application": settings.app_name,
        "version": settings.app_version,
        "model_available": model_path.is_file(),
        "evidence_directory_available": evidence_path.is_dir(),
        "database": {
            "type": "mongodb",
            "connected": database_connected,
        },
    }
