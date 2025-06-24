# app/routers/dashboard.py

from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId

from app.services.auth import get_current_active_user
from app.schemas.user import UserDB

from app.db.mongodb import (
    users_collection,
    courses_collection,
    posts_collection,
    submissions_collection,
    activity_logs_collection
)

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(get_current_active_user)]
)

@router.get("/overview", response_model=Dict[str, Any])
async def get_overview(current_user: UserDB = Depends(get_current_active_user)):
    # only admins
    if "admin" not in [r.lower() for r in current_user.roles]:
        return {"error": "Forbidden"}

    # total counts
    total_users       = await users_collection.count_documents({})
    total_courses     = await courses_collection.count_documents({})
    total_posts       = await posts_collection.count_documents({})
    # submissions by status
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    subs_stats = {doc["_id"]: doc["count"] 
                  for doc in await submissions_collection.aggregate(pipeline).to_list(length=None)}
    # activity counts (last 7 days, grouped by action)
    week_ago = datetime.utcnow() - timedelta(days=7)
    pipeline2 = [
        {"$match": {"timestamp": {"$gte": week_ago}}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}}
    ]
    activity_stats = {doc["_id"]: doc["count"]
                      for doc in await activity_logs_collection.aggregate(pipeline2).to_list(length=None)}

    return {
        "totals": {
            "users":   total_users,
            "courses": total_courses,
            "posts":   total_posts
        },
        "submissions": subs_stats,
        "activityLast7Days": activity_stats
    }
