# /app/schemas/user.py

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserIn(BaseModel):
    email: EmailStr
    username: str
    password: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    address: Optional[str] = None
    profile_pic_path: Optional[str] = None

class UserDB(BaseModel):
    id: str = Field(..., alias="_id")
    email: EmailStr
    username: str
    hashed_password: str
    password_auto_generated: bool = False
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    address: Optional[str] = None
    profile_pic_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None

    model_config = {
        "validate_by_name": True,   # allow using field names (id) not just alias (_id)
        "from_attributes": True,    # enable ORM-mode: read attrs on objects
        "json_schema_extra": {
            "examples": []
        }
    }

class UserOut(BaseModel):
    id: str = Field(..., alias="_id")
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    address: Optional[str] = None
    profile_pic_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None

    model_config = {
        "validate_by_name": True,
        "from_attributes": True
    }

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
