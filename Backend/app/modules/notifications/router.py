import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.core.security import decode_access_token
from app.modules.notifications.schemas import NotificationResponse
from app.modules.notifications import crud
from app.modules.notifications.ws import manager

router = APIRouter()

@router.websocket("/ws/notifications")
async def websocket_notifications(
    websocket: WebSocket,
    token: str = Query(..., description="JWT Bearer token"),
):
    """
    WebSocket endpoint for real-time notifications.
    Authenticates via JWT token in query string.
    """
    payload = decode_access_token(token)
    if payload is None:
        await websocket.close(code=1008)
        return
    user_id_str: str | None = payload.get("sub")
    if user_id_str is None:
        await websocket.close(code=1008)
        return
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        await websocket.close(code=1008)
        return
        
    await manager.connect(websocket, user_id)
    try:
        while True:
            # We don't expect messages from client in this unidirectional push model,
            # but we need to keep the connection open.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket, user_id)
    except Exception:
        await manager.disconnect(websocket, user_id)

@router.get(
    "",
    response_model=list[NotificationResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar notificaciones del usuario",
)
async def list_notifications(
    unread_only: bool = Query(False, description="Filtrar solo no leídas"),
    skip: Annotated[int, Query(description="Número de registros a omitir.", ge=0)] = 0,
    limit: Annotated[int, Query(description="Máximo de notificaciones a retornar.", ge=1, le=100)] = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifs = await crud.get_user_notifications(db, current_user.id, unread_only, skip, limit)
    return [NotificationResponse.model_validate(n) for n in notifs]

@router.get(
    "/unread-count",
    status_code=status.HTTP_200_OK,
    summary="Obtener contador de no leídas",
)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = await crud.get_unread_count(db, current_user.id)
    return {"count": count}

@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Marcar notificación como leída",
)
async def mark_notification_as_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = await crud.mark_as_read(db, notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    if notif.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    return NotificationResponse.model_validate(notif)
