# /app/crud/user.py

from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import users_collection
from app.schemas.user import UserDB, Profile
from app.services.auth import hash_password, verify_password

async def create_user(
    email: str,
    raw_password: str,
    profile: Profile,
    roles: Optional[List[str]] = None
) -> Optional[UserDB]:
    if await users_collection.find_one({"email": email}):
        return None

    now = datetime.utcnow()
    username = f"{profile.firstName[0].lower()}{profile.lastName.lower()}"

    user_doc = {
        "email":        email,
        "username":     username,
        "passwordHash": hash_password(raw_password),
        "profile":      profile.model_dump(),
        "roles":        roles or [],
        "enrollments":  [],
        "accesses":     [],
        "alerts":       [],
        "createdAt":    now,
        "updatedAt":    now
    }

    res = await users_collection.insert_one(user_doc)
    doc = await users_collection.find_one({"_id": res.inserted_id})
    doc["_id"] = str(doc["_id"])
    return UserDB(**doc)

async def authenticate_user(email: str, password: str) -> Optional[UserDB]:
    doc = await users_collection.find_one({"email": email})
    if not doc or not verify_password(password, doc["passwordHash"]):
        return None
    doc["_id"] = str(doc["_id"])
    return UserDB(**doc)

async def get_user_by_id(user_id: str) -> Optional[UserDB]:
    doc = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])
    return UserDB(**doc)

async def list_users() -> List[UserDB]:
    users: List[UserDB] = []
    cursor = users_collection.find().sort("createdAt", -1)
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        users.append(UserDB(**doc))
    return users

async def update_user(
    user_id: str,
    profile: Profile
) -> Optional[UserDB]:
    """Update only the profile (and updatedAt) of a user."""
    now = datetime.utcnow()
    update_data = {
        "profile":   profile.model_dump(),
        "updatedAt": now
    }
    res = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    if res.matched_count == 0:
        return None
    # return the fresh document
    return await get_user_by_id(user_id)
