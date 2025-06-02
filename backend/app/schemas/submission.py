# app/schemas/submission.py

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SubmissionCreate(BaseModel):
    file_id: str
    model_config = {"validate_by_name": True}


class SubmissionGrade(BaseModel):
    grade:   int
    comment: str
    model_config = {"validate_by_name": True}


class SubmissionDB(BaseModel):
    id:         str     = Field(..., alias="_id")
    course_id:  str
    post_id:    str
    student_id: str
    file_id:    str
    status:     str
    grade:      Optional[int]
    comment:    Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {
        "populate_by_name": True,
        "from_attributes":  True,
        "json_encoders":    { datetime: lambda dt: dt.isoformat() }
    }


class SubmissionOut(SubmissionDB):
    first_name: Optional[str] = None
    last_name:  Optional[str] = None

    file_name:  Optional[str] = None

    model_config = {
        "extra": "allow"
    }
