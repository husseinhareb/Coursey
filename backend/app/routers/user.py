# /app/routers/user.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.crud.user import get_user_by_id, list_users
from app.schemas.user import UserOut
from app.services.auth import get_current_active_user

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserOut)
async def read_current_user(current_user=Depends(get_current_active_user)):
    """Get your own profile info."""
    return current_user

@router.get("/", response_model=List[UserOut])
async def read_users(current_user=Depends(get_current_active_user)):
    """Get a list of all users."""
    return await list_users()

@router.get("/{user_id}", response_model=UserOut)
async def read_user(user_id: str, current_user=Depends(get_current_active_user)):
    """Get another user’s profile by ID."""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
