# app/crud/post.py

from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import posts_collection
from app.schemas.post import PostCreate, PostUpdate, PostDB

async def create_post(course_id: str, author_id: str, post_in: PostCreate) -> PostDB:
    """
    Insert a new post. 
    Assigns position = (max existing position in that course) + 1,
    ispinned = False, pinnedAt = None.
    Includes due_date if provided.
    """
    now = datetime.utcnow()
    # Determine max position among unpinned posts
    agg_pipeline = [
        {"$match": {"course_id": ObjectId(course_id), "ispinned": False}},
        {"$group": {"_id": None, "maxPos": {"$max": "$position"}}}
    ]
    agg = await posts_collection.aggregate(agg_pipeline).to_list(length=1)
    max_pos = agg[0]["maxPos"] if agg and agg[0].get("maxPos") is not None else 0

    # Build the new document
    doc = {
        "course_id":  ObjectId(course_id),
        "author_id":  ObjectId(author_id),
        "title":      post_in.title,
        "content":    post_in.content,
        "type":       post_in.type,
        "file_id":    ObjectId(post_in.file_id) if post_in.file_id else None,
        "due_date":   post_in.due_date if post_in.due_date else None,  # ← include due_date
        "position":   max_pos + 1,
        "ispinned":   False,
        "pinnedAt":   None,
        "created_at": now,
        "updated_at": now
    }

    # Insert and fetch the created document
    res = await posts_collection.insert_one(doc)
    created = await posts_collection.find_one({"_id": res.inserted_id})
    if not created:
        return None

    # Convert ObjectId → str before handing to Pydantic
    created["_id"]        = str(created["_id"])
    created["course_id"]  = str(created["course_id"])
    created["author_id"]  = str(created["author_id"])
    if created.get("file_id"):
        created["file_id"] = str(created["file_id"])
    # due_date remains as datetime or None

    return PostDB(**created)


async def list_posts(course_id: str) -> List[PostDB]:
    """
    Return all posts for a course, with pinned posts first (ordered by pinnedAt DESC),
    then unpinned posts ordered by position ASC. Includes due_date.
    """
    cursor = posts_collection.find({"course_id": ObjectId(course_id)})
    posts: List[PostDB] = []
    async for doc in cursor:
        doc["_id"]        = str(doc["_id"])
        doc["course_id"]  = str(doc["course_id"])
        doc["author_id"]  = str(doc["author_id"])
        if doc.get("file_id"):
            doc["file_id"] = str(doc["file_id"])
        # due_date is already a datetime or None
        posts.append(PostDB(**doc))

    pinned_posts   = [p for p in posts if p.ispinned]
    unpinned_posts = [p for p in posts if not p.ispinned]

    pinned_posts.sort(key=lambda p: p.pinnedAt or datetime.min, reverse=True)
    unpinned_posts.sort(key=lambda p: p.position)

    return pinned_posts + unpinned_posts


async def get_post(post_id: str) -> Optional[PostDB]:
    """
    Return a single post document—includes due_date if set.
    """
    doc = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not doc:
        return None

    # Fixed: read from "_id", not "_1d"
    doc["_id"]        = str(doc["_id"])
    doc["course_id"]  = str(doc["course_id"])
    doc["author_id"]  = str(doc["author_id"])
    if doc.get("file_id"):
        doc["file_id"] = str(doc["file_id"])
    # due_date remains as datetime or None

    return PostDB(**doc)


async def update_post(post_id: str, post_in: PostUpdate) -> Optional[PostDB]:
    """
    Update title/content/type/file_id/due_date.  Does not touch ispinned or position.
    """
    now = datetime.utcnow()

    update_fields = {
        "title":      post_in.title,
        "content":    post_in.content,
        "type":       post_in.type,
        "due_date":   post_in.due_date if post_in.due_date else None,  # ← include due_date
        "updated_at": now
    }
    if post_in.file_id is not None:
        update_fields["file_id"] = ObjectId(post_in.file_id)
    else:
        update_fields["file_id"] = None

    res = await posts_collection.update_one(
        {"_id": ObjectId(post_id)},
        {"$set": update_fields}
    )
    if res.matched_count == 0:
        return None

    return await get_post(post_id)


async def delete_post(post_id: str) -> bool:
    res = await posts_collection.delete_one({"_id": ObjectId(post_id)})
    return (res.deleted_count == 1)


async def pin_post(post_id: str) -> Optional[PostDB]:
    """
    Pin this post: set ispinned=True, pinnedAt=now.
    """
    now = datetime.utcnow()
    res = await posts_collection.update_one(
        {"_id": ObjectId(post_id)},
        {"$set": {"ispinned": True, "pinnedAt": now, "updated_at": now}}
    )
    if res.matched_count == 0:
        return None

    doc = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not doc:
        return None

    doc["_id"]        = str(doc["_id"])
    doc["course_id"]  = str(doc["course_id"])
    doc["author_id"]  = str(doc["author_id"])
    if doc.get("file_id"):
        doc["file_id"] = str(doc["file_id"])
    return PostDB(**doc)


async def unpin_post(post_id: str) -> Optional[PostDB]:
    """
    Unpin and assign a new position at the bottom of unpinned posts.
    """
    pipeline = [
        {"$match": {"ispinned": False}},
        {"$group": {"_id": None, "maxPos": {"$max": "$position"}}}
    ]
    agg = await posts_collection.aggregate(pipeline).to_list(length=1)
    max_pos = agg[0]["maxPos"] if agg and agg[0].get("maxPos") is not None else 0

    now = datetime.utcnow()
    res = await posts_collection.update_one(
        {"_id": ObjectId(post_id)},
        {"$set": {
            "ispinned":   False,
            "pinnedAt":   None,
            "position":   max_pos + 1,
            "updated_at": now
        }}
    )
    if res.matched_count == 0:
        return None

    doc = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not doc:
        return None

    doc["_id"]        = str(doc["_id"])
    doc["course_id"]  = str(doc["course_id"])
    doc["author_id"]  = str(doc["author_id"])
    if doc.get("file_id"):
        doc["file_id"] = str(doc["file_id"])
    return PostDB(**doc)


async def move_up(post_id: str) -> Optional[PostDB]:
    """
    Swap this unpinned post’s position with the post just above.
    """
    doc = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not doc or doc.get("ispinned", False):
        return None

    current_pos = doc["position"]
    if current_pos <= 1:
        doc["_id"]        = str(doc["_id"])
        doc["course_id"]  = str(doc["course_id"])
        doc["author_id"]  = str(doc["author_id"])
        if doc.get("file_id"):
            doc["file_id"] = str(doc["file_id"])
        return PostDB(**doc)

    other_doc = await posts_collection.find_one({
        "course_id": doc["course_id"],
        "ispinned": False,
        "position": current_pos - 1
    })
    if not other_doc:
        doc["_id"]        = str(doc["_id"])
        doc["course_id"]  = str(doc["course_id"])
        doc["author_id"]  = str(doc["author_id"])
        if doc.get("file_id"):
            doc["file_id"] = str(doc["file_id"])
        return PostDB(**doc)

    now = datetime.utcnow()
    await posts_collection.update_one(
        {"_id": ObjectId(post_id)},
        {"$set": {"position": current_pos - 1, "updated_at": now}}
    )
    await posts_collection.update_one(
        {"_id": other_doc["_id"]},
        {"$set": {"position": current_pos, "updated_at": now}}
    )

    updated = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not updated:
        return None

    updated["_id"]       = str(updated["_id"])
    updated["course_id"] = str(updated["course_id"])
    updated["author_id"] = str(updated["author_id"])
    if updated.get("file_id"):
        updated["file_id"] = str(updated["file_id"])
    return PostDB(**updated)


async def move_down(post_id: str) -> Optional[PostDB]:
    """
    Swap this unpinned post’s position with the post just below.
    """
    doc = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not doc or doc.get("ispinned", False):
        return None

    current_pos = doc["position"]
    other_doc = await posts_collection.find_one({
        "course_id": doc["course_id"],
        "ispinned": False,
        "position": current_pos + 1
    })
    if not other_doc:
        doc["_id"]        = str(doc["_id"])
        doc["course_id"]  = str(doc["course_id"])
        doc["author_id"]  = str(doc["author_id"])
        if doc.get("file_id"):
            doc["file_id"] = str(doc["file_id"])
        return PostDB(**doc)

    now = datetime.utcnow()
    await posts_collection.update_one(
        {"_id": ObjectId(post_id)},
        {"$set": {"position": current_pos + 1, "updated_at": now}}
    )
    await posts_collection.update_one(
        {"_id": other_doc["_id"]},
        {"$set": {"position": current_pos, "updated_at": now}}
    )

    updated = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not updated:
        return None

    updated["_id"]       = str(updated["_id"])
    updated["course_id"] = str(updated["course_id"])
    updated["author_id"] = str(updated["author_id"])
    if updated.get("file_id"):
        updated["file_id"] = str(updated["file_id"])
    return PostDB(**updated)
