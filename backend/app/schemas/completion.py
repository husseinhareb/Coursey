# app/schemas/completion.py
from pydantic import BaseModel, Field
from datetime import datetime

class CompletionCreate(BaseModel):
    user_id:    str = Field(..., description="ID of the student")
    course_id:  str = Field(..., description="ID of the course")
    post_id:    str = Field(..., description="ID of the post")

class Completion(BaseModel):
    id:         str         = Field(..., alias="_id")
    user_id:    str
    course_id:  str
    post_id:    str
    created_at: datetime
