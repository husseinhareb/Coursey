# /app/routers/auth.py

from fastapi import APIRouter, HTTPException, Depends
from app.schemas.user import UserIn, LoginIn, Token, UserDB
from app.crud.user import create_user, authenticate_user
from app.services.auth import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=Token)
async def signup(user_in: UserIn):
    user = await create_user(user_in)
    if not user:
        raise HTTPException(status_code=400, detail="Email already registered")
    # user.id is the stringified ObjectId from UserDB
    access_token = create_access_token({"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(credentials: LoginIn):
    user: UserDB = await authenticate_user(credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access_token = create_access_token({"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}
