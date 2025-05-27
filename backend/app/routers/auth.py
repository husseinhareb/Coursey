# /app/routers/auth.py
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.user import UserIn, Token
from app.crud.user import create_user, authenticate_user
from app.services.auth import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=Token)
async def signup(user_in: UserIn):
    user = await create_user(user_in)
    if not user:
        raise HTTPException(status_code=400, detail="Email already registered")
    access_token = create_access_token({"sub": str(user["_id"])})
    return {"access_token": access_token, "token_type": "bearer"} 