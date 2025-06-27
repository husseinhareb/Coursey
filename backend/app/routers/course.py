# /app/routers/course.py

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from datetime import datetime

from app.schemas.course import CourseCreate, CourseOut
from app.crud.course import (
    create_course,
    get_course,
    list_courses,
    list_courses_by_user,
    update_course,
    delete_course
)
from app.services.auth import get_current_active_user
from app.schemas.user import UserDB

from app.schemas.activity import ActivityLogCreate
from app.crud.activity import create_activity_log

from app.crud.user import add_enrollment, list_users_by_course
from app.crud.user import upsert_access
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
    # Seuls les admins peuvent créer des cours
    roles_lower = [r.lower() for r in current_user.roles]
    if "admin" not in roles_lower:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les admins peuvent créer des cours."
        )

    course = await create_course(course_in, created_by=current_user.id)

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
    """
    - Si l'utilisateur est admin → renvoie tous les cours.
    - Si c'est un teacher ou student → renvoie seulement les cours où il est inscrit.
    """
    roles_lower = [r.lower() for r in current_user.roles]
    if "admin" in roles_lower:
        courses = await list_courses()
    else:
        courses = await list_courses_by_user(current_user.id)

    log = ActivityLogCreate(
        user_id=current_user.id,
        action="list_courses",
        timestamp=datetime.utcnow(),
        metadata={"count": len(courses)}
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

    # Si non-admin, vérifier qu'il est inscrit à ce cours
    roles_lower = [r.lower() for r in current_user.roles]
    if "admin" not in roles_lower:
        enrolled_ids = [e.courseId for e in current_user.enrollments]
        if course_id not in enrolled_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'êtes pas autorisé à voir ce cours."
            )

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
    # Seuls les admins peuvent mettre à jour un cours
    roles_lower = [r.lower() for r in current_user.roles]
    if "admin" not in roles_lower:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les admins peuvent modifier un cours."
        )

    updated = await update_course(course_id, course_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Course not found")

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
    # Seuls les admins peuvent supprimer un cours
    roles_lower = [r.lower() for r in current_user.roles]
    if "admin" not in roles_lower:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les admins peuvent supprimer un cours."
        )

    success = await delete_course(course_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course not found")

    log = ActivityLogCreate(
        user_id=current_user.id,
        action="delete_course",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id}
    )
    await create_activity_log(log)
    return {"deleted": True}


@router.post("/{course_id}/enroll", response_model=dict)
async def api_enroll_in_course(
    course_id: str,
    current_user: UserDB = Depends(get_current_active_user),
):
    # Empêcher l'admin de s'inscrire à un cours
    roles_lower = [r.lower() for r in current_user.roles]
    if "admin" in roles_lower:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Les admins ne peuvent pas s'inscrire à un cours."
        )

    # Vérifier s'il est déjà inscrit
    already = [e.courseId for e in current_user.enrollments]
    if course_id in already:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous êtes déjà inscrit à ce cours."
        )

    # Ajouter l'enrollment dans l'utilisateur (ajoute aussi le champ enrolledAt)
    await add_enrollment(current_user.id, course_id)

    log = ActivityLogCreate(
        user_id=current_user.id,
        action="enroll_course",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id}
    )
    await create_activity_log(log)
    return {"enrolled": True}


@router.get("/{course_id}/enrolled", response_model=List[dict])
async def api_list_enrolled_users(
    course_id: str,
    current_user: UserDB = Depends(get_current_active_user),
):
    # Seuls les admins et les teachers inscrits peuvent voir la liste des inscrits
    roles_lower = [r.lower() for r in current_user.roles]

    if "admin" not in roles_lower:
        # S'assurer qu'il est inscrit ET qu'il a le rôle "teacher" pour ce cours
        matching = [e for e in current_user.enrollments if e.courseId == course_id]
        if not matching:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'êtes pas inscrit à ce cours."
            )
        # Si son rôle global n'inclut pas "teacher", on refuse
        if "teacher" not in roles_lower:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seuls l'admin ou le teacher du cours peuvent voir la liste des inscrits."
            )

    enrolled = await list_users_by_course(course_id)

    log = ActivityLogCreate(
        user_id=current_user.id,
        action="list_enrolled_users",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "count": len(enrolled)}
    )
    await create_activity_log(log)
    return enrolled

@router.get("/{course_id}", response_model=CourseOut)
async def read_course(
    course_id: str,
    current_user: UserDB = Depends(get_current_active_user),
):
    course = await get_course(course_id)
    if not course:
        raise HTTPException(404, "Course not found")

    # Record the access
    await upsert_access(current_user.id, course_id)

    return course