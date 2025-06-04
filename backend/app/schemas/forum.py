from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ForumMessageBase(BaseModel):
    thread_id:   str
    author_id:   str
    content:     str

class ForumMessageCreate(ForumMessageBase):
    """Fields needed to create a new message."""
    pass

class ForumMessageDB(ForumMessageBase):
    id:         str       = Field(..., alias="_id")
    created_at: datetime
    updated_at: datetime

    model_config = {
        "populate_by_name": True,
        "from_attributes":  True,
        "json_encoders":    { datetime: lambda dt: dt.isoformat() }
    }

class ForumMessageOut(ForumMessageDB):
    """What we return over the wire (inherits id, created_at, updated_at)."""
    pass


class ForumThreadBase(BaseModel):
    course_id:    str
    title:        str

class ForumThreadCreate(ForumThreadBase):
    """Fields needed to create a new thread."""
    pass

class ForumThreadDB(ForumThreadBase):
    id:          str          = Field(..., alias="_id")
    created_at:  datetime
    updated_at:  datetime

    model_config = {
        "populate_by_name": True,
        "from_attributes":  True,
        "json_encoders":    { datetime: lambda dt: dt.isoformat() }
    }

class ForumThreadOut(ForumThreadDB):
    """Response model for a thread listing."""
    pass


class ForumThreadDetail(ForumThreadDB):
    """When returning one thread, include its messages (list of ForumMessageOut)"""
    messages: List[ForumMessageOut] = []
