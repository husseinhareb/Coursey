from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ─── When the client POSTs a new thread, we only need "title" ───
class ForumThreadCreate(BaseModel):
    title: str


# ─── What we store in MongoDB & return for thread-list or detail ───
class ForumThreadDB(BaseModel):
    id:          str       = Field(..., alias="_id")
    course_id:   str
    title:       str
    author_id:   str
    created_at:  datetime
    updated_at:  datetime
    # NOTE: messages themselves are fetched separately in get-thread-detail
    # So we don't list them here for "out" in list; the detail endpoint includes them.


    model_config = {
        "populate_by_name": True,
        "from_attributes":  True,
        "json_encoders":    { datetime: lambda dt: dt.isoformat() }
    }


class ForumThreadOut(ForumThreadDB):
    """
    Returned when listing or creating a thread (no embedded messages here).
    In the detail endpoint we’ll merge in `messages: List[ForumMessageOut]`.
    """
    pass


# ─── When showing one thread WITH its messages ───
class ForumMessageOut(BaseModel):
    id:         str        = Field(..., alias="_id")
    thread_id:  str
    author_id:  str
    content:    str
    created_at: datetime

    model_config = {
        "populate_by_name": True,
        "from_attributes":  True,
        "json_encoders":    { datetime: lambda dt: dt.isoformat() }
    }


class ForumThreadDetail(ForumThreadDB):
    """
    In the detail endpoint, we include all messages under `messages: List[ForumMessageOut]`.
    """
    messages: List[ForumMessageOut] = []


# ─── When client POSTs a new message to a thread, only "content" is required ───
class ForumMessageCreate(BaseModel):
    content: str
