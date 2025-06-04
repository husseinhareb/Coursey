# app/routers/forum.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from bson import ObjectId

from app.schemas.forum import (
    ForumThreadCreate,
    ForumThreadOut,
    ForumThreadDetail,
    ForumMessageCreate,
    ForumMessageOut
)
from app.services.auth import get_current_active_user
from app.schemas.user import UserDB

from app.db.mongodb import forums_collection, messages_collection

from app.schemas.activity import ActivityLogCreate
from app.crud.activity import create_activity_log

router = APIRouter(
    prefix="/courses/{course_id}/forums",
    tags=["forums"],
    dependencies=[Depends(get_current_active_user)]
)


#
# 1) Create a new forum thread under a given course
#
@router.post("/", response_model=ForumThreadOut)
async def create_thread(
    course_id: str,
    thread_in: ForumThreadCreate,
    current_user: UserDB = Depends(get_current_active_user)
):
    # Validate that course_id is a proper ObjectId
    try:
        course_obj = ObjectId(course_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid course ID")

    now = datetime.utcnow()
    doc = {
        "course_id":  course_obj,
        "title":      thread_in.title,
        "author_id":  ObjectId(current_user.id),
        "created_at": now,
        "updated_at": now
    }
    res = await forums_collection.insert_one(doc)
    created = await forums_collection.find_one({"_id": res.inserted_id})
    if not created:
        raise HTTPException(status_code=500, detail="Thread creation failed")

    # Convert ObjectId → str
    created["_id"]       = str(created["_id"])
    created["course_id"] = str(created["course_id"])
    created["author_id"] = str(created["author_id"])

    # Log "create_thread" activity
    log = ActivityLogCreate(
        user_id=current_user.id,
        action="create_thread",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "thread_id": created["_id"]}
    )
    await create_activity_log(log)

    return ForumThreadOut(**created)


#
# 2) List all threads for a given course
#
@router.get("/", response_model=List[ForumThreadOut])
async def list_threads(
    course_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    try:
        course_obj = ObjectId(course_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid course ID")

    cursor = forums_collection.find({"course_id": course_obj})
    out = []
    async for doc in cursor:
        doc["_id"]       = str(doc["_id"])
        doc["course_id"] = str(doc["course_id"])
        doc["author_id"] = str(doc["author_id"])
        out.append(ForumThreadOut(**doc))

    # sort by updated_at descending
    out.sort(key=lambda t: t.updated_at, reverse=True)

    # Log "list_threads" activity
    log = ActivityLogCreate(
        user_id=current_user.id,
        action="list_threads",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "count": len(out)}
    )
    await create_activity_log(log)

    return out


#
# 3) Get one thread, including its messages
#
@router.get("/{thread_id}", response_model=ForumThreadDetail)
async def get_thread_detail(
    course_id: str,
    thread_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    # Validate IDs
    try:
        course_obj = ObjectId(course_id)
        thread_obj = ObjectId(thread_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Fetch the thread document
    thread_doc = await forums_collection.find_one({"_id": thread_obj})
    if not thread_doc or str(thread_doc["course_id"]) != course_id:
        raise HTTPException(status_code=404, detail="Thread not found")

    # Convert thread OIDs → str
    thread_doc["_id"]       = str(thread_doc["_id"])
    thread_doc["course_id"] = str(thread_doc["course_id"])
    thread_doc["author_id"] = str(thread_doc["author_id"])

    # Fetch all messages under that thread
    cursor = messages_collection.find({"thread_id": thread_obj})
    messages_out: List[dict] = []
    async for msg in cursor:
        msg["_id"]       = str(msg["_id"])
        msg["thread_id"] = str(msg["thread_id"])
        msg["author_id"] = str(msg["author_id"])
        messages_out.append(ForumMessageOut(**msg).dict())

    # Log "view_thread" activity
    log = ActivityLogCreate(
        user_id=current_user.id,
        action="view_thread",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "thread_id": thread_id, "messages": len(messages_out)}
    )
    await create_activity_log(log)

    return ForumThreadDetail(**{**thread_doc, "messages": messages_out})


#
# 4) Post a new message under a specific thread
#
@router.post("/{thread_id}/messages", response_model=ForumMessageOut)
async def create_message(
    course_id: str,
    thread_id: str,
    msg_in: ForumMessageCreate,
    current_user: UserDB = Depends(get_current_active_user)
):
    # Validate IDs
    try:
        course_obj = ObjectId(course_id)
        thread_obj = ObjectId(thread_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify thread belongs to this course
    thread_doc = await forums_collection.find_one({"_id": thread_obj})
    if not thread_doc or str(thread_doc["course_id"]) != course_id:
        raise HTTPException(status_code=404, detail="Thread not found")

    now = datetime.utcnow()
    msg_doc = {
        "thread_id":  thread_obj,
        "author_id":  ObjectId(current_user.id),
        "content":    msg_in.content,
        "created_at": now,
        "updated_at": now
    }
    res = await messages_collection.insert_one(msg_doc)
    created = await messages_collection.find_one({"_id": res.inserted_id})
    if not created:
        raise HTTPException(status_code=500, detail="Message creation failed")

    created["_id"]       = str(created["_id"])
    created["thread_id"] = str(created["thread_id"])
    created["author_id"] = str(created["author_id"])

    # Also update thread's updated_at
    await forums_collection.update_one(
        {"_id": thread_obj},
        {"$set": {"updated_at": now}}
    )

    # Log "create_message" activity
    log = ActivityLogCreate(
        user_id=current_user.id,
        action="create_message",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "thread_id": thread_id, "message_id": created["_id"]}
    )
    await create_activity_log(log)

    return ForumMessageOut(**created)
