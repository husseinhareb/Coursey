# /app/routers/auth.py

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime

from app.schemas.user import SignupIn, LoginIn, Token, UserDB
from app.crud.user import create_user, authenticate_user
from app.services.auth import create_access_token, get_current_active_user

from app.schemas.activity import ActivityLogCreate
from app.crud.activity import create_activity_log

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=Token)
async def signup(data: SignupIn):
    # 1) Create the user
    user = await create_user(
        email=data.email,
        raw_password=data.password,
        profile=data.profile,
        roles=data.roles
    )
    if not user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2) Issue a JWT token
    token = create_access_token({"sub": user.id})

    # 3) Log the "signup" activity
    log = ActivityLogCreate(
        user_id=user.id,
        action="signup",
        timestamp=datetime.utcnow(),
        metadata={"email": data.email}
    )
    await create_activity_log(log)

    return {"access_token": token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(credentials: LoginIn):
    # 1) Authenticate the user
    user: UserDB = await authenticate_user(credentials.email, credentials.password)
    if not user:
        # Log failed login attempt with a placeholder user_id
        log_fail = ActivityLogCreate(
            user_id="anonymous",
            action="login_failed",
            timestamp=datetime.utcnow(),
            metadata={"email": credentials.email}
        )
        await create_activity_log(log_fail)

        raise HTTPException(status_code=401, detail="Invalid email or password")

    # 2) Issue a JWT token
    token = create_access_token({"sub": user.id})

    # 3) Log the successful "login" activity
    log = ActivityLogCreate(
        user_id=user.id,
        action="login",
        timestamp=datetime.utcnow(),
        metadata={"email": credentials.email}
    )
    await create_activity_log(log)

    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=UserDB)
async def me(current: UserDB = Depends(get_current_active_user)):
    return current
