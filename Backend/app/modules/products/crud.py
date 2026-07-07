"""
Servinow API — Products Module: CRUD Operations.

Provides async database operations for products.
All functions receive an ``AsyncSession`` injected via FastAPI dependency.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.products.models import Product
from app.modules.products.schemas import ProductCreate, ProductUpdate


async def get_products(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    category_id: uuid.UUID | None = None,
    status: str | None = None,
    user_id: uuid.UUID | None = None,
) -> list[Product]:
    """
    Retrieve paginated products with optional filtering.

    Args:
        db: Active async database session.
        skip: Number of records to skip (offset).
        limit: Maximum number of products to return.
        category_id: Optional category ID filter.
        status: Optional status filter.
        user_id: Optional user ID filter to get products created by a specific user.

    Returns:
        List of ``Product`` instances ordered by created_at descending.
    """
    stmt = select(Product).order_by(Product.created_at.desc()).offset(skip).limit(limit)

    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if status:
        stmt = stmt.where(Product.status == status)
    if user_id:
        stmt = stmt.where(Product.user_id == user_id)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_product(db: AsyncSession, product_id: uuid.UUID) -> Product | None:
    """Retrieve a single product by ID."""
    stmt = select(Product).where(Product.id == product_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_product(db: AsyncSession, product_in: ProductCreate, user_id: uuid.UUID) -> Product:
    """
    Create a new product.

    Args:
        db: Active async database session.
        product_in: Validated product creation payload.
        user_id: ID of the user creating the product.

    Returns:
        The newly created ``Product`` instance.
    """
    db_product = Product(
        name=product_in.name,
        description=product_in.description,
        category_id=product_in.category_id,
        price=product_in.price,
        stock=product_in.stock,
        status=product_in.status,
        image_url=product_in.image_url,
        video_url=product_in.video_url,
        user_id=user_id,
    )
    db.add(db_product)
    await db.commit()
    await db.refresh(db_product)
    return db_product


async def update_product(
    db: AsyncSession,
    db_product: Product,
    product_in: ProductUpdate,
) -> Product:
    """Update an existing product."""
    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_product, field, value)
    db.add(db_product)
    await db.commit()
    await db.refresh(db_product)
    return db_product


async def delete_product(db: AsyncSession, db_product: Product) -> None:
    """Delete a product."""
    await db.delete(db_product)
    await db.commit()