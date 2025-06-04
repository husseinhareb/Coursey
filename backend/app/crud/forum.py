# app/crud/forum.py

from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import posts_collection, forums_collection  # on suppose que mongodb.py expose `forums_collection`
from app.schemas.forum import (
    ForumTopicIn,
    ForumTopicUpdate,
    ForumTopicDB,
    ForumTopicOut,
    ForumMessage
)

async def create_topic(course_id: str, author_id: str, topic_in: ForumTopicIn) -> ForumTopicDB:
    now = datetime.utcnow()
    doc = {
        "course_id":  ObjectId(course_id),
        "author_id":  ObjectId(author_id),
        "title":      topic_in.title,
        "created_at": now,
        "updated_at": now,
        "messages":   []  # déclenchement d’un tableau vide
    }
    res = await forums_collection.insert_one(doc)
    created = await forums_collection.find_one({"_id": res.inserted_id})
    if not created:
        return None

    # Convert ObjectId → str
    created["_id"]        = str(created["_id"])
    created["course_id"]  = str(created["course_id"])
    created["author_id"]  = str(created["author_id"])
    return ForumTopicDB(**created)


async def list_topics(course_id: str) -> List[ForumTopicDB]:
    """
    Retourne tous les topics pour un cours donné, triés par date de dernière mise à jour (DESC).
    """
    cursor = forums_collection.find({"course_id": ObjectId(course_id)})
    topics: List[ForumTopicDB] = []
    async for doc in cursor:
        doc["_id"]        = str(doc["_id"])
        doc["course_id"]  = str(doc["course_id"])
        doc["author_id"]  = str(doc["author_id"])
        # Convertir chaque sous‐document de messages
        msgs = doc.get("messages", [])
        normalized_msgs = []
        for m in msgs:
            normalized_msgs.append({
                "_id":       str(m["_id"]),
                "author_id": str(m["author_id"]),
                "content":   m["content"],
                "created_at": m["created_at"]
            })
        doc["messages"] = normalized_msgs  # Pydantic se chargera de parser
        topics.append(ForumTopicDB(**doc))

    # Trier par updated_at desc
    topics.sort(key=lambda t: t.updated_at, reverse=True)
    return topics


async def get_topic(topic_id: str) -> Optional[ForumTopicDB]:
    doc = await forums_collection.find_one({"_id": ObjectId(topic_id)})
    if not doc:
        return None

    doc["_id"]        = str(doc["_id"])
    doc["course_id"]  = str(doc["course_id"])
    doc["author_id"]  = str(doc["author_id"])
    # normaliser les messages
    msgs = doc.get("messages", [])
    normalized_msgs = []
    for m in msgs:
        normalized_msgs.append({
            "_id":       str(m["_id"]),
            "author_id": str(m["author_id"]),
            "content":   m["content"],
            "created_at": m["created_at"]
        })
    doc["messages"] = normalized_msgs
    return ForumTopicDB(**doc)


async def update_topic(topic_id: str, topic_in: ForumTopicUpdate) -> Optional[ForumTopicDB]:
    now = datetime.utcnow()
    update_fields = {}
    if topic_in.title is not None:
        update_fields["title"] = topic_in.title
    update_fields["updated_at"] = now

    res = await forums_collection.update_one(
        {"_id": ObjectId(topic_id)},
        {"$set": update_fields}
    )
    if res.matched_count == 0:
        return None
    return await get_topic(topic_id)


async def delete_topic(topic_id: str) -> bool:
    res = await forums_collection.delete_one({"_id": ObjectId(topic_id)})
    return (res.deleted_count == 1)


async def add_message(topic_id: str, author_id: str, content: str) -> Optional[ForumMessage]:
    """
    Ajoute un message à la liste `messages` du topic.
    Met automatiquement à jour la date `updated_at` du topic.
    """
    now = datetime.utcnow()
    new_msg_id = ObjectId()
    msg_doc = {
        "_id":       new_msg_id,
        "author_id": ObjectId(author_id),
        "content":   content,
        "created_at": now
    }

    res = await forums_collection.update_one(
        {"_id": ObjectId(topic_id)},
        {
            "$push": { "messages": msg_doc },
            "$set":  { "updated_at": now }
        }
    )
    if res.matched_count == 0:
        return None

    return ForumMessage(
        _id=str(new_msg_id),
        author_id=author_id,
        content=content,
        created_at=now
    )
