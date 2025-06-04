# app/crud/activity.py

from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import activity_logs_collection
from app.schemas.activity import ActivityLogCreate, ActivityLogDB

async def create_activity_log(log_in: ActivityLogCreate) -> ActivityLogDB:
    """
    Insère un document dans la collection `activity_logs`.
    """
    # On convertit user_id en ObjectId si possible, sinon on le laisse tel quel.
    if ObjectId.is_valid(log_in.user_id):
        user_field = ObjectId(log_in.user_id)
    else:
        user_field = log_in.user_id

    doc = {
        "user_id":  user_field,
        "action":   log_in.action,
        "timestamp": log_in.timestamp,
        "metadata":  log_in.metadata,
    }

    res = await activity_logs_collection.insert_one(doc)
    created = await activity_logs_collection.find_one({"_id": res.inserted_id})
    if not created:
        return None

    # Convertir _id et user_id vers str pour Pydantic
    created["_id"] = str(created["_id"])
    created["user_id"] = (
        str(created["user_id"]) 
        if isinstance(created["user_id"], ObjectId) 
        else created["user_id"]
    )

    return ActivityLogDB(**created)

async def list_activity_logs(user_id: Optional[str] = None) -> List[ActivityLogDB]:
    """
    Liste tous les logs, ou filtre par user_id.
    """
    query = {}
    if user_id:
        if ObjectId.is_valid(user_id):
            query["user_id"] = ObjectId(user_id)
        else:
            query["user_id"] = user_id

    cursor = activity_logs_collection.find(query).sort("timestamp", -1)
    out: List[ActivityLogDB] = []

    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["user_id"] = (
            str(doc["user_id"]) 
            if isinstance(doc["user_id"], ObjectId) 
            else doc["user_id"]
        )
        out.append(ActivityLogDB(**doc))

    return out
