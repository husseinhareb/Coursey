# /app/db/mongodb.py

from motor.motor_asyncio import AsyncIOMotorClient
from os import getenv

# connection URI (falls back to local if not set)
MONGO_URI = getenv("MONGODB_URI", "mongodb://localhost:27017")
client    = AsyncIOMotorClient(MONGO_URI)

# your database
db = client.coursey

# now export the collections you need:
users_collection   = db.get_collection("user")
courses_collection = db.get_collection("course")
posts_collection   = db.get_collection("post")
