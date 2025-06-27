from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import users_collection
from app.schemas.user import UserDB, Profile, Enrollment, Access
from app.schemas.user import UserOut, EnrollmentUser

async def _normalize_user_doc(doc: dict) -> UserDB:
    """Convert ObjectId fields to str and return a UserDB."""
    doc["_id"] = str(doc["_id"])

    # If roles were stored as plain strings, str(r) will just keep them unchanged.
    doc["roles"] = [str(r) for r in doc.get("roles", [])]

    # Normalize enrollments
    doc["enrollments"] = [
        {"courseId": str(e["courseId"]), "enrolledAt": e["enrolledAt"]}
        for e in doc.get("enrollments", [])
    ]

    # Normalize accesses
    doc["accesses"] = [
        {"courseId": str(a["courseId"]), "accessedAt": a["accessedAt"]}
        for a in doc.get("accesses", [])
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

    from app.services.auth import hash_password

    now = datetime.utcnow()
    username = f"{profile.firstName[0].lower()}{profile.lastName.lower()}"

    user_doc = {
        "email":        email,
        "username":     username,
        "passwordHash": hash_password(raw_password),
        "profile":      profile.model_dump(),
        "roles":        roles or [],
        "enrollments":  [],
        "accesses":     [],
        "createdAt":    now,
        "updatedAt":    now
    }

    res = await users_collection.insert_one(user_doc)
    doc = await users_collection.find_one({"_id": res.inserted_id})
    return await _normalize_user_doc(doc)

async def authenticate_user(email: str, password: str) -> Optional[UserDB]:
    """Verify credentials; return normalized UserDB or None."""
    doc = await users_collection.find_one({"email": email})
    if not doc:
        return None

    from app.services.auth import verify_password

    if not verify_password(password, doc.get("passwordHash", "")):
        return None

    return await _normalize_user_doc(doc)

async def get_user_by_id(user_id: str) -> Optional[UserDB]:
    """Fetch a single user by ObjectId string, returning None if ID is invalid or not found."""
    try:
        oid = ObjectId(user_id)
    except Exception:
        return None

    doc = await users_collection.find_one({"_id": oid})
    if not doc:
        return None
    return await _normalize_user_doc(doc)

async def list_users() -> List[UserDB]:
    """Return all users, normalized and sorted by creation time desc."""
    out: List[UserDB] = []
    cursor = users_collection.find().sort("createdAt", -1)
    async for doc in cursor:
        out.append(await _normalize_user_doc(doc))
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
    """Find all users in a course, return slim user info."""
    oid = ObjectId(course_id)
    cursor = users_collection.find(
        {"enrollments.courseId": oid},
        {"_id": 1, "email": 1, "profile.firstName": 1, "profile.lastName": 1}
    )
    out: List[EnrollmentUser] = []
    async for raw in cursor:
        raw["_id"] = str(raw["_id"])
        prof = raw.pop("profile", {}) or {}
        raw["first_name"] = prof.get("firstName", "")
        raw["last_name"] = prof.get("lastName", "")
        out.append(EnrollmentUser(**raw))
    return out

async def delete_user(user_id: str) -> bool:
    """Remove a user document entirely."""
    try:
        oid = ObjectId(user_id)
    except Exception:
        return False
    res = await users_collection.delete_one({"_id": oid})
    return res.deleted_count == 1

async def change_user_password(
    user_id: str, old_password: str, new_password: str
) -> bool:
    """Verify the old password, then update to the new hashed password."""
    try:
        oid = ObjectId(user_id)
    except Exception:
        return False

    doc = await users_collection.find_one({"_id": oid}, {"passwordHash": 1})
    if not doc:
        return False

    from app.services.auth import verify_password, hash_password
    if not verify_password(old_password, doc.get("passwordHash", "")):
        return False

    new_hash = hash_password(new_password)
    res = await users_collection.update_one(
        {"_id": oid},
        {"$set": {"passwordHash": new_hash, "updatedAt": datetime.utcnow()}}
    )
    return res.modified_count == 1


async def upsert_access(user_id: str, course_id: str) -> None:
    """
    Record that `user_id` viewed `course_id` right now.
    If an access entry already exists, update its timestamp; otherwise insert it.
    """
    now = datetime.utcnow()
    oid = ObjectId(user_id)
    coid = ObjectId(course_id)

    # Try to update an existing entry
    res = await users_collection.update_one(
        {"_id": oid, "accesses.courseId": coid},
        {"$set": {"accesses.$.accessedAt": now}}
    )

    if res.matched_count == 0:
        # No existing entry → push a new one
        await users_collection.update_one(
            {"_id": oid},
            {"$push": {"accesses": {"courseId": coid, "accessedAt": now}}}
        )


async def list_accesses(user_id: str, limit: int = 10) -> List[Access]:
    """
    Return up to `limit` Access objects, sorted by accessedAt descending.
    """
    doc = await users_collection.find_one(
        {"_id": ObjectId(user_id)},
        {"accesses": 1}
    )
    raw = doc.get("accesses", []) if doc else []
    # sort in-memory (or you could $slice + $sort in projection)
    raw_sorted = sorted(raw, key=lambda a: a["accessedAt"], reverse=True)[:limit]
    return [Access(courseId=str(a["courseId"]), accessedAt=a["accessedAt"])
            for a in raw_sorted]