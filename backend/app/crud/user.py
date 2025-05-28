# /app/crud/user.py

from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import users_collection
from app.schemas.user import UserIn, UserDB

async def create_user(user_in: UserIn, created_by: Optional[str] = None) -> Optional[UserDB]:
    existing = await users_collection.find_one({"email": user_in.email})
    if existing:
        return None

    now = datetime.utcnow()
    from app.services.auth import hash_password

    user_doc = {
        "email": user_in.email,
        "username": user_in.username,
        "hashed_password": hash_password(user_in.password),
        "password_auto_generated": False,
        "first_name": user_in.first_name,
        "last_name": user_in.last_name,
        "phone_number": user_in.phone_number,
        "address": user_in.address,
        "profile_pic_path": user_in.profile_pic_path,
        "created_at": now,
        "updated_at": now,
        "created_by": created_by,
    }

    result = await users_collection.insert_one(user_doc)
    created = await users_collection.find_one({"_id": result.inserted_id})
    if not created:
        return None

    created["_id"] = str(created["_id"])
    return UserDB(**created)


async def authenticate_user(email: str, password: str) -> Optional[UserDB]:
    user = await users_collection.find_one({"email": email})
    if not user:
        return None

    from app.services.auth import verify_password

    if not verify_password(password, user["hashed_password"]):
        return None

    user["_id"] = str(user["_id"])
    return UserDB(**user)


async def get_user_by_id(user_id: str) -> Optional[UserDB]:
    """Fetch a single user by their ID."""
    doc = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])
    return UserDB(**doc)


async def list_users() -> List[UserDB]:
    """Fetch all users."""
    out: List[UserDB] = []
    cursor = users_collection.find()
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        out.append(UserDB(**doc))
    return out
