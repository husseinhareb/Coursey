# app/crud/submission.py

from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import submissions_collection, users_collection, fs
from app.schemas.submission import SubmissionCreate, SubmissionDB, SubmissionGrade, SubmissionOut

async def create_submission(
    course_id: str,
    post_id:   str,
    student_id:str,
    sub_in:    SubmissionCreate
) -> SubmissionDB:
    now = datetime.utcnow()
    doc = {
        "course_id":  ObjectId(course_id),
        "post_id":    ObjectId(post_id),
        "student_id": ObjectId(student_id),
        "file_id":    ObjectId(sub_in.file_id),
        "status":     "submitted",
        "grade":      None,
        "comment":    None,
        "created_at": now,
        "updated_at": now
    }
    res = await submissions_collection.insert_one(doc)
    created = await submissions_collection.find_one({"_id": res.inserted_id})

    # Convert ObjectId → str
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

        # 2) Lookup the student's name (first_name / last_name)
        try:
            user_obj = await users_collection.find_one({
                "_id": ObjectId(doc["student_id"])
            })
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

        # 4) Build and append a SubmissionOut
        out.append(SubmissionOut(**doc))

    return out


async def grade_submission(
    course_id:      str,
    post_id:        str,
    submission_id:  str,
    grade_in:       SubmissionGrade
) -> Optional[SubmissionOut]:
    now = datetime.utcnow()
    res = await submissions_collection.update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": {
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
        user_obj = await users_collection.find_one({
            "_id": ObjectId(doc["student_id"])
        })
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
    res = await submissions_collection.delete_one({"_id": ObjectId(submission_id)})
    return (res.deleted_count == 1)
