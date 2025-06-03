# app/crud/submission.py

from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import submissions_collection, users_collection, posts_collection, fs
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionDB,
    SubmissionGrade,
    SubmissionOut
)

async def create_submission(
    course_id: str,
    post_id:   str,
    student_id: str,
    sub_in:    SubmissionCreate
) -> SubmissionDB:
    """
    1) Fetch the post to read its due_date.
    2) Compare now vs. due_date; set status = "late" if now > due_date, else "submitted".
    3) Insert a new submission doc with that status.
    """
    now = datetime.utcnow()

    # 1) Lookup parent post's due_date
    post_doc = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not post_doc:
        # If the post does not exist (shouldn't happen in practice), default to "submitted"
        status_value = "submitted"
    else:
        due = post_doc.get("due_date")
        if due and isinstance(due, datetime) and now > due:
            status_value = "late"
        else:
            status_value = "submitted"

    # 2) Upload file to GridFS
    file_id = ObjectId(sub_in.file_id)  # we assume sub_in.file_id is the GridFS file_id
    doc = {
        "course_id":  ObjectId(course_id),
        "post_id":    ObjectId(post_id),
        "student_id": ObjectId(student_id),
        "file_id":    file_id,
        "status":     status_value,
        "grade":      None,
        "comment":    None,
        "created_at": now,
        "updated_at": now
    }
    res = await submissions_collection.insert_one(doc)
    created = await submissions_collection.find_one({"_id": res.inserted_id})

    # 3) Convert ObjectId → str so Pydantic can parse
    created["_id"]        = str(created["_id"])
    created["course_id"]  = str(created["course_id"])
    created["post_id"]    = str(created["post_id"])
    created["student_id"] = str(created["student_id"])
    created["file_id"]    = str(created["file_id"])
    return SubmissionDB(**created)


async def list_submissions(
    course_id: str,
    post_id:   str
) -> List[SubmissionOut]:
    """
    Returns all submissions for a given course_id/post_id.
    Each SubmissionOut includes first_name, last_name, file_name, status, grade, comment, etc.
    """
    cursor = submissions_collection.find({
        "course_id": ObjectId(course_id),
        "post_id":   ObjectId(post_id)
    })
    out: List[SubmissionOut] = []

    async for doc in cursor:
        # 1) Convert the common ObjectId fields → str
        doc["_id"]        = str(doc["_id"])
        doc["course_id"]  = str(doc["course_id"])
        doc["post_id"]    = str(doc["post_id"])
        doc["student_id"] = str(doc["student_id"])
        doc["file_id"]    = str(doc["file_id"])

        # 2) Lookup the student's name
        try:
            user_obj = await users_collection.find_one({"_id": ObjectId(doc["student_id"])})
        except:
            user_obj = None

        if user_obj:
            doc["first_name"] = user_obj.get("first_name")
            doc["last_name"]  = user_obj.get("last_name")
        else:
            doc["first_name"] = None
            doc["last_name"]  = None

        # 3) Lookup the file's original filename in GridFS
        if doc.get("file_id"):
            try:
                grid_out = await fs.open_download_stream(ObjectId(doc["file_id"]))
                doc["file_name"] = grid_out.filename
            except Exception:
                doc["file_name"] = None
        else:
            doc["file_name"] = None

        out.append(SubmissionOut(**doc))
    return out


async def grade_submission(
    course_id:     str,
    post_id:       str,
    submission_id: str,
    grade_in:      SubmissionGrade
) -> Optional[SubmissionOut]:
    """
    When grading:
    - Always set status = "graded"
    - Update grade, comment, updated_at
    """
    now = datetime.utcnow()
    res = await submissions_collection.update_one(
        { "_id": ObjectId(submission_id) },
        { "$set": {
            "grade":      grade_in.grade,
            "comment":    grade_in.comment,
            "status":     "graded",
            "updated_at": now
        }}
    )
    if res.matched_count == 0:
        return None

    doc = await submissions_collection.find_one({"_id": ObjectId(submission_id)})
    if not doc:
        return None

    # Convert ObjectId → str
    doc["_id"]        = str(doc["_id"])
    doc["course_id"]  = str(doc["course_id"])
    doc["post_id"]    = str(doc["post_id"])
    doc["student_id"] = str(doc["student_id"])
    doc["file_id"]    = str(doc["file_id"])

    # Re‐lookup user name
    try:
        user_obj = await users_collection.find_one({"_id": ObjectId(doc["student_id"])})
    except:
        user_obj = None

    if user_obj:
        doc["first_name"] = user_obj.get("first_name")
        doc["last_name"]  = user_obj.get("last_name")
    else:
        doc["first_name"] = None
        doc["last_name"]  = None

    # Re‐lookup GridFS filename
    if doc.get("file_id"):
        try:
            grid_out = await fs.open_download_stream(ObjectId(doc["file_id"]))
            doc["file_name"] = grid_out.filename
        except Exception:
            doc["file_name"] = None
    else:
        doc["file_name"] = None

    return SubmissionOut(**doc)


async def delete_submission(submission_id: str) -> bool:
    res = await submissions_collection.delete_one({ "_id": ObjectId(submission_id) })
    return (res.deleted_count == 1)
