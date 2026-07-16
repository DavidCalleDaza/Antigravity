import uuid
from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.modules.locations.schemas import LocationResponse


# ── Availability Templates ────────────────────────────────────────────────

class AvailabilityTemplateCreate(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="0=Dom, 1=Lun, ..., 6=Sab")
    start_time: str = Field(..., description="HH:MM format")
    end_time: str = Field(..., description="HH:MM format")
    is_available: bool = True


class AvailabilityTemplateUpdate(BaseModel):
    day_of_week: int | None = Field(None, ge=0, le=6)
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_available: bool | None = None


class AvailabilityTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    day_of_week: int
    start_time: time
    end_time: time
    is_available: bool
    created_at: datetime


# ── Availability Overrides ────────────────────────────────────────────────

class AvailabilityOverrideCreate(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD")
    start_time: Optional[str] = Field(None, description="HH:MM, null = all day")
    end_time: Optional[str] = Field(None, description="HH:MM, null = all day")
    is_available: bool = False
    reason: str | None = None


class AvailabilityOverrideResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_available: bool
    reason: str | None
    created_at: datetime


# ── Appointments ──────────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    seller_id: uuid.UUID
    service_id: uuid.UUID | None = None
    store_location_id: uuid.UUID | None = None
    date: str = Field(..., description="YYYY-MM-DD")
    start_time: str = Field(..., description="HH:MM")
    end_time: str = Field(..., description="HH:MM")
    notes: str | None = None


class AppointmentUpdate(BaseModel):
    status: str | None = Field(None, description="pending, confirmed, cancelled, completed")
    notes: str | None = None


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    seller_id: uuid.UUID
    client_id: uuid.UUID
    service_id: uuid.UUID | None
    store_location_id: uuid.UUID | None
    date: date
    start_time: time
    end_time: time
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime | None

    seller_name: str | None = None
    client_name: str | None = None
    service_name: str | None = None


# ── Available Slots ───────────────────────────────────────────────────────

class AvailableSlot(BaseModel):
    start_time: time
    end_time: time


class AvailableSlotsResponse(BaseModel):
    date: date
    slots: list[AvailableSlot]


# ── Sellers (public info) ─────────────────────────────────────────────────

class StoreLocationBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    phone: str | None = None
    location: LocationResponse | None = None


class SellerPublicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    avatar_url: str | None = None
    email: str | None = None
    store_locations: list[StoreLocationBrief] = []
