import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.modules.agenda import crud
from app.modules.agenda.models import Appointment
from app.modules.agenda.tasks import (
    send_appointment_request_notification,
    send_appointment_confirmation_notification,
    send_appointment_cancellation_notification,
)
from app.modules.agenda.schemas import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
    AvailabilityOverrideCreate,
    AvailabilityOverrideResponse,
    AvailabilityTemplateCreate,
    AvailabilityTemplateResponse,
    AvailabilityTemplateUpdate,
    AvailableSlot,
    AvailableSlotsResponse,
    SellerPublicResponse,
    StoreLocationBrief,
)
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.locations.models import StoreLocation
from app.modules.services.models import Service

router = APIRouter()

# ── Valid state transitions for appointments ────────────────────────────────
VALID_STATUS_TRANSITIONS = {
    "pending":   {"confirmed", "cancelled"},
    "confirmed": {"completed", "cancelled"},
    "cancelled": set(),
    "completed": set(),
}

ALLOWED_ROLES = ("admin", "seller")


# ── Helper functions ────────────────────────────────────────────────────────

def _require_seller_or_admin(current_user: User):
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Solo vendedores pueden gestionar disponibilidad")


def _build_appointment_response(apt: Appointment) -> AppointmentResponse:
    return AppointmentResponse(
        id=apt.id,
        seller_id=apt.seller_id,
        client_id=apt.client_id,
        service_id=apt.service_id,
        store_location_id=apt.store_location_id,
        date=apt.date,
        start_time=apt.start_time.strftime("%H:%M"),
        end_time=apt.end_time.strftime("%H:%M"),
        status=apt.status,
        notes=apt.notes,
        cancellation_reason=apt.cancellation_reason,
        created_at=apt.created_at,
        updated_at=apt.updated_at,
        seller_name=apt.seller.full_name if apt.seller else None,
        client_name=apt.client.full_name if apt.client else None,
        service_name=apt.service.name if apt.service else None,
    )


def _build_seller_response(seller: User) -> SellerPublicResponse:
    return SellerPublicResponse(
        id=seller.id,
        full_name=seller.full_name,
        avatar_url=seller.avatar_url,
        email=seller.email,
        store_locations=[StoreLocationBrief(
            id=sl.id,
            name=sl.name,
            phone=sl.phone,
            location=sl.location,
        ) for sl in seller.store_locations],
    )


# ── Templates ─────────────────────────────────────────────────────────────

@router.get("/availability/templates", response_model=list[AvailabilityTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get my weekly availability templates."""
    _require_seller_or_admin(current_user)
    return await crud.get_templates(db, current_user.id)


@router.post("/availability/templates", response_model=AvailabilityTemplateResponse, status_code=201)
async def create_template(
    data: AvailabilityTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_seller_or_admin(current_user)
    return await crud.create_template(db, current_user.id, data)


@router.patch("/availability/templates/{template_id}", response_model=AvailabilityTemplateResponse)
async def update_template(
    template_id: uuid.UUID,
    data: AvailabilityTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_seller_or_admin(current_user)
    update_data = data.model_dump(exclude_unset=True)
    tpl = await crud.update_template(db, template_id, update_data)
    if not tpl:
        raise HTTPException(status_code=404, detail="Franja no encontrada")
    return tpl


@router.delete("/availability/templates/{template_id}", status_code=204)
async def delete_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_seller_or_admin(current_user)
    deleted = await crud.delete_template(db, template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Franja no encontrada")
    return None


# ── Overrides ─────────────────────────────────────────────────────────────

@router.get("/availability/overrides", response_model=list[AvailabilityOverrideResponse])
async def list_overrides(
    date_from: str | None = Query(None, description="YYYY-MM-DD"),
    date_to: str | None = Query(None, description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_seller_or_admin(current_user)
    d_from = datetime.strptime(date_from, "%Y-%m-%d").date() if date_from else None
    d_to = datetime.strptime(date_to, "%Y-%m-%d").date() if date_to else None
    return await crud.get_overrides(db, current_user.id, d_from, d_to)


@router.post("/availability/overrides", response_model=AvailabilityOverrideResponse, status_code=201)
async def create_override(
    data: AvailabilityOverrideCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_seller_or_admin(current_user)
    return await crud.create_override(db, current_user.id, data)


@router.delete("/availability/overrides/{override_id}", status_code=204)
async def delete_override(
    override_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_seller_or_admin(current_user)
    deleted = await crud.delete_override(db, override_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Excepción no encontrada")
    return None


# ── Appointments ──────────────────────────────────────────────────────────

@router.get("/appointments", response_model=list[AppointmentResponse])
async def list_appointments(
    status_filter: str | None = Query(None, alias="status"),
    date_from: str | None = Query(None, description="YYYY-MM-DD"),
    date_to: str | None = Query(None, description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d_from = datetime.strptime(date_from, "%Y-%m-%d").date() if date_from else None
    d_to = datetime.strptime(date_to, "%Y-%m-%d").date() if date_to else None
    appointments = await crud.get_appointments(
        db, current_user.id, current_user.role, status_filter, d_from, d_to
    )
    return [_build_appointment_response(apt) for apt in appointments]


@router.post("/appointments", response_model=AppointmentResponse, status_code=201)
async def create_appointment(
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Solo clientes pueden agendar citas")

    seller = await crud.get_seller_by_id(db, data.seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")

    if data.service_id:
        stmt = select(Service).where(Service.id == data.service_id)
        svc = await db.execute(stmt)
        if not svc.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Servicio no encontrado")

    try:
        apt = await crud.create_appointment(db, data, current_user.id)
    except Exception as e:
        from app.core.exceptions import ConflictException
        if isinstance(e, ConflictException):
            raise HTTPException(status_code=409, detail=str(e))
        raise
    send_appointment_request_notification.delay(str(apt.id))
    return apt


@router.patch("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: uuid.UUID,
    data: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Appointment).where(Appointment.id == appointment_id)
    res = await db.execute(stmt)
    old_apt = res.scalar_one_or_none()
    if not old_apt:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    # Authorization: only the seller or client of this appointment can modify it (admin can modify any)
    if current_user.role not in ("admin",) and \
       current_user.id != old_apt.seller_id and \
       current_user.id != old_apt.client_id:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta cita")

    old_status = old_apt.status

    update_data = data.model_dump(exclude_unset=True)

    # Validate status transition if status is being changed
    if "status" in update_data and update_data["status"] is not None:
        new_status = update_data["status"]
        allowed_transitions = VALID_STATUS_TRANSITIONS.get(old_status, set())
        if new_status not in allowed_transitions:
            raise HTTPException(
                status_code=400,
                detail=f"No se puede cambiar de '{old_status}' a '{new_status}'"
            )
        # Seller/client can only cancel, only seller can confirm or complete
        if new_status in ("confirmed", "completed") and current_user.id != old_apt.seller_id:
            raise HTTPException(
                status_code=403,
                detail="Solo el vendedor puede confirmar o completar citas"
            )
        # Client must provide a cancellation reason
        if new_status == "cancelled" and current_user.id != old_apt.seller_id:
            if not update_data.get("cancellation_reason") or not str(update_data["cancellation_reason"]).strip():
                raise HTTPException(
                    status_code=422,
                    detail="Debes proporcionar un motivo de cancelación"
                )

    apt = await crud.update_appointment(db, appointment_id, update_data)
    if not apt:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    # Send notifications based on state transitions
    if old_status != "confirmed" and apt.status == "confirmed":
        send_appointment_confirmation_notification.delay(str(apt.id))
    elif old_status != "cancelled" and apt.status == "cancelled":
        send_appointment_cancellation_notification.delay(str(apt.id))

    return _build_appointment_response(apt)


# ── Slots ─────────────────────────────────────────────────────────────────

@router.get("/slots", response_model=AvailableSlotsResponse)
async def get_available_slots(
    seller_id: uuid.UUID,
    date: str = Query(..., description="YYYY-MM-DD"),
    service_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    target_date = datetime.strptime(date, "%Y-%m-%d").date()
    duration_minutes = 60

    if service_id:
        stmt = select(Service).where(Service.id == service_id)
        svc_result = await db.execute(stmt)
        svc = svc_result.scalar_one_or_none()
        if svc and svc.duration:
            duration_minutes = svc.duration

    slots = await crud.get_available_slots(db, seller_id, target_date, duration_minutes)
    return AvailableSlotsResponse(
        date=target_date,
        slots=[AvailableSlot(**s) for s in slots],
    )


# ── Sellers (public) ──────────────────────────────────────────────────────

@router.get("/sellers", response_model=list[SellerPublicResponse])
async def list_sellers(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sellers = await crud.get_sellers(db)
    return [_build_seller_response(s) for s in sellers]


@router.get("/sellers/{seller_id}", response_model=SellerPublicResponse)
async def get_seller(
    seller_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    seller = await crud.get_seller_by_id(db, seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    return _build_seller_response(seller)


# ── Store Locations (legacy — now also available under /api/v1/locations/store-locations) ──

@router.get("/store-locations", response_model=list[StoreLocationBrief], include_in_schema=False)
async def list_store_locations_legacy(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """DEPRECATED: Use GET /api/v1/locations/store-locations instead."""
    _require_seller_or_admin(current_user)
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


@router.post("/store-locations", status_code=201, include_in_schema=False)
async def create_store_location_legacy(
    name: str,
    phone: str | None = None,
    location_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """DEPRECATED: Use POST /api/v1/locations/store-locations instead."""
    _require_seller_or_admin(current_user)
    sl = StoreLocation(
        user_id=current_user.id,
        name=name,
        phone=phone,
        location_id=location_id,
    )
    db.add(sl)
    await db.commit()
    await db.refresh(sl)
    return {"id": str(sl.id), "name": sl.name}


@router.delete("/store-locations/{location_id}", status_code=204, include_in_schema=False)
async def delete_store_location_legacy(
    location_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """DEPRECATED: Use DELETE /api/v1/locations/store-locations/{id} instead."""
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
