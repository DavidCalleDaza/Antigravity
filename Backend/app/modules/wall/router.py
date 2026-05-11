"""
Servinow API — Wall Module: API Routes.

Defines endpoints for wall posts, comments, and real-time WebSocket events.
Mounted under ``/api/v1/wall`` via the main application.
"""

import json
import uuid
import shutil
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status, File, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.wall.crud import (
    create_comment,
    create_post,
    delete_comment,
    delete_post,
    get_comment,
    get_post,
    get_posts,
    update_comment,
    update_post,
)
from app.modules.wall.schemas import (
    CommentCreate,
    CommentResponse,
    CommentUpdate,
    PostCreate,
    PostResponse,
    PostUpdate,
)

router = APIRouter()


class ConnectionManager:
    """
    Manages active WebSocket connections for the Wall module.

    Stores connections in a set and broadcasts messages to all connected clients.
    """

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)

    async def broadcast(self, message: dict) -> None:
        """
        Send a JSON message to all connected WebSocket clients.
        """
        if not self._connections:
            return
        payload = json.dumps(message, default=str).encode("utf-8")
        dead: set[WebSocket] = set()
        for ws in self._connections:
            try:
                await ws.send_bytes(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._connections.discard(ws)


manager = ConnectionManager()


@router.websocket("/ws/wall")
async def websocket_wall(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for real-time Wall events.
    """
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@router.get(
    "",
    response_model=list[PostResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar posts",
)
async def list_posts(
    skip: Annotated[int, Query(description="Número de registros a omitir.", ge=0)] = 0,
    limit: Annotated[int, Query(description="Máximo de posts a retornar.", ge=1, le=100)] = 20,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[PostResponse]:
    posts = await get_posts(db, skip=skip, limit=limit)
    return [PostResponse.model_validate(post) for post in posts]


@router.post(
    "",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear post",
)
async def create_wall_post(
    post_in: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PostResponse:
    post = await create_post(db, post_in, current_user)
    response = PostResponse.model_validate(post)
    await manager.broadcast({"event": "new_post", "data": response.model_dump(mode="json")})
    return response


@router.post(
    "/{post_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear comentario",
)
async def create_wall_comment(
    post_id: uuid.UUID,
    comment_in: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CommentResponse:
    comment = await create_comment(db, post_id, comment_in, current_user)
    response = CommentResponse.model_validate(comment)
    await manager.broadcast({"event": "new_comment", "data": response.model_dump(mode="json")})
    return response


@router.patch(
    "/{post_id}",
    response_model=PostResponse,
    summary="Editar post",
)
async def update_wall_post(
    post_id: uuid.UUID,
    post_in: PostUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PostResponse:
    db_post = await get_post(db, post_id)
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
    if db_post.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    post = await update_post(db, db_post, post_in)
    response = PostResponse.model_validate(post)
    await manager.broadcast({"event": "post_updated", "data": response.model_dump(mode="json")})
    return response


@router.delete(
    "/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar post",
)
async def delete_wall_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_post = await get_post(db, post_id)
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
    if db_post.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await delete_post(db, db_post)
    await manager.broadcast({"event": "post_deleted", "data": {"id": str(post_id)}})
    return None


@router.patch(
    "/{post_id}/comments/{comment_id}",
    response_model=CommentResponse,
    summary="Editar comentario",
)
async def update_wall_comment(
    post_id: uuid.UUID,
    comment_id: uuid.UUID,
    comment_in: CommentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CommentResponse:
    db_comment = await get_comment(db, comment_id)
    if not db_comment or db_comment.post_id != post_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    if db_comment.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    comment = await update_comment(db, db_comment, comment_in)
    response = CommentResponse.model_validate(comment)
    await manager.broadcast({"event": "comment_updated", "data": response.model_dump(mode="json")})
    return response


@router.delete(
    "/{post_id}/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar comentario",
)
async def delete_wall_comment(
    post_id: uuid.UUID,
    comment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_comment = await get_comment(db, comment_id)
    if not db_comment or db_comment.post_id != post_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    if db_comment.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await delete_comment(db, db_comment)
    await manager.broadcast({"event": "comment_deleted", "data": {"id": str(comment_id), "post_id": str(post_id)}})
    return None


@router.get(
    "/users/search",
    summary="Buscar usuarios para menciones",
)
async def search_users(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(User).where(User.full_name.ilike(f"%{q}%")).limit(5)
    result = await db.execute(stmt)
    users = result.scalars().all()
    return [{"id": str(u.id), "full_name": u.full_name, "avatar_url": u.avatar_url} for u in users]


@router.post("/upload", summary="Subir archivo multimedia")
async def upload_media(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    upload_dir = Path("uploads/wall")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_extension = Path(file.filename).suffix
    file_name = f"{uuid.uuid4()}{file_extension}"
    file_path = upload_dir / file_name
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"url": f"/uploads/wall/{file_name}", "type": file.content_type}
