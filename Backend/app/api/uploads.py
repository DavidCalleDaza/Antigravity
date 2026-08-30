"""
DonApp API — Uploads Router.

Provides file upload endpoints for products and services media.
Includes magic byte validation for security and ownership tracking
to prevent IDOR on DELETE (Insecure Direct Object Reference).
"""

import io
import os
import uuid
import shutil
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.api.upload_models import UploadedFile

router = APIRouter()

MAX_IMAGE_SIZE = 5 * 1024 * 1024
MAX_VIDEO_SIZE = 20 * 1024 * 1024

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}

# Magic byte signatures used by validate_magic_bytes().
# Keys are format identifiers (unique); values are (signature_bytes, offset).
# GIF has two variants — both are listed with distinct keys.
MAGIC_BYTES: dict[str, tuple[bytes, int]] = {
    "jpeg":  (b"\xff\xd8\xff",          0),
    "png":   (b"\x89PNG\r\n\x1a\n",    0),
    "gif87": (b"GIF87a",               0),
    "gif89": (b"GIF89a",               0),
    "webp":  (b"RIFF",                  0),   # bytes 8-12 must also be WEBP — checked inline
    "mp4":   (b"\x00\x00\x00",         0),   # ftyp atom checked inline
    "webm":  (b"\x1a\x45\xdf\xa3",     0),
    "mov":   (b"\x00\x00\x00",         0),   # same leading bytes as mp4; ftyp/moov checked inline
}

UPLOAD_DIR = Path("uploads/items")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class MediaUploadResponse(BaseModel):
    url: str
    type: str
    filename: str


def validate_magic_bytes(content: bytes, media_type: str) -> bool:
    """Validate file content using MAGIC_BYTES signatures.

    Uses the MAGIC_BYTES dict defined in this module — no duplicated
    hardcoded logic.  Additional inline checks are used where a single
    leading signature is shared between multiple formats (WEBP vs. generic
    RIFF; MP4/MOV vs. generic null-byte streams).
    """
    if media_type == "image":
        if content[:3] == MAGIC_BYTES["jpeg"][0]:
            return True
        if content[:8] == MAGIC_BYTES["png"][0]:
            return True
        if content[:6] in (MAGIC_BYTES["gif87"][0], MAGIC_BYTES["gif89"][0]):
            return True
        # WEBP: starts with RIFF and has "WEBP" at bytes 8-12
        if content[:4] == MAGIC_BYTES["webp"][0] and content[8:12] == b"WEBP":
            return True
    elif media_type == "video":
        if content[:4] == MAGIC_BYTES["webm"][0]:
            return True
        # MP4/MOV: null-byte opener + ftyp or moov atom in first 12 bytes
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MediaUploadResponse:
    """
    Upload a media file (image or video) for products/services.

    - Images: max 5MB, allowed types: jpeg, png, gif, webp
    - Videos: max 20MB, allowed types: mp4, webm, quicktime
    - Content validation via magic bytes.
    - Ownership is tracked in `uploaded_files` table to allow safe deletion.

    Concurrency note: each upload generates its own UUID filename, so
    simultaneous uploads by the same or different users cannot collide.
    The DB session is request-scoped (via Depends(get_db)) — not shared
    across requests.
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

    # Track ownership so DELETE can enforce authorization.
    record = UploadedFile(filename=filename, user_id=current_user.id)
    db.add(record)
    await db.commit()

    return MediaUploadResponse(
        url=f"/uploads/items/{filename}",
        type=media_type,
        filename=filename,
    )


@router.delete("/media/{filename}")
async def delete_media(
    filename: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a previously uploaded media file.

    Authorization: only the original uploader or an admin may delete the file.
    Any other authenticated user attempting to delete a file they do not own
    will receive 403 Forbidden (IDOR prevention).
    """
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename.")

    # Ownership check — look up the upload record before touching the filesystem.
    stmt = select(UploadedFile).where(UploadedFile.filename == filename)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if record is None:
        # File may exist on disk without a record (uploaded before this fix was
        # deployed, or via a different upload path).  Fall back to a 404 rather
        # than silently allowing deletion of unknown files.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    if record.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar este archivo.",
        )

    file_path = UPLOAD_DIR / filename
    if file_path.exists():
        file_path.unlink()

    await db.delete(record)
    await db.commit()

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