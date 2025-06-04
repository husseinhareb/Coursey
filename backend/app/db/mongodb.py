# /app/db/mongodb.py

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from os import getenv

# Connection URI (falls back to local if not set)
MONGO_URI = getenv("MONGODB_URI", "mongodb://localhost:27017")
client    = AsyncIOMotorClient(MONGO_URI)

# Your database
db = client.coursey

# Export the collections you need
users_collection         = db.get_collection("user")
courses_collection       = db.get_collection("course")
posts_collection         = db.get_collection("post")
submissions_collection   = db.get_collection("submissions")
activity_logs_collection = db.get_collection("activity_logs")

# Forum‐related collections
threads_collection       = db.get_collection("threads")
messages_collection      = db.get_collection("messages")

# GridFS bucket for storing uploaded files
fs = AsyncIOMotorGridFSBucket(db)
