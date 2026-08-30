from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.modules.locations.models import Neighborhood, StoreLocation
from app.modules.locations.schemas import (
    NeighborhoodCreate, NeighborhoodResponse,
    StoreLocationBrief, StoreLocationCreate,
)
from app.modules.auth.deps import get_current_user, require_seller
from app.modules.auth.models import User

router = APIRouter()

@router.get(
    "/neighborhoods/{city_identifier}",
    response_model=List[NeighborhoodResponse],
    summary="Get neighborhoods by city",
    description="Returns a list of neighborhoods for the specified city, ordered alphabetically."
)
async def get_neighborhoods(
    city_identifier: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve all neighborhoods associated with a specific city.
    Uses case-insensitive matching for the city identifier.
    """
    stmt = (
        select(Neighborhood)
        .where(func.lower(Neighborhood.city_identifier) == city_identifier.lower())
        .order_by(Neighborhood.name)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/neighborhoods",
    response_model=NeighborhoodResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new neighborhood",
    description="Registers a new custom neighborhood for a city. It is saved as unverified."
)
async def create_neighborhood(
    neighborhood_in: NeighborhoodCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new neighborhood.
    By default, is_verified will be set to False since this is user-submitted.
    """
    # Check if it already exists (case-insensitive for both city and name)
    stmt = select(Neighborhood).where(
        func.lower(Neighborhood.city_identifier) == neighborhood_in.city_identifier.lower(),
        func.lower(Neighborhood.name) == neighborhood_in.name.lower()
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        return existing

    db_obj = Neighborhood(
        name=neighborhood_in.name,
        city_identifier=neighborhood_in.city_identifier,
        is_verified=False
    )

    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)

    return db_obj


# ── Store Locations ────────────────────────────────────────────────────────

@router.get("/store-locations", response_model=list[StoreLocationBrief])
async def list_store_locations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all active store locations for the current user."""
    stmt = select(StoreLocation).where(
        StoreLocation.user_id == current_user.id,
        StoreLocation.is_active == True,
    ).options(selectinload(StoreLocation.location))
    result = await db.execute(stmt)
    return [StoreLocationBrief(
        id=sl.id,
        name=sl.name,
        phone=sl.phone,
        location=sl.location,
    ) for sl in result.scalars().all()]


@router.post("/store-locations", status_code=201)
async def create_store_location(
    data: StoreLocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    """Create a new store location for the current user."""
    # Role check delegated to require_seller dependency above.
    sl = StoreLocation(
        user_id=current_user.id,
        name=data.name,
        phone=data.phone,
        location_id=data.location_id,
    )
    db.add(sl)
    await db.commit()
    await db.refresh(sl)
    return {"id": str(sl.id), "name": sl.name}


@router.delete("/store-locations/{location_id}", status_code=204)
async def delete_store_location(
    location_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a store location owned by the current user."""
    stmt = select(StoreLocation).where(
        StoreLocation.id == location_id,
        StoreLocation.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    sl = result.scalar_one_or_none()
    if not sl:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")
    await db.delete(sl)
    await db.commit()
    return None
