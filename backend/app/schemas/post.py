# app/schemas/post.py

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PostBase(BaseModel):
    title:    str
    content:  str
    type:     str            # "lecture" | "reminder" | "homework"
    file_id:  Optional[str]  = None
    due_date: Optional[datetime] = None  # <-- New!

class PostCreate(PostBase):
    """All fields needed to create a post; now includes optional due_date."""
    pass

class PostUpdate(PostBase):
    """All fields allowed when updating a post; now includes optional due_date."""
    pass

class PostDB(PostBase):
    id:         str           = Field(..., alias="_id")
    course_id:  str
    author_id:  str
    position:   int           # ordering index among unpinned posts
    ispinned:   bool
    pinnedAt:   Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "populate_by_name": True,
        "from_attributes":  True,
        "json_encoders":    { datetime: lambda dt: dt.isoformat() }
    }

class PostOut(PostDB):
    """What we return to the client; includes due_date via inheritance."""
    pass
