import json
from datetime import datetime, timezone
from pathlib import Path

from backend.core.mongodb import db

JOB_ID = "80a84f6018794077bb2102e4813aafc6"
EVIDENCE_ID = "89038d867ff14037ab4cd965b013a330"

SOURCE = (
    Path("storage/evidence")
    / EVIDENCE_ID
    / "review_cases"
    / "review_cases.json"
).resolve()

if not SOURCE.is_file():
    raise SystemExit(f"Review-case file not found: {SOURCE}")

raw = json.loads(SOURCE.read_text(encoding="utf-8"))
cases = raw if isinstance(raw, list) else raw.get(
    "cases", raw.get("review_cases", [])
)

if not cases:
    raise SystemExit("No review cases found. Nothing was written.")

collection = db["review_cases"]
collection.create_index(
    [("job_id", 1), ("case_id", 1)],
    unique=True,
    name="uq_review_case_job_case",
)
collection.create_index(
    [("job_id", 1), ("review_status", 1)],
    name="ix_review_case_job_status",
)

now = datetime.now(timezone.utc)
inserted = 0

for case in cases:
    case_id = case.get("case_id")
    if not case_id:
        raise ValueError("A review case has no case_id; aborting.")

    evidence_rel = case.get("evidence_frame")
    evidence_path = (
        (SOURCE.parent / evidence_rel).resolve()
        if evidence_rel else None
    )

    if evidence_path:
        evidence_root = SOURCE.parent.resolve()
        try:
            evidence_path.relative_to(evidence_root)
        except ValueError:
            raise ValueError(f"Evidence path escapes review directory: {evidence_rel}")

    record = {
        **case,
        "job_id": JOB_ID,
        "evidence_job_id": EVIDENCE_ID,
        "evidence_path": str(evidence_path) if evidence_path else None,
        "review_status": "pending",
        "is_confirmed_violation": False,
        "created_at": now,
        "updated_at": now,
        "review_history": [],
    }

    result = collection.update_one(
        {"job_id": JOB_ID, "case_id": case_id},
        {"$setOnInsert": record},
        upsert=True,
    )
    inserted += result.upserted_id is not None

print("Database:", db.name)
print("Collection:", collection.name)
print("Source cases:", len(cases))
print("New cases inserted:", inserted)
print("Cases for this job:", collection.count_documents({"job_id": JOB_ID}))
print(
    "Still pending:",
    collection.count_documents({
        "job_id": JOB_ID,
        "review_status": "pending",
    }),
)
print(
    "Confirmed violations:",
    collection.count_documents({
        "job_id": JOB_ID,
        "is_confirmed_violation": True,
    }),
)
print("Migration complete.")
