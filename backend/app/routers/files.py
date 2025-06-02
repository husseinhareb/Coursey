# app/routers/files.py

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId

from app.db.mongodb import fs

router = APIRouter(
    prefix="/files",
    tags=["files"],
)

@router.get("/{file_id}")
async def download_file(file_id: str):
    """
    Stream/download exactly one GridFS file by its ObjectId string.
    """
    try:
        # Attempt to open the file in GridFS
        grid_out = await fs.open_download_stream(ObjectId(file_id))
    except Exception:
        raise HTTPException(status_code=404, detail="File not found in GridFS")

    # If we succeed, grid_out is a GridOut object that is an async iterator
    # over the binary chunks.  We can do a StreamingResponse to send chunked data.
    mime_type = grid_out.content_type or "application/octet-stream"
    filename  = grid_out.filename or "download"

    async def file_iterator():
        async for chunk in grid_out:   # chunk is bytes
            yield chunk

    # Set headers so that browsers will prompt a “Save as” or open inline when they click
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }

    return StreamingResponse(file_iterator(), media_type=mime_type, headers=headers)
