from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CourseBase(BaseModel):
    title: str
    description: str
    code: str
    background: Optional[str] = None

class CourseCreate(CourseBase):
    """Properties required when creating a course"""
    pass

class CourseDB(CourseBase):
    """How a course is stored in the database"""
    id: str = Field(..., alias="_id")
    created_at: datetime
    updated_at: datetime
    created_by: str

    model_config = {
        "validate_by_name": True,   # allow passing `id` instead of `_id`
        "from_attributes": True,    # ORM mode
        "json_schema_extra": {
            "examples": []
        }
    }

class CourseOut(CourseDB):
    """What is returned in API responses"""
    model_config = {
        "validate_by_name": True,
        "from_attributes": True
    }
