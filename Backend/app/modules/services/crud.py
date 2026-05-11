"""
Servinow API — Services Module: CRUD Operations.

Provides async database operations for services.
All functions receive an ``AsyncSession`` injected via FastAPI dependency.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.services.models import Service
from app.modules.services.schemas import ServiceCreate, ServiceUpdate


async def get_services(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    category: str | None = None,
    status: str | None = None,
) -> list[Service]:
    """
    Retrieve paginated services with optional filtering.

    Args:
        db: Active async database session.
        skip: Number of records to skip (offset).
        limit: Maximum number of services to return.
        category: Optional category filter.
        status: Optional status filter.

    Returns:
        List of ``Service`` instances ordered by created_at descending.
    """
    stmt = select(Service).order_by(Service.created_at.desc()).offset(skip).limit(limit)

    if category:
        stmt = stmt.where(Service.category == category)
    if status:
        stmt = stmt.where(Service.status == status)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_service(db: AsyncSession, service_id: uuid.UUID) -> Service | None:
    """Retrieve a single service by ID."""
    stmt = select(Service).where(Service.id == service_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_service(db: AsyncSession, service_in: ServiceCreate) -> Service:
    """
    Create a new service.

    Args:
        db: Active async database session.
        service_in: Validated service creation payload.

    Returns:
        The newly created ``Service`` instance.
    """
    db_service = Service(
        name=service_in.name,
        description=service_in.description,
        category=service_in.category,
        price=service_in.price,
        duration=service_in.duration,
        status=service_in.status,
        image_url=service_in.image_url,
        video_url=service_in.video_url,
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