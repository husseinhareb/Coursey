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
    """
    now = datetime.utcnow()
    # 1) Find the current max position among ALL posts (including pinned),
    #    but typically only unpinned posts have meaningful positions.
    #    We’ll treat pinned posts as having no effect on the “position” group of unpinned,
    #    so we restrict to ispinned=False for the aggregation.
    agg_pipeline = [
        {"$match": {"course_id": ObjectId(course_id), "ispinned": False}},
        {"$group": {"_id": None, "maxPos": {"$max": "$position"}}}
    ]
    agg = await posts_collection.aggregate(agg_pipeline).to_list(length=1)
    max_pos = 0
    if agg and agg[0].get("maxPos") is not None:
        max_pos = agg[0]["maxPos"]

    # 2) Build the new document
    doc = {
        "course_id":  ObjectId(course_id),
        "author_id":  ObjectId(author_id),
        "title":      post_in.title,
        "content":    post_in.content,
        "type":       post_in.type,
        "file_id":    ObjectId(post_in.file_id) if post_in.file_id else None,
        "position":   max_pos + 1,
        "ispinned":   False,
        "pinnedAt":   None,
        "created_at": now,
        "updated_at": now,
    }

    # 3) Insert and then fetch the newly created document
    res = await posts_collection.insert_one(doc)
    created = await posts_collection.find_one({"_id": res.inserted_id})
    if not created:
        return None  # Should not happen.

    # 4) Convert ObjectId fields → str before passing to Pydantic
    created["_id"]        = str(created["_id"])
    created["course_id"]  = str(created["course_id"])
    created["author_id"]  = str(created["author_id"])
    if created.get("file_id"):
        created["file_id"] = str(created["file_id"])
    return PostDB(**created)


async def list_posts(course_id: str) -> List[PostDB]:
    """
    Return all posts for a course, with pinned posts first (ordered by pinnedAt DESC),
    then unpinned posts ordered by position ASC.
    """
    cursor = posts_collection.find({"course_id": ObjectId(course_id)})
    posts: List[dict] = []
    async for doc in cursor:
        # Convert every ObjectId → str
        doc["_id"]       = str(doc["_id"])
        doc["course_id"] = str(doc["course_id"])
        doc["author_id"] = str(doc["author_id"])
        if doc.get("file_id"):
            doc["file_id"] = str(doc["file_id"])
        posts.append(PostDB(**doc))

    # Sort in two phases:
    pinned_posts   = [p for p in posts if p.ispinned]
    unpinned_posts = [p for p in posts if not p.ispinned]

    # 1) pinned: sort by pinnedAt DESC (most recently pinned first)
    pinned_posts.sort(key=lambda p: p.pinnedAt or datetime.min, reverse=True)

    # 2) unpinned: sort by position ASC
    unpinned_posts.sort(key=lambda p: p.position)

    return pinned_posts + unpinned_posts


async def get_post(post_id: str) -> Optional[PostDB]:
    doc = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not doc:
        return None

    # Convert ObjectId fields → str
    doc["_id"]       = str(doc["_id"])
    doc["course_id"] = str(doc["course_id"])
    doc["author_id"] = str(doc["author_id"])
    if doc.get("file_id"):
        doc["file_id"] = str(doc["file_id"])

    return PostDB(**doc)


async def update_post(post_id: str, post_in: PostUpdate) -> Optional[PostDB]:
    now = datetime.utcnow()

    update_fields = {
        "title":      post_in.title,
        "content":    post_in.content,
        "type":       post_in.type,
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
    if res.deleted_count != 1:
        return False

    # After deletion, “compress” all unpinned posts’ positions:
    #    Let old_position = the deleted post’s position.
    #    For every unpinned post with position > old_position, do position = position - 1.
    # (This step is optional but recommended so that you never have gaps in position numbering.)
    #
    # We need the position of the deleted post to do that. Suppose the caller already fetched
    # that position earlier; if not, we can’t compress here (for simplicity, we’ll skip
    # automatic re‐compression; you can implement it if desired).
    return True


async def pin_post(post_id: str) -> Optional[PostDB]:
    """
    Pin this post: set ispinned=True, pinnedAt=now.
    We rely on pinnedAt for ordering, so we do not alter `position` here.
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

    # Convert ObjectId → str
    doc["_id"]       = str(doc["_id"])
    doc["course_id"] = str(doc["course_id"])
    doc["author_id"] = str(doc["author_id"])
    if doc.get("file_id"):
        doc["file_id"] = str(doc["file_id"])
    return PostDB(**doc)


async def unpin_post(post_id: str) -> Optional[PostDB]:
    """
    Unpin: set ispinned=False, pinnedAt=None, and reassign this post’s `position`
    to the bottom of unpinned posts (i.e. max existing position + 1).
    """
    # 1) Find the current max position among unpinned posts:
    pipeline = [
        {"$match": {"ispinned": False}},
        {"$group": {"_id": None, "maxPos": {"$max": "$position"}}}
    ]
    agg = await posts_collection.aggregate(pipeline).to_list(length=1)
    max_pos = 0
    if agg and agg[0].get("maxPos") is not None:
        max_pos = agg[0]["maxPos"]

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

    # Convert ObjectId → str
    doc["_id"]       = str(doc["_id"])
    doc["course_id"] = str(doc["course_id"])
    doc["author_id"] = str(doc["author_id"])
    if doc.get("file_id"):
        doc["file_id"] = str(doc["file_id"])
    return PostDB(**doc)


async def move_up(post_id: str) -> Optional[PostDB]:
    """
    Swap this unpinned post’s position with the unpinned post just above (position−1).
    """
    doc = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not doc or doc.get("ispinned", False):
        return None

    current_pos = doc["position"]
    if current_pos <= 1:
        # Already at top among unpinned
        # Convert the found doc → PostDB and return
        doc["_id"]       = str(doc["_id"])
        doc["course_id"] = str(doc["course_id"])
        doc["author_id"] = str(doc["author_id"])
        if doc.get("file_id"):
            doc["file_id"] = str(doc["file_id"])
        return PostDB(**doc)
    
    # Find the unpinned post whose position = current_pos - 1
    other_doc = await posts_collection.find_one({
        "course_id": doc["course_id"],
        "ispinned": False,
        "position": current_pos - 1
    })
    if not other_doc:
        # Nothing to swap with; just return original
        doc["_id"]       = str(doc["_id"])
        doc["course_id"] = str(doc["course_id"])
        doc["author_id"] = str(doc["author_id"])
        if doc.get("file_id"):
            doc["file_id"] = str(doc["file_id"])
        return PostDB(**doc)

    # Swap positions
    now = datetime.utcnow()
    await posts_collection.update_one(
        {"_id": ObjectId(post_id)},
        {"$set": {"position": current_pos - 1, "updated_at": now}}
    )
    await posts_collection.update_one(
        {"_id": other_doc["_id"]},
        {"$set": {"position": current_pos, "updated_at": now}}
    )

    # Fetch the newly updated doc
    updated = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not updated:
        return None

    # Convert back → strings
    updated["_id"]       = str(updated["_id"])
    updated["course_id"] = str(updated["course_id"])
    updated["author_id"] = str(updated["author_id"])
    if updated.get("file_id"):
        updated["file_id"] = str(updated["file_id"])
    return PostDB(**updated)


async def move_down(post_id: str) -> Optional[PostDB]:
    """
    Swap this unpinned post’s position with the unpinned post just below (position+1).
    """
    doc = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not doc or doc.get("ispinned", False):
        return None

    current_pos = doc["position"]
    # Find the unpinned post with position = current_pos + 1
    other_doc = await posts_collection.find_one({
        "course_id": doc["course_id"],
        "ispinned": False,
        "position": current_pos + 1
    })
    if not other_doc:
        # Already at bottom of unpinned; return original
        doc["_id"]       = str(doc["_id"])
        doc["course_id"] = str(doc["course_id"])
        doc["author_id"] = str(doc["author_id"])
        if doc.get("file_id"):
            doc["file_id"] = str(doc["file_id"])
        return PostDB(**doc)

    # Swap positions
    now = datetime.utcnow()
    await posts_collection.update_one(
        {"_id": ObjectId(post_id)},
        {"$set": {"position": current_pos + 1, "updated_at": now}}
    )
    await posts_collection.update_one(
        {"_id": other_doc["_id"]},
        {"$set": {"position": current_pos, "updated_at": now}}
    )

    # Fetch the updated document
    updated = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not updated:
        return None

    # Convert → strings
    updated["_id"]       = str(updated["_id"])
    updated["course_id"] = str(updated["course_id"])
    updated["author_id"] = str(updated["author_id"])
    if updated.get("file_id"):
        updated["file_id"] = str(updated["file_id"])
    return PostDB(**updated)
