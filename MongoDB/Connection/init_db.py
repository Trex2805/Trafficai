"""Create the TrafficAI collections and useful indexes. Safe to run repeatedly."""
from mongo_connection import client, db, check_database_connection

COLLECTIONS = [
    "cameras",
    "detections",
    "vehicle_tracks",
    "violations",
    "evidence",
    "model_versions",
    "verification_tasks",
]

def ensure_collection(name: str):
    if name not in db.list_collection_names():
        db.create_collection(name)

def main():
    check_database_connection()

    for name in COLLECTIONS:
        ensure_collection(name)

    db.cameras.create_index("camera_id", unique=True, sparse=True)
    db.cameras.create_index("status")

    db.detections.create_index([("camera_id", 1), ("timestamp", -1)])
    db.detections.create_index("objects.track_id")

    db.vehicle_tracks.create_index(
        [("camera_id", 1), ("session_id", 1), ("tracker_id", 1)]
    )
    db.vehicle_tracks.create_index([("first_seen", -1)])

    db.violations.create_index([("timestamp", -1)])
    db.violations.create_index([("review_status", 1), ("timestamp", -1)])
    db.violations.create_index(
        [("camera_id", 1), ("violation_type", 1), ("timestamp", -1)]
    )

    db.evidence.create_index("violation_id")
    db.evidence.create_index([("captured_at", -1)])

    db.model_versions.create_index("model_name")
    db.verification_tasks.create_index([("status", 1), ("created_at", -1)])
    db.verification_tasks.create_index("violation_id")

    print(f"Database '{db.name}' is ready.")
    print("Collections:")
    for name in db.list_collection_names():
        print(f" - {name}")
    client.close()

if __name__ == "__main__":
    main()
