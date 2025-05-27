# /app/crud/user.py

from typing import Optional
from datetime import datetime

from app.db.mongodb import users_collection
from app.schemas.user import UserIn, UserDB
from app.services.auth import hash_password, verify_password

async def create_user(user_in: UserIn, created_by: Optional[str] = None) -> Optional[UserDB]:
    # prevent duplicate emails
    existing = await users_collection.find_one({"email": user_in.email})
    if existing:
        return None

    now = datetime.utcnow()
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

    # Convert Mongo ObjectId to str so Pydantic can validate
    created["_id"] = str(created["_id"])
    return UserDB(**created)


async def authenticate_user(email: str, password: str) -> Optional[UserDB]:
    user = await users_collection.find_one({"email": email})
    if not user:
        return None

    if not verify_password(password, user["hashed_password"]):
        return None

    # Convert Mongo ObjectId to str for Pydantic
    user["_id"] = str(user["_id"])
    return UserDB(**user)
