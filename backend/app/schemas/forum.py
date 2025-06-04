from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import base64


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
    id:          str        = Field(..., alias="_id")
    thread_id:   str
    author_id:   str
    content:     Optional[str]       # may be None if the message only has an image
    image_data:  Optional[bytes]     # raw bytes stored in MongoDB

    created_at:  datetime

    model_config = {
        "populate_by_name": True,
        "from_attributes":  True,
        # datetime → isostring, bytes → base64‐encoded string
        "json_encoders": {
            datetime: lambda dt: dt.isoformat(),
            bytes:    lambda b: base64.b64encode(b).decode("utf-8")
        }
    }


class ForumThreadDetail(ForumThreadDB):
    """
    In the detail endpoint, we include all messages under `messages: List[ForumMessageOut]`.
    """
    messages: List[ForumMessageOut] = []


# ─── We still require only "content" or an image when the client POSTs a new message ───
#    However, since FastAPI needs to read them from Form/File, we no longer need a Pydantic model here.
#    The router will read content via `Form(...)` and image via `UploadFile`.
# ───
