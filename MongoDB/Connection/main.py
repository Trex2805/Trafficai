import os
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pymongo import DESCENDING, ASCENDING
from pymongo.errors import PyMongoError
from pydantic import BaseModel, Field
from mongo_connection import db, check_database_connection

app = FastAPI(
    title="TrafficAI MongoDB API",
    description="CRUD and search API for TrafficAI collections.",
    version="1.0.0",
)

origins = [
    item.strip()
    for item in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5500",
    ).split(",")
    if item.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

COLLECTIONS = {
    "cameras": {
        "search_fields": ["camera_id", "name", "status", "direction", "location.area"],
        "sort_fields": ["created_at", "name", "status"],
    },
    "detections": {
        "search_fields": ["camera_id", "model_version", "timestamp"],
        "sort_fields": ["timestamp", "camera_id", "frame_number"],
    },
    "vehicle_tracks": {
        "search_fields": ["camera_id", "session_id", "vehicle_type", "direction"],
        "sort_fields": ["first_seen", "last_seen", "vehicle_type"],
    },
    "violations": {
        "search_fields": ["camera_id", "violation_type", "review_status", "timestamp"],
        "sort_fields": ["timestamp", "review_status", "violation_type"],
    },
    "evidence": {
        "search_fields": ["violation_id", "camera_id", "image_path", "video_clip_path"],
        "sort_fields": ["captured_at", "camera_id"],
    },
    "model_versions": {
        "search_fields": ["model_name", "dataset_version", "weights_path"],
        "sort_fields": ["model_name", "training_completed_at"],
    },
    "verification_tasks": {
        "search_fields": ["violation_id", "status", "assigned_to", "decision"],
        "sort_fields": ["created_at", "reviewed_at", "status"],
    },
}

class RecordIn(BaseModel):
    data: dict[str, Any] = Field(..., description="MongoDB document fields")

class RecordPatch(BaseModel):
    data: dict[str, Any] = Field(..., description="Fields to update")

def get_collection(name: str):
    if name not in COLLECTIONS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown collection '{name}'. Allowed: {', '.join(COLLECTIONS)}",
        )
    return db[name]

def serialize(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [serialize(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize(item) for key, item in value.items()}
    return value

def parse_id(id_value: str):
    # Support ObjectId-based documents and custom string IDs.
    try:
        return ObjectId(id_value)
    except (InvalidId, TypeError):
        return id_value

def add_filter(filters: dict, key: str, value: str, allowed_fields: list[str]):
    if key not in allowed_fields:
        raise HTTPException(status_code=400, detail=f"Filtering by '{key}' is not allowed.")
    filters[key] = value

@app.get("/")
def root():
    return {
        "name": "TrafficAI MongoDB API",
        "docs": "/docs",
        "collections": list(COLLECTIONS.keys()),
    }

@app.get("/api/health")
def health():
    try:
        return check_database_connection()
    except PyMongoError as exc:
        raise HTTPException(status_code=503, detail="MongoDB connection failed.") from exc

@app.get("/api/collections")
def list_collections():
    return {"collections": list(COLLECTIONS.keys())}

@app.get("/api/{collection_name}")
def list_records(
    collection_name: str,
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str | None = None,
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    q: str | None = Query(None, description="Case-insensitive search across allowed fields"),
):
    collection = get_collection(collection_name)
    config = COLLECTIONS[collection_name]
    filters = {}

    # Explicitly supported filters only; arbitrary MongoDB operators are not accepted.
    for key, value in request.query_params.items():
        if key in {"page", "limit", "sort_by", "sort_order", "q"}:
            continue
        add_filter(filters, key, value, config["search_fields"])

    if q:
        filters["$or"] = [
            {field: {"$regex": q, "$options": "i"}}
            for field in config["search_fields"]
            if "." not in field or field.startswith("location.")
        ]

    if sort_by:
        if sort_by not in config["sort_fields"]:
            raise HTTPException(status_code=400, detail=f"Sorting by '{sort_by}' is not allowed.")
        sort_spec = [(sort_by, ASCENDING if sort_order == "asc" else DESCENDING)]
    else:
        sort_spec = [("_id", DESCENDING)]

    try:
        total = collection.count_documents(filters)
        cursor = collection.find(filters).sort(sort_spec).skip((page - 1) * limit).limit(limit)
        records = [serialize(doc) for doc in cursor]
        return {
            "collection": collection_name,
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit,
            "data": records,
        }
    except PyMongoError as exc:
        raise HTTPException(status_code=503, detail="Database query failed.") from exc

@app.get("/api/{collection_name}/{record_id}")
def get_record(collection_name: str, record_id: str):
    collection = get_collection(collection_name)
    try:
        record = collection.find_one({"_id": parse_id(record_id)})
        if record is None:
            raise HTTPException(status_code=404, detail="Record not found.")
        return serialize(record)
    except PyMongoError as exc:
        raise HTTPException(status_code=503, detail="Database query failed.") from exc

@app.post("/api/{collection_name}", status_code=201)
def create_record(collection_name: str, payload: RecordIn):
    collection = get_collection(collection_name)
    document = dict(payload.data)
    document.pop("_id", None)  # MongoDB assigns the internal _id.
    document.setdefault("created_at", datetime.now(timezone.utc))
    try:
        result = collection.insert_one(document)
        created = collection.find_one({"_id": result.inserted_id})
        return serialize(created)
    except PyMongoError as exc:
        raise HTTPException(status_code=400, detail="Could not create record; check fields and indexes.") from exc

@app.patch("/api/{collection_name}/{record_id}")
def patch_record(collection_name: str, record_id: str, payload: RecordPatch):
    collection = get_collection(collection_name)
    updates = dict(payload.data)
    if not updates:
        raise HTTPException(status_code=400, detail="Provide at least one field to update.")
    if "_id" in updates:
        raise HTTPException(status_code=400, detail="The _id field cannot be changed.")
    try:
        result = collection.update_one(
            {"_id": parse_id(record_id)},
            {"$set": updates},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Record not found.")
        updated = collection.find_one({"_id": parse_id(record_id)})
        return serialize(updated)
    except PyMongoError as exc:
        raise HTTPException(status_code=400, detail="Could not update record.") from exc

@app.delete("/api/{collection_name}/{record_id}")
def delete_record(collection_name: str, record_id: str):
    collection = get_collection(collection_name)
    try:
        result = collection.delete_one({"_id": parse_id(record_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Record not found.")
        return {"deleted": True, "id": record_id}
    except PyMongoError as exc:
        raise HTTPException(status_code=503, detail="Database delete failed.") from exc
