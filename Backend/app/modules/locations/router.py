from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

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
def get_neighborhoods(
    city_identifier: str,
    db: Session = Depends(get_db),
):
    """
    Retrieve all neighborhoods associated with a specific city.
    Uses case-insensitive matching for the city identifier.
    """
    neighborhoods = (
        db.query(Neighborhood)
        .filter(func.lower(Neighborhood.city_identifier) == city_identifier.lower())
        .order_by(Neighborhood.name)
        .all()
    )
    return neighborhoods

@router.post(
    "/neighborhoods",
    response_model=NeighborhoodResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new neighborhood",
    description="Registers a new custom neighborhood for a city. It is saved as unverified."
)
def create_neighborhood(
    neighborhood_in: NeighborhoodCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new neighborhood.
    By default, is_verified will be set to False since this is user-submitted.
    """
    # Check if it already exists (case-insensitive for both city and name)
    existing = db.query(Neighborhood).filter(
        func.lower(Neighborhood.city_identifier) == neighborhood_in.city_identifier.lower(),
        func.lower(Neighborhood.name) == neighborhood_in.name.lower()
    ).first()

    if existing:
        return existing
        
    db_obj = Neighborhood(
        name=neighborhood_in.name,
        city_identifier=neighborhood_in.city_identifier,
        is_verified=False
    )
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    return db_obj
