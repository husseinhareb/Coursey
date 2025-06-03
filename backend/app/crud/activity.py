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
    doc = {
        "user_id":  ObjectId(log_in.user_id) if ObjectId.is_valid(log_in.user_id) else log_in.user_id,
        "action":   log_in.action,
        "timestamp": log_in.timestamp,
        "metadata": log_in.metadata,
    }
    res = await activity_logs_collection.insert_one(doc)
    created = await activity_logs_collection.find_one({"_id": res.inserted_id})
    if not created:
        return None

    # Convertir ObjectId en str pour le renvoyer dans le modèle Pydantic
    created["_id"] = str(created["_id"])
    created["user_id"] = str(created["user_id"]) if isinstance(created["user_id"], ObjectId) else created["user_id"]
    return ActivityLogDB(**created)


async def list_activity_logs(user_id: Optional[str] = None) -> List[ActivityLogDB]:
    """
    (Optionnel) Lister les logs, éventuellement filtrés par user_id.
    """
    query = {}
    if user_id:
        from bson import ObjectId
        if ObjectId.is_valid(user_id):
            query["user_id"] = ObjectId(user_id)
        else:
            query["user_id"] = user_id

    cursor = activity_logs_collection.find(query).sort("timestamp", -1)
    out = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"]) if isinstance(doc["user_id"], ObjectId) else doc["user_id"]
        out.append(ActivityLogDB(**doc))
    return out
