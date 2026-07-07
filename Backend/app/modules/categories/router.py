"""
Servinow API — Categories Module: API Routes.
"""

import logging
from typing import Annotated
import uuid
import re

from fastapi import APIRouter, Depends, Query, status, HTTPException
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

class CategoryCreate(BaseModel):
    name: str
    description: str | None = None
    entity_type: str  # 'product' o 'service'
    parent_id: uuid.UUID | None = None

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

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CategoryResponse:
    if current_user.role not in ["admin", "seller"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear categorías."
        )
    
    # Normalizar nombre y remover espacios extra
    name_clean = category_in.name.strip()
    if not name_clean:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El nombre de la categoría no puede estar vacío."
        )
        
    # Generar slug a partir del nombre
    slug_base = re.sub(r'[^a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ]', '-', name_clean.lower())
    slug_base = re.sub(r'-+', '-', slug_base).strip('-')
    slug = f"{slug_base}-{category_in.entity_type}"
    
    # Verificar si ya existe una categoría con ese slug
    stmt = select(Category).where(Category.slug == slug)
    result = await db.execute(stmt)
    if result.scalars().first() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe una categoría con el nombre '{name_clean}' para este tipo."
        )

    depth = 0
    if category_in.parent_id:
        parent_stmt = select(Category).where(Category.id == category_in.parent_id)
        parent_result = await db.execute(parent_stmt)
        parent = parent_result.scalars().first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La categoría padre especificada no existe."
            )
        depth = parent.depth + 1

    try:
        new_category = Category(
            name=name_clean,
            description=category_in.description,
            slug=slug,
            entity_type=category_in.entity_type,
            parent_id=category_in.parent_id,
            depth=depth,
            status="active"
        )
        db.add(new_category)
        await db.commit()
        await db.refresh(new_category)
        return new_category
    except Exception as e:
        await db.rollback()
        logger.error(f"Error al crear categoría: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor al crear la categoría."
        )