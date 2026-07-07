import uuid
from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated

class NeighborhoodBase(BaseModel):
    name: Annotated[
        str,
        Field(
            ...,
            description="Name of the neighborhood or sector",
            min_length=2,
            max_length=150
        )
    ]
    city_identifier: Annotated[
        str,
        Field(
            ...,
            description="The city this neighborhood belongs to",
            min_length=2,
            max_length=100
        )
    ]

class NeighborhoodCreate(NeighborhoodBase):
    pass

class NeighborhoodResponse(NeighborhoodBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_verified: bool

from datetime import datetime

class LocationBase(BaseModel):
    country: Annotated[str | None, Field(None, max_length=100)] = None
    country_code: Annotated[str | None, Field(None, max_length=10)] = None
    state: Annotated[str | None, Field(None, max_length=100)] = None
    state_code: Annotated[str | None, Field(None, max_length=10)] = None
    city: Annotated[str | None, Field(None, max_length=100)] = None
    neighborhood: Annotated[str | None, Field(None, max_length=150)] = None
    address: Annotated[str | None, Field(None, max_length=255)] = None

class LocationCreate(LocationBase):
    pass

class LocationResponse(LocationBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime | None = None
