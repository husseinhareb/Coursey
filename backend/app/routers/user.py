# /app/routers/user.py

from fastapi import APIRouter, Depends, HTTPException, Body, Query, status
from typing import List
from datetime import datetime

from app.crud.user import (
    get_user_by_id,
    list_users,
    update_user,
    list_enrollments,
    add_enrollment,
    remove_enrollment,
    delete_user,
    list_accesses,         # <— make sure this is imported
)
from app.schemas.user import UserOut, Profile, Enrollment, Access       # <— and Access
from app.services.auth import get_current_active_user
from app.schemas.user import UserDB

from app.schemas.activity import ActivityLogCreate
from app.crud.activity import create_activity_log

from pydantic import BaseModel, Field

from app.crud.user import change_user_password

router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(get_current_active_user)]
)

@router.get("/me", response_model=UserOut)
async def read_current_user(current_user: UserDB = Depends(get_current_active_user)):
    """
    Return the profile of the logged‐in user.
    """
    # Log "view_own_profile" activity
    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="view_own_profile",
        timestamp=datetime.utcnow(),
        metadata={}
    ))
    return current_user

# --- NEW ENDPOINT: GET /users/me/accesses?limit=10 ---
@router.get(
    "/me/accesses",
    response_model=List[Access],
    summary="Get your recently accessed courses",
    description="Returns up to `limit` past course accesses, most‐recent first."
)
async def read_my_accesses(
    limit: int = Query(10, gt=0, description="Maximum number of entries to return"),
    current_user: UserDB = Depends(get_current_active_user)
):
    """
    Fetch the current user's most recent course accesses,
    sorted descending by accessedAt timestamp.
    """
    accesses = await list_accesses(current_user.id, limit)
    # Log activity
    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="list_accesses",
        timestamp=datetime.utcnow(),
        metadata={"limit": limit}
    ))
    return accesses
# --- END NEW ENDPOINT ---

@router.get("/", response_model=List[UserOut])
async def read_users(current_user: UserDB = Depends(get_current_active_user)):
    """
    List all users.
    """
    users = await list_users()
    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="list_users",
        timestamp=datetime.utcnow(),
        metadata={"count": len(users)}
    ))
    return users

@router.get("/{user_id}", response_model=UserOut)
async def read_user(
    user_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    """
    Get a single user by ID.
    """
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="view_user",
        timestamp=datetime.utcnow(),
        metadata={"target_user_id": user_id}
    ))
    return user

@router.put("/{user_id}", response_model=UserOut)
async def update_user_profile(
    user_id: str,
    profile: Profile,
    current_user: UserDB = Depends(get_current_active_user)
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

    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="update_user_profile",
        timestamp=datetime.utcnow(),
        metadata={"user_id": user_id}
    ))
    return updated

@router.get("/{user_id}/enrollments", response_model=List[Enrollment])
async def get_enrollments(
    user_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    """
    List all enrollments for a user.
    Any authenticated user may view enrollments.
    """
    enrollments = await list_enrollments(user_id)
    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="list_enrollments",
        timestamp=datetime.utcnow(),
        metadata={"user_id": user_id, "count": len(enrollments)}
    ))
    return enrollments

@router.post("/{user_id}/enrollments", response_model=Enrollment)
async def enroll_course(
    user_id: str,
    data: dict = Body(...),
    current_user: UserDB = Depends(get_current_active_user)
):
    """
    Enroll the user in a course.
    Expects JSON {"courseId": "<course_id>"}.
    """
    course_id = data.get("courseId")
    if not course_id:
        raise HTTPException(status_code=400, detail="courseId required")

    enrollment = await add_enrollment(user_id, course_id)
    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="enroll_course",
        timestamp=datetime.utcnow(),
        metadata={"user_id": user_id, "course_id": course_id}
    ))
    return enrollment

@router.delete("/{user_id}/enrollments/{course_id}", response_model=dict)
async def unenroll_course(
    user_id: str,
    course_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    """
    Remove the user's enrollment from a course.
    """
    success = await remove_enrollment(user_id, course_id)
    if not success:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    await create_activity_log(ActivityLogCreate(
        user_id=current_user.id,
        action="unenroll_course",
        timestamp=datetime.utcnow(),
        metadata={"user_id": user_id, "course_id": course_id}
    ))
    return {"un-enrolled": True}

@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_user_endpoint(
    user_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    """
    Delete a user (admins only).
    """
    if "admin" not in [r.lower() for r in current_user.roles]:
        raise HTTPException(status_code=403, detail="Only admins can delete users")

    success = await delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return

class ChangePwdIn(BaseModel):
    oldPassword: str = Field(..., description="Current password")
    newPassword: str = Field(..., description="Desired new password")

@router.post(
    "/{user_id}/password",
    status_code=status.HTTP_204_NO_CONTENT
)
async def change_password_endpoint(
    user_id: str,
    data: ChangePwdIn = Body(...),
    current_user: UserDB = Depends(get_current_active_user)
):
    """
    Change the user's password.
    """
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot change another user's password")

    ok = await change_user_password(user_id, data.oldPassword, data.newPassword)
    if not ok:
        raise HTTPException(status_code=400, detail="Old password incorrect or user not found")
    return
