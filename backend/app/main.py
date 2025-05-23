# /app/main.py
from fastapi import FastAPI
from app.routers import auth

app = FastAPI()
app.include_router(auth.router)
