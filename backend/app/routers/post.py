# app/routers/post.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.schemas.post import PostCreate, PostOut, PostUpdate
from app.crud.post import (
    create_post, list_posts, get_post, update_post, delete_post,
    pin_post, unpin_post, move_up, move_down
)
from app.services.auth import get_current_active_user
from app.schemas.user import UserDB

router = APIRouter(
    prefix="/courses/{course_id}/posts",
    tags=["posts"],
    dependencies=[Depends(get_current_active_user)]
)

@router.get("/", response_model=List[PostOut])
async def api_list_posts(course_id: str):
    return await list_posts(course_id)

@router.post("/", response_model=PostOut)
async def api_create_post(
    course_id:    str,
    post_in:      PostCreate,
    current_user: UserDB = Depends(get_current_active_user)
):
    return await create_post(course_id, current_user.id, post_in)

@router.get("/{post_id}", response_model=PostOut)
async def api_get_post(course_id: str, post_id: str):
    post = await get_post(post_id)
    if not post or post.course_id != course_id:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@router.put("/{post_id}", response_model=PostOut)
async def api_update_post(
    course_id:    str,
    post_id:      str,
    post_in:      PostUpdate,
    current_user: UserDB = Depends(get_current_active_user)
):
    updated = await update_post(post_id, post_in)
    if not updated or updated.course_id != course_id:
        raise HTTPException(status_code=404, detail="Post not found")
    return updated

@router.delete("/{post_id}", response_model=dict)
async def api_delete_post(
    course_id:    str,
    post_id:      str,
    current_user: UserDB = Depends(get_current_active_user)
):
    ok = await delete_post(post_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"deleted": True}

@router.patch("/{post_id}/pin", response_model=PostOut)
async def api_pin_post(
    course_id:    str,
    post_id:      str,
    current_user: UserDB = Depends(get_current_active_user)
):
    pinned = await pin_post(post_id)
    if not pinned or pinned.course_id != course_id:
        raise HTTPException(status_code=404, detail="Post not found")
    return pinned

@router.patch("/{post_id}/unpin", response_model=PostOut)
async def api_unpin_post(
    course_id:    str,
    post_id:      str,
    current_user: UserDB = Depends(get_current_active_user)
):
    unp = await unpin_post(post_id)
    if not unp or unp.course_id != course_id:
        raise HTTPException(status_code=404, detail="Post not found")
    return unp

@router.patch("/{post_id}/moveUp", response_model=PostOut)
async def api_move_up(
    course_id:    str,
    post_id:      str,
    current_user: UserDB = Depends(get_current_active_user)
):
    moved = await move_up(post_id)
    if not moved or moved.course_id != course_id:
        raise HTTPException(status_code=404, detail="Post not found")
    return moved

@router.patch("/{post_id}/moveDown", response_model=PostOut)
async def api_move_down(
    course_id:    str,
    post_id:      str,
    current_user: UserDB = Depends(get_current_active_user)
):
    moved = await move_down(post_id)
    if not moved or moved.course_id != course_id:
        raise HTTPException(status_code=404, detail="Post not found")
    return moved
