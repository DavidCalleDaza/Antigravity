from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.db.session import get_db
from app.modules.locations.models import Neighborhood
from app.modules.locations.schemas import NeighborhoodCreate, NeighborhoodResponse

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