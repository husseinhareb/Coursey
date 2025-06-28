# app/routers/post.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from typing import List
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

from app.schemas.post import PostCreate, PostOut, PostUpdate
from app.crud.post import (
    create_post,
    list_posts,
    get_post,
    update_post,
    delete_post,
    pin_post,
    unpin_post,
    move_up,
    move_down
)
from app.services.auth import get_current_active_user
from app.schemas.user import UserDB
from app.schemas.activity import ActivityLogCreate
from app.crud.activity import create_activity_log
from app.db.mongodb import posts_collection

router = APIRouter(
    prefix="/courses/{course_id}/posts",
    tags=["posts"],
    dependencies=[Depends(get_current_active_user)]
)


@router.get("/", response_model=List[PostOut])
async def api_list_posts(
    course_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    posts = await list_posts(course_id)

    # Log "list_posts" activity
    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="list_posts",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "count": len(posts)}
    ))

    return posts


@router.post("/", response_model=PostOut)
async def api_create_post(
    course_id: str,
    post_in: PostCreate,
    current_user: UserDB = Depends(get_current_active_user)
):
    post = await create_post(course_id, current_user.id, post_in)

    # Log "create_post" activity
    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="create_post",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "post_id": post.id}
    ))

    return post


@router.get("/{post_id}", response_model=PostOut)
async def api_get_post(
    course_id: str,
    post_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    post = await get_post(post_id)
    if not post or post.course_id != course_id:
        raise HTTPException(status_code=404, detail="Post not found")

    # Log "view_post" activity
    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="view_post",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "post_id": post_id}
    ))

    return post


@router.put("/{post_id}", response_model=PostOut)
async def api_update_post(
    course_id: str,
    post_id: str,
    post_in: PostUpdate,
    current_user: UserDB = Depends(get_current_active_user)
):
    updated = await update_post(post_id, post_in)
    if not updated or updated.course_id != course_id:
        raise HTTPException(status_code=404, detail="Post not found")

    # Log "update_post" activity
    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="update_post",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "post_id": post_id}
    ))

    return updated


@router.delete("/{post_id}", response_model=dict)
async def api_delete_post(
    course_id: str,
    post_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    ok = await delete_post(post_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Post not found")

    # Log "delete_post" activity
    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="delete_post",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "post_id": post_id}
    ))

    return {"deleted": True}


@router.patch("/{post_id}/pin", response_model=PostOut)
async def api_pin_post(
    course_id: str,
    post_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    pinned = await pin_post(post_id)
    if not pinned or pinned.course_id != course_id:
        raise HTTPException(status_code=404, detail="Post not found")

    # Log "pin_post" activity
    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="pin_post",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "post_id": post_id}
    ))

    return pinned


@router.patch("/{post_id}/unpin", response_model=PostOut)
async def api_unpin_post(
    course_id: str,
    post_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    unp = await unpin_post(post_id)
    if not unp or unp.course_id != course_id:
        raise HTTPException(status_code=404, detail="Post not found")

    # Log "unpin_post" activity
    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="unpin_post",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "post_id": post_id}
    ))

    return unp


@router.patch("/{post_id}/moveUp", response_model=PostOut)
async def api_move_up(
    course_id: str,
    post_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    moved = await move_up(post_id)
    if not moved or moved.course_id != course_id:
        raise HTTPException(status_code=404, detail="Post not found")

    # Log "move_up_post" activity
    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="move_up_post",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "post_id": post_id}
    ))

    return moved


@router.patch("/{post_id}/moveDown", response_model=PostOut)
async def api_move_down(
    course_id: str,
    post_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    moved = await move_down(post_id)
    if not moved or moved.course_id != course_id:
        raise HTTPException(status_code=404, detail="Post not found")

    # Log "move_down_post" activity
    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="move_down_post",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "post_id": post_id}
    ))

    return moved


@router.post(
    "/upload",
    response_model=dict,
    summary="Upload a file to GridFS and return its file_id"
)
async def upload_file_to_gridfs(
    course_id: str,
    file: UploadFile = File(...)
):
    bucket = AsyncIOMotorGridFSBucket(posts_collection.database)
    data = await file.read()
    # this returns a Motor ObjectId
    gridfs_id = await bucket.upload_from_stream(file.filename, data)

    return {"file_id": str(gridfs_id)}

@router.post("/{post_id}/upload", response_model=dict)
async def upload_post_file(
    course_id: str,
    post_id: str,
    file: UploadFile = File(...)
):
    """
    Upload a file into GridFS, attach its ID and original filename to the Post,
    and return {"file_id": "...", "file_name": "..."}.
    """
    bucket = AsyncIOMotorGridFSBucket(posts_collection.database)
    grid_in = bucket.open_upload_stream(file.filename)   # no await here
    contents = await file.read()
    await grid_in.write(contents)
    await grid_in.close()
    file_id = grid_in._id

    # store file_id + file_name in the post document
    await posts_collection.update_one(
        {"_id": ObjectId(post_id)},
        {
          "$set": {
            "file_id":    ObjectId(file_id),
            "file_name":  file.filename,
            "updated_at": datetime.utcnow()
          }
        }
    )

    return {"file_id": str(file_id), "file_name": file.filename}


@router.get("/{post_id}/files/{file_id}")
async def get_post_file(
    course_id: str,
    post_id: str,
    file_id: str
):
    """
    Stream the file from GridFS with a Content-Disposition header so browsers
    will download it with the correct name.
    """
    bucket = AsyncIOMotorGridFSBucket(posts_collection.database)
    grid_out = await bucket.open_download_stream(ObjectId(file_id))
    data = await grid_out.read()
    return Response(
      content=data,
      media_type="application/octet-stream",
      headers={
        "Content-Disposition": f'attachment; filename="{grid_out.filename}"'
      }
    )