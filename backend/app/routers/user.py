# /app/routers/user.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.crud.user import (
    get_user_by_id,
    list_users,
    update_user,
    list_enrollments,
    add_enrollment,
    remove_enrollment
)
from app.schemas.user import UserOut, Profile, Enrollment
from app.services.auth import get_current_active_user

router = APIRouter(
    prefix="/users",
    tags=["users"],
    # all routes require a valid JWT
    dependencies=[Depends(get_current_active_user)]
)

@router.get("/me", response_model=UserOut)
async def read_current_user(current_user=Depends(get_current_active_user)):
    """Return the profile of the logged‐in user."""
    return current_user

@router.get("/", response_model=List[UserOut])
async def read_users():
    """List all users."""
    return await list_users()

@router.get("/{user_id}", response_model=UserOut)
async def read_user(user_id: str):
    """Get a single user by ID."""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserOut)
async def update_user_profile(
    user_id: str,
    profile: Profile,
    current_user=Depends(get_current_active_user)
):
    """
    Update profile for the given user.
    Only the user themself may update their profile.
    """
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot update another user's profile")
    updated = await update_user(user_id, profile)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated

@router.get("/{user_id}/enrollments", response_model=List[Enrollment])
async def get_enrollments(user_id: str):
    """
    List all enrollments for a user.
    Any authenticated user may view enrollments.
    """
    return await list_enrollments(user_id)

@router.post("/{user_id}/enrollments", response_model=Enrollment)
async def enroll_course(user_id: str, data: dict):
    """
    Enroll the user in a course.
    Expects JSON {"courseId": "<course_id>"}.
    """
    course_id = data.get("courseId")
    if not course_id:
        raise HTTPException(status_code=400, detail="courseId required")
    return await add_enrollment(user_id, course_id)

@router.delete("/{user_id}/enrollments/{course_id}", response_model=dict)
async def unenroll_course(user_id: str, course_id: str):
    """
    Remove the user's enrollment from a course.
    """
    success = await remove_enrollment(user_id, course_id)
    if not success:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return {"un-enrolled": True}
