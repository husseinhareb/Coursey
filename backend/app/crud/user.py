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
    """Create a new user with nested profile, roles, and empty enrollments/accesses/alerts."""
    # prevent duplicate emails
    if await users_collection.find_one({"email": email}):
        return None

    now = datetime.utcnow()
    # generate a simple username if you like, e.g. first initial + last name
    username = f"{profile.firstName[0].lower()}{profile.lastName.lower()}"

    user_doc = {
        "email":        email,
        "username":     username,
        "passwordHash": hash_password(raw_password),
        "profile":      profile.model_dump(),  # Pydantic v2 .dict()
        "roles":        roles or [],
        "enrollments":  [],
        "accesses":     [],
        "alerts":       [],
        "createdAt":    now,
        "updatedAt":    now
    }

    result = await users_collection.insert_one(user_doc)
    created = await users_collection.find_one({"_id": result.inserted_id})
    if not created:
        return None

    created["_id"] = str(created["_id"])
    return UserDB(**created)


async def authenticate_user(email: str, password: str) -> Optional[UserDB]:
    """Verify credentials and return the full UserDB if valid."""
    doc = await users_collection.find_one({"email": email})
    if not doc or not verify_password(password, doc["passwordHash"]):
        return None

    doc["_id"] = str(doc["_id"])
    return UserDB(**doc)


async def get_user_by_id(user_id: str) -> Optional[UserDB]:
    """Fetch a single user by their ID."""
    doc = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not doc:
        return None

    doc["_id"] = str(doc["_id"])
    return UserDB(**doc)


async def list_users() -> List[UserDB]:
    """Fetch all users."""
    users: List[UserDB] = []
    cursor = users_collection.find().sort("createdAt", -1)
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        users.append(UserDB(**doc))
    return users
