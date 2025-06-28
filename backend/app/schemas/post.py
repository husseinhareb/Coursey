# app/schemas/post.py

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

class PostBase(BaseModel):
    """
    Shared properties for creating/updating posts.
    Now supports optional file upload (GridFS) and due_date for homework.
    """
    title:    str
    content:  str
    type:     Literal["lecture", "reminder", "homework"]
    file_id:  Optional[str]     = None
    due_date: Optional[datetime] = None

class PostCreate(PostBase):
    """All fields needed to create a post; optional file_id & due_date."""
    pass

class PostUpdate(PostBase):
    """Fields allowed when updating a post; optional file_id & due_date."""
    pass

class PostDB(PostBase):
    """
    Internal representation of a Post in the database.
    - Uses `_id` alias for Mongo ObjectId
    - Tracks ordering (position), pin state, and timestamps
    """
    id:         str               = Field(..., alias="_id")
    course_id:  str
    author_id:  str
    position:   int               # order among unpinned posts
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
    """What we return to the client; includes file_id & due_date via inheritance."""
    pass
