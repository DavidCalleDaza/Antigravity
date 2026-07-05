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
