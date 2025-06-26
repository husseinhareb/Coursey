# app/crud/completion.py
from datetime import datetime
from bson import ObjectId
from typing import List

from app.db.mongodb import completions_collection
from app.schemas.completion import Completion, CompletionCreate

async def create_completion(user_id: str, course_id: str, post_id: str) -> Completion:
    """Mark a single post done for a user."""
    doc = {
        "user_id":    ObjectId(user_id),
        "course_id":  ObjectId(course_id),
        "post_id":    ObjectId(post_id),
        "created_at": datetime.utcnow()
    }
    res = await completions_collection.insert_one(doc)
    created = await completions_collection.find_one({"_id": res.inserted_id})
    # convert ObjectIds → str
    created["_id"]        = str(created["_id"])
    created["user_id"]    = str(created["user_id"])
    created["course_id"]  = str(created["course_id"])
    created["post_id"]    = str(created["post_id"])
    return Completion(**created)

async def delete_completion(user_id: str, course_id: str, post_id: str) -> bool:
    """Unmark a post as done."""
    res = await completions_collection.delete_one({
        "user_id":   ObjectId(user_id),
        "course_id": ObjectId(course_id),
        "post_id":   ObjectId(post_id)
    })
    return res.deleted_count == 1

async def list_completions(user_id: str, course_id: str) -> List[Completion]:
    """List all completions for this user+course."""
    cursor = completions_collection.find({
        "user_id":   ObjectId(user_id),
        "course_id": ObjectId(course_id)
    })
    out = []
    async for doc in cursor:
        doc["_id"]        = str(doc["_id"])
        doc["user_id"]    = str(doc["user_id"])
        doc["course_id"]  = str(doc["course_id"])
        doc["post_id"]    = str(doc["post_id"])
        out.append(Completion(**doc))
    return out
