from motor.motor_asyncio import AsyncIOMotorClient
from os import getenv

MONGO_URI = getenv("MONGODB_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URI)
db = client.myapp
users_collection = db.get_collection("users")
