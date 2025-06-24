# app/routers/dashboard.py

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
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
    roles = [r.lower() for r in current_user.roles]
    now = datetime.utcnow()

    if "admin" in roles:
        # — Admin sees global KPIs
        totals = {
            "users":   await users_collection.count_documents({}),
            "courses": await courses_collection.count_documents({}),
            "posts":   await posts_collection.count_documents({})
        }
        # submissions by status
        agg = await submissions_collection.aggregate([
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]).to_list(length=None)
        subs = {d["_id"]: d["count"] for d in agg}

        # activity last 7d
        week_ago = now - timedelta(days=7)
        agg2 = await activity_logs_collection.aggregate([
            {"$match": {"timestamp": {"$gte": week_ago}}},
            {"$group": {"_id": "$action", "count": {"$sum": 1}}}
        ]).to_list(length=None)
        acts = {d["_id"]: d["count"] for d in agg2}

        return {
            "role": "admin",
            "totals": totals,
            "submissions": subs,
            "activityLast7Days": acts
        }

    elif "professor" in roles:
        # — Teacher sees courses they created + enrolled counts
        created_cursor = courses_collection.find({"created_by": ObjectId(current_user.id)})
        out: List[Dict[str, Any]] = []
        async for c in created_cursor:
            cid = str(c["_id"])
            title = c["title"]
            code  = c["code"]
            # count enrolled users
            count = await users_collection.count_documents({"enrollments.courseId": ObjectId(cid)})
            out.append({"id": cid, "title": title, "code": code, "enrolledCount": count})
        return {"role": "teacher", "coursesCreated": out}

    else:
        # — Student sees enrolled courses + progress
        # 1) list enrollments
        enrolled = current_user.enrollments
        courses = []
        for e in enrolled:
            cid = e.courseId
            # fetch course info
            c = await courses_collection.find_one({"_id": ObjectId(cid)})
            if not c: continue
            title = c["title"]
            code  = c["code"]
            # compute progress: viewed posts / total posts
            total_posts = await posts_collection.count_documents({"course_id": ObjectId(cid)})
            # count "view_post" in activity_logs for this user/course
            viewed_agg = await activity_logs_collection.aggregate([
                {"$match": {
                    "user_id": ObjectId(current_user.id),
                    "action": "view_post",
                    "metadata.course_id": cid
                }},
                {"$group": {"_id": None, "count": {"$sum": 1}}}
            ]).to_list(length=1)
            viewed = viewed_agg[0]["count"] if viewed_agg else 0
            percent = int((viewed / total_posts) * 100) if total_posts > 0 else 0
            courses.append({
                "id": cid,
                "title": title,
                "code": code,
                "progress": percent
            })
        return {"role": "student", "enrolledCourses": courses}
