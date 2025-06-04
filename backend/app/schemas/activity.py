# app/schemas/activity.py

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class ActivityLogBase(BaseModel):
    user_id:   str
    action:    str                   # ex. "login", "view_course", "submit_homework", etc.
    timestamp: datetime
    metadata:  Optional[Dict[str, Any]] = None

class ActivityLogCreate(ActivityLogBase):
    """Champs nécessaires pour créer un log."""
    pass

class ActivityLogDB(ActivityLogBase):
    id: str = Field(..., alias="_id")

    class Config:
        validate_by_name = True
        json_encoders = { datetime: lambda dt: dt.isoformat() }
