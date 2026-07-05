"""
Servinow API — Categories Module: API Routes.
"""

import logging
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.categories.models import Category
from pydantic import BaseModel, ConfigDict

router = APIRouter()
logger = logging.getLogger(__name__)

# Definimos un esquema de respuesta rápido para categorías
class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    parent_id: uuid.UUID | None
    name: str
    description: str | None
    slug: str
    entity_type: str | None
    status: str
    depth: int

@router.get("", response_model=list[CategoryResponse], status_code=status.HTTP_200_OK)
async def list_categories(
    entity_type: Annotated[str | None, Query(description="Filtrar por tipo (product o service).")] = "product",
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[CategoryResponse]:
    try:
        stmt = (
            select(Category)
            .where(
                Category.status == "active",
                Category.entity_type == entity_type  # ← solo las que tienen entity_type exacto
            )
            .order_by(Category.depth.asc(), Category.name.asc())
        )
        result = await db.execute(stmt)
        categories = result.scalars().all()
        return [CategoryResponse.model_validate(c) for c in categories]
    except Exception as e:
        logger.error(f"Error al listar categorías: {e}")
        raise