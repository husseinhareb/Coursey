# /app/routers/course.py

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime

from app.schemas.course import CourseCreate, CourseOut
from app.crud.course import (
    create_course,
    get_course,
    list_courses,
    update_course,
    delete_course
)
from app.services.auth import get_current_active_user
from app.schemas.user import UserDB
from app.crud.user import list_users_by_course
from app.schemas.user import EnrollmentUser

from app.schemas.activity import ActivityLogCreate
from app.crud.activity import create_activity_log

router = APIRouter(
    prefix="/courses",
    tags=["courses"],
    dependencies=[Depends(get_current_active_user)]
)


@router.post("/", response_model=CourseOut)
async def api_create_course(
    course_in: CourseCreate,
    current_user: UserDB = Depends(get_current_active_user),
):
    # 1) Create the course
    course = await create_course(course_in, created_by=current_user.id)

    # 2) Log "create_course" activity
    log = ActivityLogCreate(
        user_id=current_user.id,
        action="create_course",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course.id, "title": course.title}
    )
    await create_activity_log(log)

    return course


@router.get("/", response_model=List[CourseOut])
async def api_list_courses(
    current_user: UserDB = Depends(get_current_active_user),
):
    # 1) Retrieve all courses
    courses = await list_courses()

    # 2) Log "list_courses" activity
    log = ActivityLogCreate(
        user_id=current_user.id,
        action="list_courses",
        timestamp=datetime.utcnow(),
        metadata={}
    )
    await create_activity_log(log)

    return courses


@router.get("/{course_id}", response_model=CourseOut)
async def api_get_course(
    course_id: str,
    current_user: UserDB = Depends(get_current_active_user),
):
    course = await get_course(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Log "view_course" activity
    log = ActivityLogCreate(
        user_id=current_user.id,
        action="view_course",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id}
    )
    await create_activity_log(log)

    return course


@router.put("/{course_id}", response_model=CourseOut)
async def api_update_course(
    course_id: str,
    course_in: CourseCreate,
    current_user: UserDB = Depends(get_current_active_user),
):
    updated = await update_course(course_id, course_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Course not found")

    # Log "update_course" activity
    log = ActivityLogCreate(
        user_id=current_user.id,
        action="update_course",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "updated_title": updated.title}
    )
    await create_activity_log(log)

    return updated


@router.delete("/{course_id}", response_model=dict)
async def api_delete_course(
    course_id: str,
    current_user: UserDB = Depends(get_current_active_user),
):
    success = await delete_course(course_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course not found")

    # Log "delete_course" activity
    log = ActivityLogCreate(
        user_id=current_user.id,
        action="delete_course",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id}
    )
    await create_activity_log(log)

    return {"deleted": True}


@router.get("/{course_id}/enrolled", response_model=List[EnrollmentUser])
async def api_list_enrolled_users(
    course_id: str,
    current_user: UserDB = Depends(get_current_active_user),
):
    enrolled = await list_users_by_course(course_id)

    # Log "list_enrolled_users" activity
    log = ActivityLogCreate(
        user_id=current_user.id,
        action="list_enrolled_users",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "count": len(enrolled)}
    )
    await create_activity_log(log)

    return enrolled
