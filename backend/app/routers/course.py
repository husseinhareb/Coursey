# /app/routers/course.py

from fastapi import APIRouter, HTTPException, Depends
from typing import List

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


from app.schemas.course import CourseOut
from app.schemas.user import EnrollmentUser
router = APIRouter(
    prefix="/courses",
    tags=["courses"],
    # enforce authentication on every route in this router
    dependencies=[Depends(get_current_active_user)]
)


@router.post("/", response_model=CourseOut)
async def api_create_course(
    course_in: CourseCreate,
    current_user: UserDB = Depends(get_current_active_user),
):
    return await create_course(course_in, created_by=current_user.id)


@router.get("/", response_model=List[CourseOut])
async def api_list_courses():
    return await list_courses()


@router.get("/{course_id}", response_model=CourseOut)
async def api_get_course(course_id: str):
    course = await get_course(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
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
    return updated


@router.delete("/{course_id}", response_model=dict)
async def api_delete_course(
    course_id: str,
    current_user: UserDB = Depends(get_current_active_user),
):
    success = await delete_course(course_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"deleted": True}


@router.get("/{course_id}/enrolled", response_model=List[EnrollmentUser])
async def api_list_enrolled_users(
    course_id: str,
    current_user: UserDB = Depends(get_current_active_user)
):
    """
    Return a list of “EnrollmentUser” (id, email, first_name, last_name)
    for everyone who is enrolled in the given course.
    """
    return await list_users_by_course(course_id)