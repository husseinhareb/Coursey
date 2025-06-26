from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from os import getenv

# Connection URI (falls back to local if not set)
MONGO_URI = getenv("MONGODB_URI", "mongodb://localhost:27017")
client    = AsyncIOMotorClient(MONGO_URI)

db = client.coursey

users_collection         = db.get_collection("user")
courses_collection       = db.get_collection("course")
posts_collection         = db.get_collection("post")
submissions_collection   = db.get_collection("submissions")
activity_logs_collection = db.get_collection("activity_logs")
forums_collection   = db.get_collection("forums")
messages_collection = db.get_collection("messages")
completions_collection = db.get_collection("completions")

# GridFS bucket for storing uploaded files
fs = AsyncIOMotorGridFSBucket(db)
