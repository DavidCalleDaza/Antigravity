"""
DonApp API — Tokens Module: API Routes.

Mounted under ``/api/v1/tokens``. Admins see all usage; regular users only
their own records.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.billing.models import Customer
from app.modules.tokens import service
from app.modules.tokens.models import TokenUsage
from app.modules.tokens.schemas import (
    ExchangeRateResponse,
    ExchangeRateUpdate,
    HourlyUsageResponse,
    UsageRow,
)

router = APIRouter()


def _is_admin(user: User) -> bool:
    return user.role == "admin"


def _parse_group_by(value: str) -> str:
    value = (value or "user").lower()
    if value not in {"user", "customer", "post"}:
        raise HTTPException(status_code=400, detail="group_by debe ser user, customer o post.")
    return value


@router.get("/usage", response_model=list[UsageRow], summary="Uso de tokens (agrupado)")
async def get_usage(
    group_by: str = Query("user", description="Agrupar por user | customer | post"),
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[UsageRow]:
    from app.modules.auth.models import User as AuthUser

    admin = _is_admin(current_user)
    group_col = {
        "user": TokenUsage.user_id,
        "customer": TokenUsage.customer_id,
        "post": TokenUsage.post_id,
    }[_parse_group_by(group_by)]

    stmt = (
        select(
            group_col,
            func.count(TokenUsage.id),
            func.coalesce(func.sum(TokenUsage.cost_usd), 0),
            func.coalesce(func.sum(TokenUsage.input_tokens), 0),
            func.coalesce(func.sum(TokenUsage.output_tokens), 0),
        )
        .group_by(group_col)
        .order_by(func.coalesce(func.sum(TokenUsage.cost_usd), 0).desc())
    )
    if not admin:
        stmt = stmt.where(TokenUsage.user_id == current_user.id)
    if from_date is not None:
        stmt = stmt.where(TokenUsage.created_at >= from_date)
    if to_date is not None:
        stmt = stmt.where(TokenUsage.created_at <= to_date)

    result = await db.execute(stmt)
    rows = result.all()

    rate = await service.get_current_rate_usd_to_cop(db)
    labels: dict = {}
    key_column = {
        "user": "user_id",
        "customer": "customer_id",
        "post": "post_id",
    }[_parse_group_by(group_by)]
    if group_by in {"user", "customer"}:
        model = AuthUser if group_by == "user" else Customer
        ids = [r[0] for r in rows if r[0] is not None]
        if ids:
            from sqlalchemy.orm import selectinload
            stmt_objs = select(model).where(model.id.in_(ids))
            if group_by == "customer":
                stmt_objs = stmt_objs.options(selectinload(Customer.location))
            objs = (await db.execute(stmt_objs)).scalars().all()
            labels = {
                o.id: (o.full_name if group_by == "user" else (o.business_name or o.trade_name))
                for o in objs
            }

    return [
        UsageRow(
            key=r[0],
            label=labels.get(r[0]),
            total_cost_usd=float(r[2]),
            total_cost_cop=float((Decimal(r[2]) * rate).quantize(Decimal("0.01"))),
            calls=r[1],
            input_tokens=r[3],
            output_tokens=r[4],
        )
        for r in rows
    ]


@router.get("/usage/hourly", response_model=HourlyUsageResponse, summary="Consumo horario del usuario")
async def get_hourly_usage(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HourlyUsageResponse:
    used_usd = await service.get_hourly_usage_usd(db, current_user.id)
    limit_usd = Decimal(str(settings.AI_HOURLY_COST_LIMIT_USD))
    rate = await service.get_current_rate_usd_to_cop(db)
    used_cop = (used_usd * rate).quantize(Decimal("0.01"))
    limit_cop = (limit_usd * rate).quantize(Decimal("0.01"))
    return HourlyUsageResponse(
        limit_usd=float(limit_usd),
        used_usd=float(used_usd),
        limit_cop=float(limit_cop),
        used_cop=float(used_cop),
        remaining_cop=float((limit_cop - used_cop).quantize(Decimal("0.01"))),
    )


@router.get("/exchange-rate", response_model=ExchangeRateResponse, summary="Tasa de cambio USD→COP")
async def get_exchange_rate(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ExchangeRateResponse:
    rate = await service.get_current_rate(db)
    return ExchangeRateResponse(
        usd_to_cop=float(rate.usd_to_cop),
        updated_at=rate.updated_at,
    )


@router.put("/exchange-rate", response_model=ExchangeRateResponse, summary="Actualizar tasa de cambio (admin)")
async def update_exchange_rate(
    payload: ExchangeRateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExchangeRateResponse:
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo administradores pueden actualizar la tasa de cambio.")
    rate = await service.update_exchange_rate(
        db,
        Decimal(str(payload.usd_to_cop)),
        updated_by_user_id=current_user.id,
    )
    return ExchangeRateResponse(
        usd_to_cop=float(rate.usd_to_cop),
        updated_at=rate.updated_at,
    )