import os
from pathlib import Path
from threading import Lock

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Prefer the project root environment file.
load_dotenv(PROJECT_ROOT / ".env")

# Fall back to the existing Atlas credentials file when necessary.
if not os.getenv("MONGODB_URI"):
    load_dotenv(PROJECT_ROOT / "MongoDB" / "atlas-credentials.env")

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("MONGODB_DATABASE", "TrafficAI")

if not MONGODB_URI:
    raise RuntimeError(
        "MONGODB_URI is missing. Check the project's environment files."
    )

client = MongoClient(
    MONGODB_URI,
    server_api=ServerApi("1"),
    serverSelectionTimeoutMS=10000,
)

db = client[DATABASE_NAME]

jobs = db["jobs"]
vehicles = db["vehicles"]
violations = db["violations"]
detections = db["detections"]
image_embeddings = db["image_embeddings"]

_index_lock = Lock()
_index_ready = False


def ensure_job_indexes():
    """Create the unique job ID index once per application process."""
    global _index_ready

    if _index_ready:
        return

    with _index_lock:
        if not _index_ready:
            jobs.create_index("job_id", unique=True, name="uq_job_id")
            _index_ready = True


def test_connection():
    """Verify Atlas connectivity without printing credentials."""
    client.admin.command("ping")
    return {
        "connected": True,
        "database": DATABASE_NAME,
    }
