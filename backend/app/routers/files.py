# /app/routers/files.py

import io
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from starlette.status import HTTP_201_CREATED

from app.db.mongodb import db   # your named Motor database

router = APIRouter(prefix="/files", tags=["files"])

# GridFS bucket “avatars”
_fs = AsyncIOMotorGridFSBucket(db, bucket_name="avatars")


@router.post("/upload", status_code=HTTP_201_CREATED)
async def upload_avatar(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only images are allowed")

    # OPEN THE STREAM (don't await here)
    grid_in = _fs.open_upload_stream(
        file.filename,
        metadata={"contentType": file.content_type}
    )

    contents = await file.read()
    try:
        # write into GridFS
        await grid_in.write(contents)
    finally:
        await grid_in.close()
        await file.close()

    file_id = grid_in._id
    return JSONResponse(
        status_code=HTTP_201_CREATED,
        content={
            "id": str(file_id),
            "url": f"/files/{file_id}"
        }
    )


@router.get("/{file_id}")
async def serve_avatar(file_id: str):
    try:
        oid = ObjectId(file_id)
    except Exception:
        raise HTTPException(400, "Invalid file ID")

    try:
        grid_out = await _fs.open_download_stream(oid)
    except Exception:
        raise HTTPException(404, "File not found")

    data = await grid_out.read()
    return StreamingResponse(
        io.BytesIO(data),
        media_type=grid_out.metadata.get("contentType", "application/octet-stream"),
        headers={"Content-Disposition": f'inline; filename="{grid_out.filename}"'}
    )
