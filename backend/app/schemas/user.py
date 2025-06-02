# /app/schemas/user.py

from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

class LoginIn(BaseModel):
    email: EmailStr
    password: str

    model_config = {
        "validate_by_name": True
    }

class Profile(BaseModel):
    firstName:   str
    lastName:    str
    profilePic:  Optional[str] = None
    phoneNumber: Optional[str] = None
    address:     Optional[str] = None

    model_config = {
        "validate_by_name": True,
        "from_attributes":  True
    }
class SignupIn(BaseModel):
    email:     EmailStr
    password:  str
    profile:   Profile
    roles:     Optional[List[str]] = None

    model_config = {"validate_by_name": True}
    
class Enrollment(BaseModel):
    courseId:   str
    enrolledAt: datetime

    model_config = {
        "validate_by_name": True,
        "from_attributes":  True
    }

class EnrollmentUser(BaseModel):
    """
    A slim representation of “User” for the /courses/{id}/enrolled endpoint:
    only includes: _id, email, first_name, last_name.
    """
    id:         str      = Field(..., alias="_id")
    email:      EmailStr
    first_name: str
    last_name:  str

    class Config:
        validate_by_name = True
        form_attributes = True
class Access(BaseModel):
    courseId:   str
    accessedAt: datetime

    model_config = {
        "validate_by_name": True,
        "from_attributes":  True
    }

class Alert(BaseModel):
    alertId:        str
    createdAt:      datetime
    acknowledgedAt: Optional[datetime] = None

    model_config = {
        "validate_by_name": True,
        "from_attributes":  True
    }

class UserDB(BaseModel):
    id:           str             = Field(..., alias="_id")
    email:        EmailStr
    username:     str
    passwordHash: str
    profile:      Profile
    roles:        List[str]       = []
    enrollments:  List[Enrollment] = []
    accesses:     List[Access]     = []
    alerts:       List[Alert]      = []
    createdAt:    datetime
    updatedAt:    datetime

    model_config = {
        "validate_by_name": True,
        "from_attributes":  True
    }

class UserOut(BaseModel):
    id:        str       = Field(..., alias="_id")
    email:     EmailStr
    username:  str
    profile:   Profile
    roles:     List[str]
    enrollments: List[Enrollment]
    accesses:    List[Access]
    alerts:      List[Alert]
    createdAt: datetime
    updatedAt: datetime

    model_config = {
        "validate_by_name": True,
        "from_attributes":  True
    }

class Token(BaseModel):
    access_token: str
    token_type:   str = "bearer"

    model_config = {
        "validate_by_name": True
    }
