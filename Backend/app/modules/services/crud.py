"""
Servinow API — Services Module: CRUD Operations.

Provides async database operations for services.
All functions receive an ``AsyncSession`` injected via FastAPI dependency.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.services.models import Service, ServiceCategory
from app.modules.services.schemas import ServiceCreate, ServiceUpdate


async def get_categories(db: AsyncSession) -> list[ServiceCategory]:
    """Retrieve all service categories ordered by name."""
    stmt = select(ServiceCategory).order_by(ServiceCategory.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_services(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    category_id: uuid.UUID | None = None,
    status: str | None = None,
    user_id: uuid.UUID | None = None,
) -> list[Service]:
    """
    Retrieve paginated services with optional filtering.

    Args:
        db: Active async database session.
        skip: Number of records to skip (offset).
        limit: Maximum number of services to return.
        category_id: Optional category ID filter.
        status: Optional status filter.
        user_id: Optional user ID filter to get services created by a specific user.

    Returns:
        List of ``Service`` instances ordered by created_at descending.
    """
    stmt = select(Service).order_by(Service.created_at.desc()).offset(skip).limit(limit)

    if category_id:
        stmt = stmt.where(Service.category_id == category_id)
    if status:
        stmt = stmt.where(Service.status == status)
    if user_id:
        stmt = stmt.where(Service.user_id == user_id)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_service(db: AsyncSession, service_id: uuid.UUID) -> Service | None:
    """Retrieve a single service by ID."""
    stmt = select(Service).where(Service.id == service_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_service(db: AsyncSession, service_in: ServiceCreate, user_id: uuid.UUID) -> Service:
    """
    Create a new service.

    Args:
        db: Active async database session.
        service_in: Validated service creation payload.
        user_id: ID of the user creating the service.

    Returns:
        The newly created ``Service`` instance.
    """
    db_service = Service(
        name=service_in.name,
        description=service_in.description,
        category_id=service_in.category_id,
        price=service_in.price,
        duration=service_in.duration,
        status=service_in.status,
        image_url=service_in.image_url,
        video_url=service_in.video_url,
        user_id=user_id,
    )
    db.add(db_service)
    await db.commit()
    await db.refresh(db_service)
    return db_service


async def update_service(
    db: AsyncSession,
    db_service: Service,
    service_in: ServiceUpdate,
) -> Service:
    """Update an existing service."""
    update_data = service_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_service, field, value)
    db.add(db_service)
    await db.commit()
    await db.refresh(db_service)
    return db_service


async def delete_service(db: AsyncSession, db_service: Service) -> None:
    """Delete a service."""
    await db.delete(db_service)
    await db.commit()