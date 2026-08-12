"""
DonApp API — Wall Module: Celery Tasks.

Background job that emails the mentioned customer the single-use consent link
so they can confirm (or decline) appearing on a wall post.
"""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.email import send_email
from app.db.session import async_session_factory
from app.modules.wall.models import Post, PostCustomerMention

logger = logging.getLogger(__name__)


async def _send_mention_email(mention_id: str):
    async with async_session_factory() as db:
        stmt = (
            select(PostCustomerMention)
            .options(
                selectinload(PostCustomerMention.customer),
                selectinload(PostCustomerMention.post).selectinload(Post.author),
            )
            .where(PostCustomerMention.id == uuid.UUID(mention_id))
        )
        result = await db.execute(stmt)
        mention = result.scalar_one_or_none()

        if not mention:
            logger.error(f"Mención {mention_id} no encontrada, no se puede enviar email.")
            return

        customer_email = mention.customer.email if mention.customer else None
        if not customer_email:
            logger.error(
                f"Mención {mention_id}: cliente sin email, no se puede enviar el consentimiento."
            )
            return

        ok = send_email(
            to=customer_email,
            subject="Te mencionamos en el Muro de Impacto — confirma tu participación",
            template_name="wall_mention.html",
            context={
                "company_name": settings.COMPANY_NAME,
                "company_phone": settings.COMPANY_PHONE,
                "company_city": settings.COMPANY_CITY,
                "customer_name": mention.customer.business_name or mention.customer.trade_name or "Cliente",
                "author_name": mention.post.author.full_name if mention.post and mention.post.author else "Un usuario",
                "frontend_url": settings.FRONTEND_URL,
                "token": mention.confirm_token,
            },
        )
        if not ok:
            # SMTP no configurado o falló: se reporta y NO se reintenta.
            logger.error(
                f"Mención {mention_id}: SMTP no configurado o falló el envío del email "
                f"de consentimiento a {customer_email}."
            )


@celery_app.task(
    name="wall.send_customer_mention_notification",
    bind=True,
    max_retries=3,
    ignore_result=True,  # Fire-and-forget: no result backend round-trip.
)
def send_customer_mention_notification(self, mention_id: str):
    """Email the mentioned customer their single-use consent link."""
    loop = celery_app._worker_loop
    try:
        if loop is None:
            import asyncio
            asyncio.run(_send_mention_email(mention_id))
        else:
            loop.run_until_complete(_send_mention_email(mention_id))
    except Exception as exc:
        # Unexpected errors (e.g. DB down) get a retry with backoff.
        logger.warning(f"send_customer_mention_notification falló: {exc}")
        raise self.retry(exc=exc, countdown=30)