from app.db.mongodb import users_collection
from app.schemas.user import UserIn, UserDB
from app.services.auth import hash_password

async def create_user(user_in: UserIn):
    user = await users_collection.find_one({"email": user_in.email})
    if user:
        return None
    user_doc = {
        "email": user_in.email,
        "hashed_password": hash_password(user_in.password)
    }
    result = await users_collection.insert_one(user_doc)
    return await users_collection.find_one({"_id": result.inserted_id})

async def authenticate_user(email: str, password: str):
    user = await users_collection.find_one({"email": email})
    if not user:
        return None
    from app.services.auth import verify_password
    if not verify_password(password, user["hashed_password"]):
        return None
    return user
