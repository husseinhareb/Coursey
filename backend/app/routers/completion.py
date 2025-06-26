# app/routers/completion.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.schemas.completion import Completion, CompletionCreate
from app.crud.completion import (
    create_completion,
    delete_completion,
    list_completions
)
from app.services.auth import get_current_active_user
from app.schemas.user import UserDB

router = APIRouter(
    prefix="/courses",
    tags=["completions"],
    dependencies=[Depends(get_current_active_user)]
)

@router.post(
    "/{course_id}/posts/{post_id}/complete",
    response_model=Completion,
    status_code=status.HTTP_201_CREATED
)
async def mark_post_complete(
    course_id: str,
    post_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    try:
        return await create_completion(current_user.id, course_id, post_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete(
    "/{course_id}/posts/{post_id}/complete",
    status_code=status.HTTP_204_NO_CONTENT
)
async def unmark_post_complete(
    course_id: str,
    post_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    success = await delete_completion(current_user.id, course_id, post_id)
    if not success:
        raise HTTPException(status_code=404, detail="Completion not found")

@router.get(
    "/{course_id}/completions",
    response_model=List[Completion]
)
async def get_course_completions(
    course_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    return await list_completions(current_user.id, course_id)
