# app/schemas/post.py

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PostBase(BaseModel):
    title:    str
    content:  str
    type:     str            # e.g. "lecture" | "reminder"
    file_id:  Optional[str]  = None

class PostCreate(PostBase):
    """All fields needed to create a post."""
    pass

class PostUpdate(PostBase):
    """All fields allowed when updating a post."""
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
    """What we return over the wire."""
    pass
