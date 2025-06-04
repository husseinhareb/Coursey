# /app/routers/forum.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from bson import ObjectId

from app.schemas.forum import (
    ForumMessageCreate, ForumMessageOut,
    ForumThreadCreate, ForumThreadOut, ForumThreadDetail
)
from app.services.auth import get_current_active_user
from app.schemas.user import UserDB
from app.db.mongodb import threads_collection, messages_collection

router = APIRouter(
    prefix="/courses/{course_id}/forums",
    tags=["forums"],
    dependencies=[Depends(get_current_active_user)]
)


@router.post("/", response_model=ForumThreadOut)
async def create_thread(
    course_id: str,
    thread_in: ForumThreadCreate,
    current_user: UserDB = Depends(get_current_active_user)
):
    # Validate course_id is a valid ObjectId
    try:
        course_oid = ObjectId(course_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid course ID")

    now = datetime.utcnow()
    doc = {
        "course_id":   course_oid,
        "title":       thread_in.title,
        "author_id":   ObjectId(current_user.id),
        "created_at":  now,
        "updated_at":  now
    }
    res = await threads_collection.insert_one(doc)
    created = await threads_collection.find_one({"_id": res.inserted_id})
    if not created:
        raise HTTPException(status_code=500, detail="Thread creation failed")

    # Convert ObjectId → str
    created["_id"]       = str(created["_id"])
    created["course_id"] = str(created["course_id"])
    created["author_id"] = str(created["author_id"])
    return ForumThreadOut(**created)


@router.get("/", response_model=List[ForumThreadOut])
async def list_threads(course_id: str):
    try:
        course_oid = ObjectId(course_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid course ID")

    cursor = threads_collection.find({"course_id": course_oid})
    out = []
    async for doc in cursor:
        doc["_id"]       = str(doc["_id"])
        doc["course_id"] = str(doc["course_id"])
        doc["author_id"] = str(doc["author_id"])
        out.append(ForumThreadOut(**doc))
    return out


@router.get("/{thread_id}", response_model=ForumThreadDetail)
async def get_thread_detail(course_id: str, thread_id: str):
    # Validate IDs
    try:
        course_oid = ObjectId(course_id)
        thread_oid = ObjectId(thread_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # 1) Fetch the thread itself
    thread_doc = await threads_collection.find_one({"_id": thread_oid})
    if (
        not thread_doc
        or "course_id" not in thread_doc
        or str(thread_doc["course_id"]) != course_id
    ):
        raise HTTPException(status_code=404, detail="Thread not found")

    # Convert thread ObjectId → str
    thread_doc["_id"]       = str(thread_doc["_id"])
    thread_doc["course_id"] = str(thread_doc["course_id"])
    thread_doc["author_id"] = str(thread_doc["author_id"])

    # 2) Fetch all messages under that thread
    cursor = messages_collection.find({"thread_id": thread_oid})
    messages_out = []
    async for msg in cursor:
        msg["_id"]       = str(msg["_id"])
        msg["thread_id"] = str(msg["thread_id"])
        msg["author_id"] = str(msg["author_id"])
        messages_out.append(ForumMessageOut(**msg))

    return ForumThreadDetail(**{**thread_doc, "messages": messages_out})


@router.post("/{thread_id}/messages", response_model=ForumMessageOut)
async def create_message(
    course_id: str,
    thread_id: str,
    msg_in: ForumMessageCreate,
    current_user: UserDB = Depends(get_current_active_user)
):
    # Validate IDs
    try:
        course_oid = ObjectId(course_id)
        thread_oid = ObjectId(thread_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # Verify thread belongs to this course
    thread_doc = await threads_collection.find_one({"_id": thread_oid})
    if (
        not thread_doc
        or "course_id" not in thread_doc
        or str(thread_doc["course_id"]) != course_id
    ):
        raise HTTPException(status_code=404, detail="Thread not found")

    now = datetime.utcnow()
    msg_doc = {
        "thread_id":   thread_oid,
        "author_id":   ObjectId(current_user.id),
        "content":     msg_in.content,
        "created_at":  now,
        "updated_at":  now
    }
    res = await messages_collection.insert_one(msg_doc)
    created = await messages_collection.find_one({"_id": res.inserted_id})
    if not created:
        raise HTTPException(status_code=500, detail="Message creation failed")

    # Convert ObjectId → str
    created["_id"]       = str(created["_id"])
    created["thread_id"] = str(created["thread_id"])
    created["author_id"] = str(created["author_id"])
    return ForumMessageOut(**created)
