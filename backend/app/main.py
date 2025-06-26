# /app/main.py

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.mongodb import users_collection
from app.schemas.user import Profile
from app.crud.user import create_user

from app.routers import auth, course, user, post, submission, files
from app.routers.activity import router as activity_router
from app.routers.forum import router as forum_router
from app.routers.dashboard import router as dashboard_router
from app.routers.completion import router as completion_router

logger = logging.getLogger("uvicorn.error")

app = FastAPI()

# CORS settings
origins = [
    "http://localhost:4200",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def seed_admin_user():
    """
    On first startup, if no users exist, create a default admin account.
    """
    count = await users_collection.count_documents({})
    if count == 0:
        email = "admin@coursey.com"
        raw_pw = "admincoursey"
        profile = Profile(
            firstName="Admin",
            lastName="Coursey",
            profilePic=None,
            phoneNumber=None,
            address=None
        )
        try:
            new_admin = await create_user(email, raw_pw, profile, roles=["admin"])
            if new_admin:
                logger.info(f"Seeded initial admin user: {email}")
            else:
                logger.warning(f"Admin seeding skipped: user {email} already exists")
        except Exception as e:
            logger.error(f"Failed to seed admin user: {e}")

# Include all routers
app.include_router(auth.router)
app.include_router(course.router)
app.include_router(user.router)
app.include_router(post.router)
app.include_router(submission.router)
app.include_router(files.router)
app.include_router(activity_router)
app.include_router(forum_router)
app.include_router(dashboard_router)
app.include_router(completion_router)
