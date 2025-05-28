# /app/routers/auth.py

from fastapi import APIRouter, HTTPException, Depends
from app.schemas.user import SignupIn, LoginIn, Token, UserDB
from app.crud.user import create_user, authenticate_user
from app.services.auth import create_access_token, get_current_active_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=Token)
async def signup(data: SignupIn):
    # create_user now takes (email, raw_password, profile, roles)
    user = await create_user(
        email=data.email,
        raw_password=data.password,
        profile=data.profile,
        roles=data.roles
    )
    if not user:
        raise HTTPException(status_code=400, detail="Email already registered")
    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(credentials: LoginIn):
    user: UserDB = await authenticate_user(credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=UserDB)
async def me(current: UserDB = Depends(get_current_active_user)):
    return current
