"""Compatibility imports for scripts run from the Connection directory."""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from MongoDB.mongo_connection import (  # noqa: E402
    check_database_connection,
    client,
    db,
)
