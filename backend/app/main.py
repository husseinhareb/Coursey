# /app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, course, user, post, submission, files
from app.routers.activity import router as activity_router
from app.routers.forum import router as forum_router

app = FastAPI()

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

app.include_router(auth.router)
app.include_router(course.router)
app.include_router(user.router)
app.include_router(post.router)
app.include_router(submission.router)
app.include_router(files.router)
app.include_router(activity_router)
app.include_router(forum_router) 
