# app/routers/submission.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.submission import SubmissionCreate, SubmissionOut, SubmissionGrade
from app.crud.submission import create_submission, list_submissions, grade_submission, delete_submission
from app.services.auth import get_current_active_user
from app.schemas.user import UserDB

router = APIRouter(
    prefix="/courses/{course_id}/posts/{post_id}/submissions",
    tags=["submissions"],
    dependencies=[Depends(get_current_active_user)]
)

@router.post("/", response_model=SubmissionOut)
async def api_create_submission(
    course_id: str,
    post_id:   str,
    sub_in:    SubmissionCreate,
    current_user: UserDB = Depends(get_current_active_user)
):
    # current_user.id is the student’s user ID
    return await create_submission(course_id, post_id, current_user.id, sub_in)

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
    if not graded or graded.course_id != course_id:
        raise HTTPException(status_code=404, detail="Submission not found")
    return graded

@router.delete("/{submission_id}", response_model=dict)
async def api_delete_submission(
    course_id:      str,
    post_id:        str,
    submission_id:  str,
    current_user:   UserDB = Depends(get_current_active_user)
):
    ok = await delete_submission(submission_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"deleted": True}
