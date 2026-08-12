"""
DonApp API — Tokens Module: Service Layer.

Records AI usage/cost per user, applies the hourly cost limit, and manages
the manual USD→COP exchange rate.
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.tokens.models import ExchangeRate, TokenUsage

SEED_USD_TO_COP = Decimal("3157.43")


async def record_usage(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    ai_action: str,
    model_name: str,
    cost_usd: Decimal,
    input_tokens: int = 0,
    output_tokens: int = 0,
    image_count: int = 0,
    video_seconds: int = 0,
    is_estimated: bool = False,
    customer_id: uuid.UUID | None = None,
    post_id: uuid.UUID | None = None,
    product_id: uuid.UUID | None = None,
    service_id: uuid.UUID | None = None,
) -> TokenUsage:
    """Persist a token-usage row."""
    usage = TokenUsage(
        user_id=user_id,
        customer_id=customer_id,
        post_id=post_id,
        product_id=product_id,
        service_id=service_id,
        ai_action=ai_action,
        model_name=model_name,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        image_count=image_count,
        video_seconds=video_seconds,
        cost_usd=cost_usd,
        is_estimated=is_estimated,
    )
    db.add(usage)
    await db.commit()
    await db.refresh(usage)
    return usage


async def get_current_rate(db: AsyncSession) -> ExchangeRate:
    """Return the latest exchange rate, falling back to the seed row."""
    stmt = select(ExchangeRate).order_by(ExchangeRate.updated_at.desc()).limit(1)
    result = await db.execute(stmt)
    rate = result.scalar_one_or_none()
    if rate is None:
        rate = ExchangeRate(usd_to_cop=SEED_USD_TO_COP, updated_by_user_id=None)
        db.add(rate)
        await db.commit()
        await db.refresh(rate)
    return rate


async def get_current_rate_usd_to_cop(db: AsyncSession) -> Decimal:
    rate = await get_current_rate(db)
    return Decimal(rate.usd_to_cop)


async def to_cop(db: AsyncSession, usd: Decimal) -> Decimal:
    """Convert a USD amount to COP using the configured manual rate."""
    rate = await get_current_rate_usd_to_cop(db)
    return (Decimal(usd) * rate).quantize(Decimal("0.01"))


async def get_hourly_usage_usd(db: AsyncSession, user_id: uuid.UUID) -> Decimal:
    """Total USD cost of the user's AI calls in the last hour."""
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    stmt = (
        select(func.coalesce(func.sum(TokenUsage.cost_usd), 0))
        .where(
            TokenUsage.user_id == user_id,
            TokenUsage.created_at >= one_hour_ago,
        )
    )
    result = await db.execute(stmt)
    return Decimal(result.scalar_one() or 0)


async def enforce_hourly_limit(db: AsyncSession, user_id: uuid.UUID) -> None:
    """
    Reject the request with 429 if the user already consumed more than
    ``AI_HOURLY_COST_LIMIT_USD`` in the last hour. Message includes the
    consumed amount in COP.
    """
    used_usd = await get_hourly_usage_usd(db, user_id)
    limit_usd = Decimal(str(settings.AI_HOURLY_COST_LIMIT_USD))
    if used_usd >= limit_usd:
        used_cop = await to_cop(db, used_usd)
        limit_cop = await to_cop(db, limit_usd)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Límite horario de IA alcanzado: has consumido "
                f"${used_cop:,.2f} COP de un límite de ${limit_cop:,.2f} COP. "
                f"Intenta de nuevo más tarde."
            ),
        )


async def update_exchange_rate(
    db: AsyncSession,
    usd_to_cop: Decimal,
    updated_by_user_id: uuid.UUID | None,
) -> ExchangeRate:
    """Store a new manual exchange rate."""
    rate = ExchangeRate(
        usd_to_cop=usd_to_cop,
        updated_by_user_id=updated_by_user_id,
    )
    db.add(rate)
    await db.commit()
    await db.refresh(rate)
    return rate