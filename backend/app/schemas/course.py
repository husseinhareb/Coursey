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

    class Config:
        allow_population_by_field_name = True
        orm_mode = True
        json_encoders = { datetime: lambda dt: dt.isoformat() }

class CourseOut(CourseDB):
    """What is returned in API responses"""
    pass
