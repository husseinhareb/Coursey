# /app/routers/user.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.crud.user import get_user_by_id, list_users, update_user
from app.schemas.user import UserOut, Profile
from app.services.auth import get_current_active_user

router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(get_current_active_user)]
)

@router.get("/me", response_model=UserOut)
async def read_current_user(current_user=Depends(get_current_active_user)):
    return current_user

@router.get("/", response_model=List[UserOut])
async def read_users():
    return await list_users()

@router.get("/{user_id}", response_model=UserOut)
async def read_user(user_id: str):
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
    # only allow updating your own profile (or add extra checks for admins)
    if user_id != current_user.id:
        raise HTTPException(403, "Cannot update another user's profile")
    updated = await update_user(user_id, profile)
    if not updated:
        raise HTTPException(404, "User not found")
    return updated
