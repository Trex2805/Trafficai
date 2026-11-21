import logging
from pathlib import Path

from fastapi import APIRouter

from backend.core.config import settings
from backend.core.mongodb import test_connection

router = APIRouter(tags=["Health"])
logger = logging.getLogger(__name__)


@router.get("/health")
def health():
    model_path = Path(settings.model_path)
    if not model_path.is_absolute():
        model_path = Path(__file__).resolve().parents[3] / model_path

    helmet_path = (
        Path(__file__).resolve().parents[3]
        / "runs/detect/runs/helmet/helmet_v6_binary_yolo11n/weights/best.pt"
    )
    evidence_path = Path(settings.evidence_dir)
    if not evidence_path.is_absolute():
        evidence_path = Path(__file__).resolve().parents[3] / evidence_path

    database_connected = False
    try:
        test_connection()
        database_connected = True
    except Exception:
        # Do not expose connection strings or credentials in the API response.
        logger.exception("MongoDB health check failed.")
        database_connected = False

    healthy = (
        model_path.is_file()
        and helmet_path.is_file()
        and evidence_path.is_dir()
        and database_connected
    )

    return {
        "status": "ok" if healthy else "degraded",
        "application": settings.app_name,
        "version": settings.app_version,
        "model_available": model_path.is_file(),
        "helmet_model_available": helmet_path.is_file(),
        "evidence_directory_available": evidence_path.is_dir(),
        "database": {
            "type": "mongodb",
            "connected": database_connected,
        },
    }
