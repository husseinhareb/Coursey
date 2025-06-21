# /app/routers/files.py

import io
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from starlette.status import HTTP_201_CREATED

from app.db.mongodb import db   # your named Motor database

router = APIRouter(prefix="/files", tags=["files"])

# GridFS bucket “avatars”
_fs = AsyncIOMotorGridFSBucket(db, bucket_name="avatars")


@router.post(
    "/upload",
    status_code=HTTP_201_CREATED,
    response_model_exclude_none=True
)
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only images are allowed")

    grid_in = _fs.open_upload_stream(
        file.filename,
        metadata={"contentType": file.content_type}
    )

    data = await file.read()
    try:
        await grid_in.write(data)
    finally:
        await grid_in.close()
        await file.close()

    fid = str(grid_in._id)
    # Cast the URL object to string here:
    public_url = str(request.url_for("serve_avatar", file_id=fid))

    return JSONResponse(
        status_code=HTTP_201_CREATED,
        content={
            "id":  fid,
            "url": public_url
        }
    )

@router.get("/{file_id}", name="serve_avatar")
async def serve_avatar(file_id: str):
    # validate ObjectId
    try:
        oid = ObjectId(file_id)
    except Exception:
        raise HTTPException(400, "Invalid file ID")

    # open the GridFS download stream
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
