import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.modules.agenda import crud
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


# ── Templates ─────────────────────────────────────────────────────────────

@router.get("/availability/templates", response_model=list[AvailabilityTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get my weekly availability templates."""
    if current_user.role not in ("admin", "seller"):
        raise HTTPException(status_code=403, detail="Solo vendedores pueden gestionar disponibilidad")
    return await crud.get_templates(db, current_user.id)


@router.post("/availability/templates", response_model=AvailabilityTemplateResponse, status_code=201)
async def create_template(
    data: AvailabilityTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin", "seller"):
        raise HTTPException(status_code=403, detail="Solo vendedores pueden gestionar disponibilidad")
    return await crud.create_template(db, current_user.id, data)


@router.patch("/availability/templates/{template_id}", response_model=AvailabilityTemplateResponse)
async def update_template(
    template_id: uuid.UUID,
    data: AvailabilityTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin", "seller"):
        raise HTTPException(status_code=403, detail="Solo vendedores pueden gestionar disponibilidad")
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
    if current_user.role not in ("admin", "seller"):
        raise HTTPException(status_code=403, detail="Solo vendedores pueden gestionar disponibilidad")
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
    if current_user.role not in ("admin", "seller"):
        raise HTTPException(status_code=403, detail="Solo vendedores pueden gestionar disponibilidad")
    d_from = datetime.strptime(date_from, "%Y-%m-%d").date() if date_from else None
    d_to = datetime.strptime(date_to, "%Y-%m-%d").date() if date_to else None
    return await crud.get_overrides(db, current_user.id, d_from, d_to)


@router.post("/availability/overrides", response_model=AvailabilityOverrideResponse, status_code=201)
async def create_override(
    data: AvailabilityOverrideCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin", "seller"):
        raise HTTPException(status_code=403, detail="Solo vendedores pueden gestionar disponibilidad")
    return await crud.create_override(db, current_user.id, data)


@router.delete("/availability/overrides/{override_id}", status_code=204)
async def delete_override(
    override_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin", "seller"):
        raise HTTPException(status_code=403, detail="Solo vendedores pueden gestionar disponibilidad")
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
    result = []
    for apt in appointments:
        resp = AppointmentResponse(
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
            created_at=apt.created_at,
            updated_at=apt.updated_at,
            seller_name=apt.seller.full_name if apt.seller else None,
            client_name=apt.client.full_name if apt.client else None,
            service_name=apt.service.name if apt.service else None,
        )
        result.append(resp)
    return result


@router.post("/appointments", response_model=AppointmentResponse, status_code=201)
async def create_appointment(
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Solo clientes pueden agendar citas")

    # Validate the seller exists
    seller = await crud.get_seller_by_id(db, data.seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")

    # Validate service exists if provided
    if data.service_id:
        stmt = select(Service).where(Service.id == data.service_id)
        svc = await db.execute(stmt)
        if not svc.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Servicio no encontrado")

    return await crud.create_appointment(db, data, current_user.id)


@router.patch("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: uuid.UUID,
    data: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    update_data = data.model_dump(exclude_unset=True)
    apt = await crud.update_appointment(db, appointment_id, update_data)
    if not apt:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
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
        created_at=apt.created_at,
        updated_at=apt.updated_at,
        seller_name=apt.seller.full_name if apt.seller else None,
        client_name=apt.client.full_name if apt.client else None,
        service_name=apt.service.name if apt.service else None,
    )


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
    result = []
    for s in sellers:
        locations = []
        for sl in s.store_locations:
            locations.append(StoreLocationBrief(
                id=sl.id,
                name=sl.name,
                phone=sl.phone,
                location=sl.location,
            ))
        result.append(SellerPublicResponse(
            id=s.id,
            full_name=s.full_name,
            avatar_url=s.avatar_url,
            email=s.email,
            store_locations=locations,
        ))
    return result


@router.get("/sellers/{seller_id}", response_model=SellerPublicResponse)
async def get_seller(
    seller_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    seller = await crud.get_seller_by_id(db, seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    locations = []
    for sl in seller.store_locations:
        locations.append(StoreLocationBrief(
            id=sl.id,
            name=sl.name,
            phone=sl.phone,
            location=sl.location,
        ))
    return SellerPublicResponse(
        id=seller.id,
        full_name=seller.full_name,
        avatar_url=seller.avatar_url,
        email=seller.email,
        store_locations=locations,
    )


# ── Store Locations (seller manages their branches) ───────────────────────

@router.get("/store-locations", response_model=list[StoreLocationBrief])
async def list_store_locations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    name: str,
    phone: str | None = None,
    location_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin", "seller"):
        raise HTTPException(status_code=403, detail="Solo vendedores")
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


@router.delete("/store-locations/{location_id}", status_code=204)
async def delete_store_location(
    location_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
