"""
DonApp API — Categories Module: API Routes.
"""

import logging
from typing import Annotated
import uuid
import re

from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.auth.deps import get_current_user, require_seller
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

class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    parent_id: uuid.UUID | None = None
    status: str | None = None  # 'active' | 'inactive'

@router.get("", response_model=list[CategoryResponse], status_code=status.HTTP_200_OK)
async def list_categories(
    entity_type: Annotated[str | None, Query(description="Filtrar por tipo (product o service).")] = "product",
    active_only: Annotated[bool, Query(description="Filtrar solo categorías activas.")] = True, # <-- Agregamos el parámetro aquí
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[CategoryResponse]:
    try:
        # Construimos las condiciones dinámicas
        conditions = [or_(Category.entity_type == entity_type, Category.entity_type.is_(None))]
        
        # Si active_only es True (por defecto), filtramos solo las activas.
        # Si es False (cuando pides Inactivos/Todos), no aplicamos este filtro y traerá ambas.
        if active_only:
            conditions.append(Category.status == "active")

        stmt = (
            select(Category)
            .where(*conditions)
            .order_by(Category.depth.asc(), Category.name.asc())
        )
        result = await db.execute(stmt)
        all_categories = result.scalars().all()

        children_map = {}
        for c in all_categories:
            children_map.setdefault(c.parent_id, []).append(c)

        def subtree_has_match(cat) -> bool:
            if cat.entity_type == entity_type:
                return True
            return any(subtree_has_match(child) for child in children_map.get(cat.id, []))

        filtered = [
            c for c in all_categories
            if c.entity_type == entity_type or (c.entity_type is None and subtree_has_match(c))
        ]
        return [CategoryResponse.model_validate(c) for c in filtered]
    except Exception as e:
        logger.error(f"Error al listar categorías: {e}")
        raise

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
) -> CategoryResponse:
    # Role check delegated to require_seller dependency above.
    
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


@router.patch("/{category_id}", response_model=CategoryResponse, status_code=status.HTTP_200_OK)
async def update_category(
    category_id: uuid.UUID,
    category_in: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
) -> CategoryResponse:
    """
    Actualiza una categoría existente. No permite reasignar entity_type
    (product/service) porque cambiaría el árbol de forma inconsistente con
    los productos/servicios ya asociados — para eso se crea una nueva.
    """
    # Role check delegated to require_seller dependency above.

    stmt = select(Category).where(Category.id == category_id)
    result = await db.execute(stmt)
    db_category = result.scalars().first()
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada."
        )

    update_data = category_in.model_dump(exclude_unset=True)

    # Evitar que una categoría se convierta en su propio padre
    if "parent_id" in update_data and update_data["parent_id"] == category_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Una categoría no puede ser su propio padre."
        )

    # Si cambia el nombre, regenerar el slug (mismo patrón que en create_category)
    if "name" in update_data and update_data["name"]:
        name_clean = update_data["name"].strip()
        if not name_clean:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El nombre de la categoría no puede estar vacío."
            )
        slug_base = re.sub(r'[^a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ]', '-', name_clean.lower())
        slug_base = re.sub(r'-+', '-', slug_base).strip('-')
        new_slug = f"{slug_base}-{db_category.entity_type}"

        if new_slug != db_category.slug:
            dup_stmt = select(Category).where(Category.slug == new_slug, Category.id != category_id)
            dup_result = await db.execute(dup_stmt)
            if dup_result.scalars().first() is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ya existe una categoría con el nombre '{name_clean}' para este tipo."
                )
            db_category.slug = new_slug
        update_data["name"] = name_clean

    # Recalcular depth si cambia el padre
    if "parent_id" in update_data:
        if update_data["parent_id"]:
            parent_stmt = select(Category).where(Category.id == update_data["parent_id"])
            parent_result = await db.execute(parent_stmt)
            parent = parent_result.scalars().first()
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="La categoría padre especificada no existe."
                )
            db_category.depth = parent.depth + 1
        else:
            db_category.depth = 0

    for field, value in update_data.items():
        setattr(db_category, field, value)

    try:
        db.add(db_category)
        await db.commit()
        await db.refresh(db_category)
        return db_category
    except Exception as e:
        await db.rollback()
        logger.error(f"Error al actualizar categoría: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor al actualizar la categoría."
        )


# --- Funciones auxiliares para la consistencia del árbol jerárquico ---

async def is_descendant(db: AsyncSession, potential_descendant_id: uuid.UUID, ancestor_id: uuid.UUID) -> bool:
    """
    Verifica de forma iterativa si una categoría (potential_descendant_id) 
    es descendiente de otra (ancestor_id).
    """
    current_id = potential_descendant_id
    while current_id is not None:
        stmt = select(Category.parent_id).where(Category.id == current_id)
        result = await db.execute(stmt)
        parent_id = result.scalar_one_or_none()
        if parent_id == ancestor_id:
            return True
        current_id = parent_id
    return False

async def update_descendants_depth(db: AsyncSession, root_id: uuid.UUID, new_root_depth: int) -> None:
    """
    Actualiza la profundidad de todos los descendientes en memoria con una única consulta
    a la base de datos para prevenir agotamiento del pool de conexiones o deadlocks.
    """
    # 1. Traer todas las categorías activas en una sola consulta
    stmt = select(Category).where(Category.status == "active")
    result = await db.execute(stmt)
    all_categories = result.scalars().all()
    
    # 2. Mapear relaciones padre -> hijos en memoria
    by_parent = {}
    for cat in all_categories:
        if cat.parent_id:
            by_parent.setdefault(cat.parent_id, []).append(cat)
            
    # 3. Recorrer el árbol recursivamente en memoria
    def walk_and_update(parent_id, current_depth):
        children = by_parent.get(parent_id, [])
        for child in children:
            child.depth = current_depth + 1
            db.add(child)  # Marcar como modificado para la sesión
            walk_and_update(child.id, child.depth)
            
    walk_and_update(root_id, new_root_depth)


@router.patch("/{category_id}", response_model=CategoryResponse, status_code=status.HTTP_200_OK)
async def update_category(
    category_id: uuid.UUID,
    category_in: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
) -> CategoryResponse:
    """
    Actualiza una categoría existente y sus dependientes de forma segura.
    """
    # Role check delegated to require_seller dependency above.

    stmt = select(Category).where(Category.id == category_id)
    result = await db.execute(stmt)
    db_category = result.scalars().first()
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada."
        )

    update_data = category_in.model_dump(exclude_unset=True)

    # Evitar asignarse a sí misma como padre
    if "parent_id" in update_data and update_data["parent_id"] == category_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Una categoría no puede ser su propio padre."
        )

    # Validar bucles de ancestros
    if "parent_id" in update_data and update_data["parent_id"]:
        if await is_descendant(db, update_data["parent_id"], category_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede mover la categoría dentro de una de sus subcategorías."
            )

    # Gestión de Slug si cambia el nombre
    if "name" in update_data and update_data["name"]:
        name_clean = update_data["name"].strip()
        if not name_clean:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El nombre de la categoría no puede estar vacío."
            )
        slug_base = re.sub(r'[^a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ]', '-', name_clean.lower())
        slug_base = re.sub(r'-+', '-', slug_base).strip('-')
        new_slug = f"{slug_base}-{db_category.entity_type}"

        if new_slug != db_category.slug:
            dup_stmt = select(Category).where(Category.slug == new_slug, Category.id != category_id)
            dup_result = await db.execute(dup_stmt)
            if dup_result.scalars().first() is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ya existe una categoría con el nombre '{name_clean}' para este tipo."
                )
            db_category.slug = new_slug
        update_data["name"] = name_clean

    # Recalcular profundidad
    depth_changed = False
    if "parent_id" in update_data:
        depth_changed = True
        if update_data["parent_id"]:
            parent_stmt = select(Category).where(Category.id == update_data["parent_id"])
            parent_result = await db.execute(parent_stmt)
            parent = parent_result.scalars().first()
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="La categoría padre especificada no existe."
                )
            db_category.depth = parent.depth + 1
        else:
            db_category.depth = 0

    for field, value in update_data.items():
        setattr(db_category, field, value)

    try:
        db.add(db_category)
        if depth_changed:
            # Ejecución en memoria limpia de dependientes
            await update_descendants_depth(db, db_category.id, db_category.depth)
            
        await db.commit()
        await db.refresh(db_category)
        return db_category
    except Exception as e:
        await db.rollback()
        logger.error(f"Error al actualizar categoría: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor al actualizar la categoría."
        )

@router.delete("/{category_id}", status_code=status.HTTP_200_OK)
async def delete_category(
    category_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
) -> dict:
    """
    Elimina (soft-delete) una categoría marcándola como 'inactive'.
    No se hace hard-delete para no romper productos/servicios que ya
    la referencian por category_id.

    Bloquea el borrado si la categoría tiene subcategorías activas —
    el usuario debe reasignarlas o borrarlas primero.
    """
    # Role check delegated to require_seller dependency above.

    stmt = select(Category).where(Category.id == category_id)
    result = await db.execute(stmt)
    db_category = result.scalars().first()
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada."
        )

    children_stmt = select(func.count(Category.id)).where(
        Category.parent_id == category_id,
        Category.status == "active",
    )
    children_count = (await db.execute(children_stmt)).scalar() or 0
    if children_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar: esta categoría tiene subcategorías activas. Reasígnalas o elimínalas primero."
        )

    try:
        db_category.status = "inactive"
        db.add(db_category)
        await db.commit()
        return {"success": True, "message": "Categoría eliminada correctamente."}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error al eliminar categoría: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor al eliminar la categoría."
        )