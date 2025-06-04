# app/crud/forum.py

from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import forums_collection  # we now store messages separately, so posts_collection is not used here anymore
from app.schemas.forum import (
    # Note: We no longer have ForumTopicIn / ForumTopicUpdate, etc. 
    # If you want to keep a “batched-in-array” style, adapt similarly to include image_url in the sub-doc.
    # For now, we'll assume messages_collection is preferred (as above in the router).
    ForumMessageOut
)


# Since messages are now stored in a separate `messages_collection`, 
# most CRUD is done in the router itself. 
# If you still want a “helper” to add a message via a single array field in the topic document,
# you could do something like:

async def add_message_to_topic_array(
    topic_id: str, 
    author_id: str, 
    content: Optional[str], 
    image_url: Optional[str]
) -> Optional[ForumMessageOut]:
    """
    If you want to keep the “messages” array inside a ForumTopic document, 
    this helper pushes a new subdocument (with optional image_url).
    """
    now = datetime.utcnow()
    new_msg_id = ObjectId()
    msg_doc = {
        "_id":        new_msg_id,
        "author_id":  ObjectId(author_id),
        "created_at": now,
    }

    if content:
        msg_doc["content"] = content
    if image_url:
        msg_doc["image_url"] = image_url

    res = await forums_collection.update_one(
        {"_id": ObjectId(topic_id)},
        {
            "$push": { "messages": msg_doc },
            "$set":  { "updated_at": now }
        }
    )
    if res.matched_count == 0:
        return None

    return ForumMessageOut(
        **{
            "_id":       str(new_msg_id),
            "thread_id": topic_id,
            "author_id": author_id,
            "content":   content,
            "image_url": image_url,
            "created_at": now
        }
    )
