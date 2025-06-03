# app/routers/submission.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from typing import List, Optional, Union
from datetime import datetime
from bson import ObjectId

from app.schemas.submission import (
    SubmissionDB,
    SubmissionOut,
    SubmissionGrade,
    SubmissionCreate
)
from app.services.auth import get_current_active_user
from app.schemas.user import UserDB
from app.db.mongodb import submissions_collection, users_collection, posts_collection, fs
from app.crud.submission import (
    list_submissions,
    create_submission as _create_submission,
    delete_submission as _delete_submission
)

from app.schemas.activity import ActivityLogCreate
from app.crud.activity import create_activity_log

router = APIRouter(
    prefix="/courses/{course_id}/posts/{post_id}/submissions",
    tags=["submissions"],
    dependencies=[Depends(get_current_active_user)]
)

@router.post("/", response_model=SubmissionOut)
async def api_create_submission(
    course_id:      str,
    post_id:        str,
    file:           UploadFile = File(...),
    current_user:   UserDB = Depends(get_current_active_user)
):
    """
    1) Read the post's due_date from posts_collection.
    2) Insert a new submission with status = "submitted" if now <= due_date, else "late".
    3) Log the "submit_homework" activity.
    """
    now = datetime.utcnow()

    # Lookup due_date from the post
    post_doc = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not post_doc:
        raise HTTPException(status_code=404, detail="Post not found")
    due = post_doc.get("due_date")
    if due and isinstance(due, datetime) and now > due:
        initial_status = "late"
    else:
        initial_status = "submitted"

    # Upload file into GridFS
    contents = await file.read()
    grid_in = fs.open_upload_stream(
        filename=file.filename,
        metadata={
            "content_type": file.content_type,
            "uploaded_by":  current_user.id,
            "course_id":    course_id,
            "post_id":      post_id,
            "uploaded_at":  now
        }
    )
    grid_in.write(contents)
    grid_in.close()
    file_obj_id = grid_in._id

    # Insert submission document
    doc = {
        "course_id":  ObjectId(course_id),
        "post_id":    ObjectId(post_id),
        "student_id": ObjectId(current_user.id),
        "file_id":    ObjectId(file_obj_id),
        "status":     initial_status,
        "grade":      None,
        "comment":    None,
        "created_at": now,
        "updated_at": now
    }
    res = await submissions_collection.insert_one(doc)
    created = await submissions_collection.find_one({"_id": res.inserted_id})

    if not created:
        raise HTTPException(status_code=500, detail="Failed to create submission")

    # Convert ObjectId → str
    created["_id"]        = str(created["_id"])
    created["course_id"]  = str(created["course_id"])
    created["post_id"]    = str(created["post_id"])
    created["student_id"] = str(created["student_id"])
    created["file_id"]    = str(created["file_id"])

    submission_out = SubmissionDB(**created)

    # Log activity: submit_homework
    log = ActivityLogCreate(
        user_id=current_user.id,
        action="submit_homework",
        timestamp=now,
        metadata={
            "course_id": course_id,
            "post_id": post_id,
            "submission_id": submission_out.id,
            "status": initial_status
        }
    )
    await create_activity_log(log)

    return submission_out


@router.get("/", response_model=List[SubmissionOut])
async def api_list_submissions(
    course_id: str,
    post_id:   str,
    current_user:   UserDB = Depends(get_current_active_user)
):
    """
    Return all submissions for a given course_id/post_id.
    Also log "list_submissions" activity.
    """
    submissions = await list_submissions(course_id, post_id)

    # Log activity: list_submissions
    log = ActivityLogCreate(
        user_id=current_user.id,
        action="list_submissions",
        timestamp=datetime.utcnow(),
        metadata={"course_id": course_id, "post_id": post_id, "count": len(submissions)}
    )
    await create_activity_log(log)

    return submissions


@router.patch(
    "/{submission_id}",
    response_model=SubmissionOut
)
async def api_update_submission(
    course_id:      str,
    post_id:        str,
    submission_id:  str,
    payload:        Union[SubmissionGrade, dict] = Body(...),
    current_user:   UserDB = Depends(get_current_active_user)
):
    """
    Supports two scenarios:
    1) { "status": "submitted"|"late" } → update only status (and updated_at).
    2) { "grade": int, "comment": str } → set status="graded", grade, comment, updated_at.
    Always return the updated SubmissionOut, and log the appropriate activity.
    """
    # 1) Fetch existing submission
    doc = await submissions_collection.find_one({"_id": ObjectId(submission_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")

    now = datetime.utcnow()
    update_data: dict = {}
    activity_action = None

    # 2) Determine which fields to update
    if "status" in payload:
        new_status = payload.get("status")
        if new_status not in {"submitted", "late", "graded"}:
            raise HTTPException(status_code=400, detail="Invalid status value")
        # Once graded, we do not allow changing it back via this path
        if doc.get("status") == "graded":
            raise HTTPException(status_code=400, detail="Cannot change status after grading")
        update_data["status"] = new_status
        update_data["updated_at"] = now
        activity_action = "update_submission_status"

    elif ("grade" in payload) and ("comment" in payload):
        # Grade + comment path → set status = "graded"
        grade_value = payload["grade"]
        comment_value = payload["comment"]
        update_data["grade"]   = grade_value
        update_data["comment"] = comment_value
        update_data["status"]  = "graded"
        update_data["updated_at"] = now
        activity_action = "grade_submission"

    else:
        raise HTTPException(status_code=400, detail="Must supply either 'status' or both 'grade' and 'comment'")

    # 3) Perform the update
    result = await submissions_collection.update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found after update attempt")

    # 4) Fetch the newly updated document
    updated_doc = await submissions_collection.find_one({"_id": ObjectId(submission_id)})
    if not updated_doc:
        raise HTTPException(status_code=404, detail="Submission not found after update")

    # Convert ObjectId → str
    updated_doc["_id"]        = str(updated_doc["_id"])
    updated_doc["course_id"]  = str(updated_doc["course_id"])
    updated_doc["post_id"]    = str(updated_doc["post_id"])
    updated_doc["student_id"] = str(updated_doc["student_id"])
    updated_doc["file_id"]    = str(updated_doc["file_id"])

    # 5) Re‐lookup student's first_name/last_name
    try:
        user_obj = await users_collection.find_one({"_id": ObjectId(updated_doc["student_id"])})
    except:
        user_obj = None

    if user_obj:
        updated_doc["first_name"] = user_obj.get("first_name")
        updated_doc["last_name"]  = user_obj.get("last_name")
    else:
        updated_doc["first_name"] = None
        updated_doc["last_name"]  = None

    # 6) Re‐lookup GridFS filename
    if updated_doc.get("file_id"):
        try:
            grid_out = await fs.open_download_stream(ObjectId(updated_doc["file_id"]))
            updated_doc["file_name"] = grid_out.filename
        except:
            updated_doc["file_name"] = None
    else:
        updated_doc["file_name"] = None

    submission_out = SubmissionOut(**updated_doc)

    # 7) Log the activity
    if activity_action:
        log_metadata = {
            "course_id": course_id,
            "post_id": post_id,
            "submission_id": submission_id
        }
        if activity_action == "update_submission_status":
            log_metadata["new_status"] = update_data.get("status")
        elif activity_action == "grade_submission":
            log_metadata["grade"]   = update_data.get("grade")
            log_metadata["comment"] = update_data.get("comment")

        log = ActivityLogCreate(
            user_id=current_user.id,
            action=activity_action,
            timestamp=now,
            metadata=log_metadata
        )
        await create_activity_log(log)

    return submission_out


@router.delete("/{submission_id}", response_model=dict)
async def api_delete_submission(
    course_id:      str,
    post_id:        str,
    submission_id:  str,
    current_user:   UserDB = Depends(get_current_active_user)
):
    """
    Delete a submission and log "delete_submission" activity.
    """
    ok = await _delete_submission(submission_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Log activity: delete_submission
    log = ActivityLogCreate(
        user_id=current_user.id,
        action="delete_submission",
        timestamp=datetime.utcnow(),
        metadata={
            "course_id": course_id,
            "post_id": post_id,
            "submission_id": submission_id
        }
    )
    await create_activity_log(log)

    return {"deleted": True}
