import argparse
import sys
from collections import Counter
from pathlib import Path

# Make the project root importable when this file is run directly.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.plate_reading_service import (
    load_candidate_records,
    persist_candidate_records,
)

parser = argparse.ArgumentParser(
    description="Import OCR plate candidates into MongoDB for human review."
)
parser.add_argument(
    "--csv",
    default="storage/evidence/plate_tests/ocr_results.csv",
    help="Path to the OCR results CSV",
)
parser.add_argument(
    "--source-video",
    default="storage/evidence/combined_validation_v2/video3_combined.mp4",
    help="Source video path or identifier",
)
parser.add_argument(
    "--dry-run",
    action="store_true",
    help="Preview records without connecting to MongoDB or writing data",
)
args = parser.parse_args()

records = load_candidate_records(args.csv, args.source_video)
statuses = Counter(record["recognition_status"] for record in records)

print(f"CSV: {Path(args.csv).resolve()}")
print(f"Records prepared: {len(records)}")
print(f"Recognition statuses: {dict(statuses)}")
print("All records will have review_status='pending' and is_verified=False.")

for record in records[:5]:
    print({
        "frame_number": record["frame_number"],
        "plate_text_raw": record["plate_text_raw"],
        "ocr_confidence": record["ocr_confidence"],
        "recognition_status": record["recognition_status"],
        "review_status": record["review_status"],
    })

if args.dry_run:
    print("DRY RUN ONLY: MongoDB was not changed.")
else:
    result = persist_candidate_records(records)
    print("MongoDB persistence result:", result)
