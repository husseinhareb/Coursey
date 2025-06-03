# /app/crud/user.py

from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import users_collection
from app.schemas.user import UserDB, Profile, Enrollment, Access, Alert

from app.schemas.user import UserOut
from app.schemas.user import EnrollmentUser


def _normalize_user_doc(doc: dict) -> UserDB:
    """Convert ObjectId fields to str and return a UserDB."""
    doc["_id"] = str(doc["_id"])

    # If roles were stored as plain strings, str(r) will just keep them unchanged.
    doc["roles"] = [str(r) for r in doc.get("roles", [])]

    doc["enrollments"] = [
        {"courseId": str(e["courseId"]), "enrolledAt": e["enrolledAt"]}
        for e in doc.get("enrollments", [])
    ]
    doc["accesses"] = [
        {"courseId": str(a["courseId"]), "accessedAt": a["accessedAt"]}
        for a in doc.get("accesses", [])
    ]
    doc["alerts"] = [
        {
            "alertId": str(al["alertId"]),
            "createdAt": al["createdAt"],
            "acknowledgedAt": al.get("acknowledgedAt")
        }
        for al in doc.get("alerts", [])
    ]
    return UserDB(**doc)


async def create_user(
    email: str,
    raw_password: str,
    profile: Profile,
    roles: Optional[List[str]] = None
) -> Optional[UserDB]:
    """Insert a new user; returns normalized UserDB or None if email exists."""
    if await users_collection.find_one({"email": email}):
        return None

    # import here to avoid circular
    from app.services.auth import hash_password

    now = datetime.utcnow()
    username = f"{profile.firstName[0].lower()}{profile.lastName.lower()}"

    user_doc = {
        "email":        email,
        "username":     username,
        "passwordHash": hash_password(raw_password),
        "profile":      profile.model_dump(),
        # ← Store incoming role‐strings directly
        "roles":        roles or [],
        "enrollments":  [],
        "accesses":     [],
        "alerts":       [],
        "createdAt":    now,
        "updatedAt":    now
    }

    res = await users_collection.insert_one(user_doc)
    doc = await users_collection.find_one({"_id": res.inserted_id})
    return _normalize_user_doc(doc)


async def authenticate_user(email: str, password: str) -> Optional[UserDB]:
    """Verify credentials; return normalized UserDB or None."""
    doc = await users_collection.find_one({"email": email})
    if not doc:
        return None

    # import here to avoid circular
    from app.services.auth import verify_password

    if not verify_password(password, doc.get("passwordHash", "")):
        return None

    return _normalize_user_doc(doc)


async def get_user_by_id(user_id: str) -> Optional[UserDB]:
    """Fetch a single user by ObjectId string."""
    doc = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not doc:
        return None
    return _normalize_user_doc(doc)


async def list_users() -> List[UserDB]:
    """Return all users, normalized and sorted by creation time desc."""
    out: List[UserDB] = []
    cursor = users_collection.find().sort("createdAt", -1)
    async for doc in cursor:
        out.append(_normalize_user_doc(doc))
    return out


async def update_user(user_id: str, profile: Profile) -> Optional[UserDB]:
    """Update only the profile & updatedAt, then return fresh UserDB."""
    now = datetime.utcnow()
    res = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"profile": profile.model_dump(), "updatedAt": now}}
    )
    if res.matched_count == 0:
        return None
    return await get_user_by_id(user_id)


async def list_enrollments(user_id: str) -> List[Enrollment]:
    """List a user’s enrollments."""
    doc = await users_collection.find_one(
        {"_id": ObjectId(user_id)},
        {"enrollments": 1}
    )
    if not doc:
        return []
    return [
        Enrollment(courseId=str(e["courseId"]), enrolledAt=e["enrolledAt"])
        for e in doc.get("enrollments", [])
    ]


async def add_enrollment(user_id: str, course_id: str) -> Enrollment:
    """Enroll a user in a course."""
    now = datetime.utcnow()
    entry = {"courseId": ObjectId(course_id), "enrolledAt": now}
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$push": {"enrollments": entry}}
    )
    return Enrollment(courseId=course_id, enrolledAt=now)


async def remove_enrollment(user_id: str, course_id: str) -> bool:
    """Remove a course from a user’s enrollments."""
    res = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"enrollments": {"courseId": ObjectId(course_id)}}}
    )
    return res.modified_count > 0


async def list_users_by_course(course_id: str) -> List[EnrollmentUser]:
    """
    Find all users who have an entry in their `enrollments` array for this course.
    Return only (_id, email, first_name, last_name) for each user.
    """
    oid = ObjectId(course_id)

    # We only project the four fields we need.
    cursor = users_collection.find(
        {"enrollments.courseId": oid},
        {
            "_id": 1,
            "email": 1,
            "profile.firstName": 1,
            "profile.lastName": 1
        }
    )

    out: List[EnrollmentUser] = []
    async for raw in cursor:
        raw["_id"] = str(raw["_id"])
        prof = raw.get("profile") or {}
        first = prof.get("firstName") if isinstance(prof, dict) else ""
        last  = prof.get("lastName")  if isinstance(prof, dict) else ""
        raw["first_name"] = first or ""
        raw["last_name"]  = last  or ""
        raw.pop("profile", None)
        out.append(EnrollmentUser(**raw))

    return out
