"""
DonApp API — Wall Module: Public Mention Consent Routes.

Public, unauthenticated endpoints that let a mentioned customer review and
respond to a wall-post mention through a single-use token link (no account
required). Mounted under ``/api/v1`` in ``main.py``.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.notifications.crud import create_notification
from app.modules.notifications.ws import manager as notifications_manager
from app.modules.wall.crud import get_mention_by_token, get_post, respond_to_mention
from app.modules.wall.schemas import (
    MentionRespondRequest,
    PostResponse,
    PublicMentionResponse,
)

router = APIRouter()


def _get_active_mention(mention, token: str):
    """Shared guard: token must exist and not have been responded to already."""
    if mention is None or mention.responded_at is not None:
        raise HTTPException(status_code=404, detail="Enlace inválido o ya utilizado.")
    return mention


@router.get(
    "/public/wall/mentions/{token}",
    response_model=PublicMentionResponse,
    summary="Consulta pública de mención (link de consentimiento)",
)
async def get_public_mention(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> PublicMentionResponse:
    mention = await get_mention_by_token(db, token)
    _get_active_mention(mention, token)

    customer = mention.customer
    post = mention.post
    return PublicMentionResponse(
        business_name=customer.business_name if customer else None,
        trade_name=customer.trade_name if customer else None,
        author_name=post.author.full_name if post and post.author else "Usuario",
        post_snippet=(post.content[:200] if post else ""),
        status=mention.status,
    )


@router.post(
    "/public/wall/mentions/{token}/respond",
    status_code=status.HTTP_200_OK,
    summary="Confirmar o rechazar mención (link de consentimiento)",
)
async def respond_public_mention(
    token: str,
    payload: MentionRespondRequest,
    db: AsyncSession = Depends(get_db),
):
    mention = await get_mention_by_token(db, token)
    _get_active_mention(mention, token)

    await respond_to_mention(db, mention, payload.action)

    # Notify the user who mentioned the customer.
    customer_name = mention.customer.business_name if mention.customer else "Cliente"
    notif = await create_notification(
        db=db,
        user_id=mention.mentioned_by_user_id,
        type="wall_mention_response",
        title="Respuesta de cliente en el Muro",
        message=(
            f"{customer_name} confirmó aparecer en tu publicación."
            if payload.action == "confirm"
            else f"{customer_name} prefirió no aparecer en tu publicación."
        ),
        data_json={
            "post_id": str(mention.post_id),
            "mention_id": str(mention.id),
            "action": payload.action,
        },
    )

    try:
        await notifications_manager.send_to_user(mention.mentioned_by_user_id, {
            "id": str(notif.id),
            "type": notif.type,
            "title": notif.title,
            "message": notif.message,
        })
    except Exception:
        pass  # WebSocket push is best-effort; the DB notification persists.

    # Broadcast post update so open Wall clients refresh in real time.
    post = await get_post(db, mention.post_id)
    if post is not None:
        try:
            from app.modules.wall.router import manager as wall_manager
            await wall_manager.broadcast({
                "event": "post_updated",
                "data": PostResponse.model_validate(post).model_dump(mode="json"),
            })
        except Exception:
            pass  # Broadcast is best-effort.

    return {
        "ok": True,
        "status": "confirmed" if payload.action == "confirm" else "declined",
        "post_id": str(mention.post_id),
    }
