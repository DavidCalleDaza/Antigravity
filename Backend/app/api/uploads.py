"""
Servinow API — Uploads Router.

Provides file upload endpoints for products and services media.
Includes magic byte validation for security.
"""

import io
import os
import uuid
import shutil
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User

router = APIRouter()

MAX_IMAGE_SIZE = 5 * 1024 * 1024
MAX_VIDEO_SIZE = 20 * 1024 * 1024

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}

MAGIC_BYTES = {
    "jpeg": (b"\xff\xd8\xff", 3),
    "png": (b"\x89PNG\r\n\x1a\n", 7),
    "gif": (b"GIF87a", 6),
    "gif": (b"GIF89a", 6),
    "webp": (b"RIFF", 0),
    "mp4": (b"\x00\x00\x00", 0),
    "webm": (b"\x1a\x45\xdf\xa3", 0),
    "mov": (b"\x00\x00\x00", 0),
}

UPLOAD_DIR = Path("uploads/items")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class MediaUploadResponse(BaseModel):
    url: str
    type: str
    filename: str


def validate_magic_bytes(content: bytes, media_type: str) -> bool:
    """Validate file content using magic bytes signature."""
    if media_type == "image":
        if content.startswith(b"\xff\xd8\xff"):
            return True
        if content.startswith(b"\x89PNG\r\n\x1a\n"):
            return True
        if content.startswith(b"GIF87a") or content.startswith(b"GIF89a"):
            return True
        if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
            return True
    elif media_type == "video":
        if content.startswith(b"\x00\x00\x00"):
            pass
        if content.startswith(b"\x1a\x45\xdf\xa3"):
            return True
        if b"ftyp" in content[:12] or b"moov" in content[:12]:
            return True
    return False


async def _read_and_validate(file: UploadFile, max_size: int, expected_type: str):
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size: {'5MB' if expected_type == 'image' else '20MB'}.",
        )

    if not validate_magic_bytes(content[:8192], expected_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File content does not match expected {expected_type} type.",
        )

    await file.seek(0)
    return content


@router.post("/media", response_model=MediaUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
) -> MediaUploadResponse:
    """
    Upload a media file (image or video) for products/services.

    - Images: max 5MB, allowed types: jpeg, png, gif, webp
    - Videos: max 20MB, allowed types: mp4, webm, quicktime
    - Content validation via magic bytes.
    """
    content_type = file.content_type or ""

    if content_type in ALLOWED_IMAGE_TYPES:
        max_size = MAX_IMAGE_SIZE
        media_type = "image"
        expected_ext = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    elif content_type in ALLOWED_VIDEO_TYPES:
        max_size = MAX_VIDEO_SIZE
        media_type = "video"
        expected_ext = {".mp4", ".webm", ".mov"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {content_type}. Use images (jpeg, png, gif, webp) or videos (mp4, webm, quicktime).",
        )

    await _read_and_validate(file, max_size, media_type)

    original_ext = Path(file.filename or "file").suffix.lower()
    if original_ext not in expected_ext:
        original_ext = ".bin"

    filename = f"{uuid.uuid4()}{original_ext}"
    file_path = UPLOAD_DIR / filename

    await file.seek(0)
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return MediaUploadResponse(
        url=f"/uploads/items/{filename}",
        type=media_type,
        filename=filename,
    )


@router.delete("/media/{filename}")
async def delete_media(
    filename: str,
    _: User = Depends(get_current_user),
):
    """Delete a previously uploaded media file."""
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename.")

    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    file_path.unlink()
    return {"detail": "File deleted."}


def cleanup_file(filepath: str) -> None:
    """Background task to remove file from disk."""
    p = Path(filepath)
    if p.exists():
        try:
            p.unlink()
        except OSError:
            pass


def schedule_file_cleanup(filename: str) -> None:
    """Schedule file cleanup if filename is present in uploads/items."""
    if not filename:
        return
    filepath = UPLOAD_DIR / filename
    if filepath.exists():
        cleanup_file(str(filepath))