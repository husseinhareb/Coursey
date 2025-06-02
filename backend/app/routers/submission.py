# app/routers/submission.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List
from datetime import datetime
from bson import ObjectId

from app.schemas.submission import SubmissionDB, SubmissionOut, SubmissionGrade, SubmissionCreate
from app.services.auth import get_current_active_user
from app.schemas.user import UserDB
from app.db.mongodb import submissions_collection, fs
from app.crud.submission import (
    list_submissions,
    create_submission as _create_submission,
    grade_submission,
    delete_submission as _delete_submission
)

router = APIRouter(
    prefix="/courses/{course_id}/posts/{post_id}/submissions",
    tags=["submissions"],
    dependencies=[Depends(get_current_active_user)]
)

@router.post("/", response_model=SubmissionOut)
async def api_create_submission(
    course_id: str,
    post_id:   str,
    file:      UploadFile = File(...),
    current_user: UserDB = Depends(get_current_active_user)
):
    contents = await file.read()
    grid_in = fs.open_upload_stream(
        filename=file.filename,
        metadata={
            "content_type": file.content_type,
            "uploaded_by":   current_user.id,
            "course_id":     course_id,
            "post_id":       post_id,
            "uploaded_at":   datetime.utcnow()
        }
    )
    grid_in.write(contents)
    grid_in.close()
    file_obj_id = grid_in._id

    now = datetime.utcnow()
    doc = {
        "course_id":  ObjectId(course_id),
        "post_id":    ObjectId(post_id),
        "student_id": ObjectId(current_user.id),
        "file_id":    file_obj_id,
        "status":     "submitted",
        "grade":      None,
        "comment":    None,
        "created_at": now,
        "updated_at": now
    }
    res = await submissions_collection.insert_one(doc)
    created = await submissions_collection.find_one({"_id": res.inserted_id})

    created["_id"]        = str(created["_id"])
    created["course_id"]  = str(created["course_id"])
    created["post_id"]    = str(created["post_id"])
    created["student_id"] = str(created["student_id"])
    created["file_id"]    = str(created["file_id"])
    return SubmissionDB(**created)


@router.get("/", response_model=List[SubmissionOut])
async def api_list_submissions(
    course_id: str,
    post_id:   str
):
    return await list_submissions(course_id, post_id)


@router.patch("/{submission_id}", response_model=SubmissionOut)
async def api_grade_submission(
    course_id:      str,
    post_id:        str,
    submission_id:  str,
    grade_in:       SubmissionGrade,
    current_user:   UserDB = Depends(get_current_active_user)
):
    graded = await grade_submission(course_id, post_id, submission_id, grade_in)
    if not graded:
        raise HTTPException(status_code=404, detail="Submission not found")
    return graded


@router.delete("/{submission_id}", response_model=dict)
async def api_delete_submission(
    course_id:      str,
    post_id:        str,
    submission_id:  str,
    current_user:   UserDB = Depends(get_current_active_user)
):
    ok = await _delete_submission(submission_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"deleted": True}
