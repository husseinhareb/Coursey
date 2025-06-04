# /app/crud/course.py

from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import db
from app.schemas.course import CourseCreate, CourseDB

from app.crud.user import list_enrollments  # pour récupérer les enrollments de l'utilisateur

courses_collection = db.get_collection("courses")


async def create_course(course_in: CourseCreate, created_by: str) -> CourseDB:
    now = datetime.utcnow()
    doc = course_in.model_dump()
    doc.update({
        "created_at": now,
        "updated_at": now,
        "created_by": created_by
    })
    result = await courses_collection.insert_one(doc)
    created = await courses_collection.find_one({"_id": result.inserted_id})
    created["_id"] = str(created["_id"])
    return CourseDB(**created)


async def get_course(course_id: str) -> Optional[CourseDB]:
    doc = await courses_collection.find_one({"_id": ObjectId(course_id)})
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])
    return CourseDB(**doc)


async def list_courses() -> List[CourseDB]:
    """
    Liste tous les cours, triés par date de création descendante.
    (Utilisé par les admins.)
    """
    out: List[CourseDB] = []
    cursor = courses_collection.find().sort("created_at", -1)
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        out.append(CourseDB(**doc))
    return out


async def list_courses_by_user(user_id: str) -> List[CourseDB]:
    """
    Liste uniquement les cours pour lesquels l'utilisateur est inscrit.
    On lit d'abord les enrollments de l'utilisateur, puis on récupère
    chaque cours correspondant.
    """
    # 1) Récupérer les enrollments de l'utilisateur
    enrolls = await list_enrollments(user_id)  # renvoie List[Enrollment]
    if not enrolls:
        return []

    # 2) Extraire les courseIds valides
    course_ids = [
        ObjectId(e.courseId) if ObjectId.is_valid(e.courseId) else e.courseId
        for e in enrolls
    ]

    # 3) Requête Mongo pour récupérer tous les cours de la liste
    out: List[CourseDB] = []
    cursor = courses_collection.find({"_id": {"$in": course_ids}}).sort("created_at", -1)
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        out.append(CourseDB(**doc))
    return out


async def update_course(course_id: str, course_in: CourseCreate) -> Optional[CourseDB]:
    now = datetime.utcnow()
    update = {**course_in.model_dump(), "updated_at": now}
    result = await courses_collection.update_one(
        {"_id": ObjectId(course_id)},
        {"$set": update}
    )
    if result.matched_count == 0:
        return None
    return await get_course(course_id)


async def delete_course(course_id: str) -> bool:
    result = await courses_collection.delete_one({"_id": ObjectId(course_id)})
    return result.deleted_count == 1
