import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated

MAX_TAX_RATE = 100  # ajustar si tu app define un tope de negocio distinto


class CountrySettingBase(BaseModel):
    country_name: Annotated[
        str,
        Field(..., description="Country display name", min_length=1, max_length=100)
    ]
    default_tax_rate: Annotated[
        float,
        Field(..., description="Default VAT/IVA percentage", ge=0, le=MAX_TAX_RATE)
    ]
    currency_code: Annotated[str | None, Field(None, max_length=3)] = None
    currency_symbol: Annotated[str | None, Field(None, max_length=5)] = None
    is_active: Annotated[bool, Field(True)] = True


class CountrySettingUpsert(CountrySettingBase):
    pass  # country_code viene por path param, no por body


class CountrySettingResponse(CountrySettingBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    country_code: str
    created_at: datetime
    updated_at: datetime | None = None