import uuid
from datetime import date, datetime, time, timedelta
from typing import List, Optional

from sqlalchemy import Date, Time, and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.agenda.models import Appointment, AvailabilityOverride, AvailabilityTemplate
from app.modules.agenda.schemas import (
    AppointmentCreate,
    AvailabilityOverrideCreate,
    AvailabilityTemplateCreate,
)
from app.modules.auth.models import User
from app.modules.locations.models import StoreLocation

# ── Constants ───────────────────────────────────────────────────────────────
SLOT_INTERVAL_MINUTES = 30


def _parse_time(t) -> time:
    if isinstance(t, str):
        for fmt in ("%H:%M:%S", "%H:%M"):
            try:
                return datetime.strptime(t, fmt).time()
            except ValueError:
                continue
        raise ValueError(f"Time value '{t}' does not match format HH:MM:SS or HH:MM")
    return t

# ── Templates ─────────────────────────────────────────────────────────────

async def get_templates(db: AsyncSession, user_id: uuid.UUID) -> list[AvailabilityTemplate]:
    stmt = (
        select(AvailabilityTemplate)
        .where(AvailabilityTemplate.user_id == user_id)
        .order_by(AvailabilityTemplate.day_of_week, AvailabilityTemplate.start_time)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_template(
    db: AsyncSession, user_id: uuid.UUID, data: AvailabilityTemplateCreate
) -> AvailabilityTemplate:
    start = _parse_time(data.start_time)
    end = _parse_time(data.end_time)
    tpl = AvailabilityTemplate(
        user_id=user_id,
        day_of_week=data.day_of_week,
        start_time=start,
        end_time=end,
        is_available=data.is_available,
    )
    db.add(tpl)
    await db.commit()
    await db.refresh(tpl)
    return tpl


async def update_template(
    db: AsyncSession, template_id: uuid.UUID, data: dict
) -> AvailabilityTemplate | None:
    stmt = select(AvailabilityTemplate).where(AvailabilityTemplate.id == template_id)
    result = await db.execute(stmt)
    tpl = result.scalar_one_or_none()
    if not tpl:
        return None
    for key, val in data.items():
        if val is not None:
            if key in ("start_time", "end_time"):
                val = _parse_time(val)
            setattr(tpl, key, val)
    await db.commit()
    await db.refresh(tpl)
    return tpl


async def delete_template(db: AsyncSession, template_id: uuid.UUID) -> bool:
    stmt = select(AvailabilityTemplate).where(AvailabilityTemplate.id == template_id)
    result = await db.execute(stmt)
    tpl = result.scalar_one_or_none()
    if not tpl:
        return False
    await db.delete(tpl)
    await db.commit()
    return True


# ── Overrides ─────────────────────────────────────────────────────────────

async def get_overrides(
    db: AsyncSession, user_id: uuid.UUID, date_from: date | None = None, date_to: date | None = None
) -> list[AvailabilityOverride]:
    stmt = select(AvailabilityOverride).where(AvailabilityOverride.user_id == user_id)
    if date_from:
        stmt = stmt.where(AvailabilityOverride.date >= date_from)
    if date_to:
        stmt = stmt.where(AvailabilityOverride.date <= date_to)
    stmt = stmt.order_by(AvailabilityOverride.date, AvailabilityOverride.start_time)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_override(
    db: AsyncSession, user_id: uuid.UUID, data: AvailabilityOverrideCreate
) -> AvailabilityOverride:
    ovr = AvailabilityOverride(
        user_id=user_id,
        date=datetime.strptime(data.date, "%Y-%m-%d").date(),
        start_time=_parse_time(data.start_time) if data.start_time else None,
        end_time=_parse_time(data.end_time) if data.end_time else None,
        is_available=data.is_available,
        reason=data.reason,
    )
    db.add(ovr)
    await db.commit()
    await db.refresh(ovr)
    return ovr


async def delete_override(db: AsyncSession, override_id: uuid.UUID) -> bool:
    stmt = select(AvailabilityOverride).where(AvailabilityOverride.id == override_id)
    result = await db.execute(stmt)
    ovr = result.scalar_one_or_none()
    if not ovr:
        return False
    await db.delete(ovr)
    await db.commit()
    return True


# ── Appointments ──────────────────────────────────────────────────────────

async def get_appointments(
    db: AsyncSession,
    user_id: uuid.UUID,
    role: str,
    status_filter: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[Appointment]:
    if role == "client":
        stmt = select(Appointment).where(Appointment.client_id == user_id)
    else:
        stmt = select(Appointment).where(Appointment.seller_id == user_id)

    if status_filter:
        stmt = stmt.where(Appointment.status == status_filter)
    if date_from:
        stmt = stmt.where(Appointment.date >= date_from)
    if date_to:
        stmt = stmt.where(Appointment.date <= date_to)

    stmt = stmt.order_by(Appointment.date.desc(), Appointment.start_time)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_appointment(
    db: AsyncSession, data: AppointmentCreate, client_id: uuid.UUID
) -> Appointment:
    """Create a new appointment with concurrent-booking protection.

    Uses ``SELECT ... FOR UPDATE`` over the seller's existing appointments for
    the requested date to lock those rows before checking for overlap.  This
    ensures that two clients booking the same slot simultaneously will result
    in exactly one success (201) and one failure (409), never two 201s.

    Pattern: read-lock-check-write, *not* read-decide-write (which would have
    a TOCTOU race under concurrent load).

    Note: a PostgreSQL ``EXCLUDE`` constraint using ``btree_gist`` on
    ``(seller_id, tsrange(date + start_time, date + end_time))`` would add
    a database-level safety net.  Not implemented here to avoid a btree_gist
    extension migration, but recommended if booking volume grows.

    Raises:
        ConflictException: If the requested slot overlaps an existing
            pending/confirmed appointment for the same seller.
    """
    from app.core.exceptions import ConflictException

    start_time = _parse_time(data.start_time)
    end_time = _parse_time(data.end_time)
    target_date = datetime.strptime(data.date, "%Y-%m-%d").date()

    # Lock the seller's appointments for this date so that concurrent requests
    # cannot both see an empty slot and both insert.
    lock_stmt = (
        select(Appointment)
        .where(
            Appointment.seller_id == data.seller_id,
            Appointment.date == target_date,
            Appointment.status.in_(["pending", "confirmed"]),
        )
        .with_for_update()
    )
    lock_result = await db.execute(lock_stmt)
    existing = list(lock_result.scalars().all())

    candidate_start = _time_to_minutes(start_time)
    candidate_end = _time_to_minutes(end_time)

    if _is_slot_occupied(candidate_start, candidate_end, existing):
        raise ConflictException(
            "El horario seleccionado ya no está disponible. "
            "Por favor elige otro horario."
        )

    apt = Appointment(
        seller_id=data.seller_id,
        client_id=client_id,
        service_id=data.service_id,
        store_location_id=data.store_location_id,
        date=target_date,
        start_time=start_time,
        end_time=end_time,
        status="pending",
        notes=data.notes,
    )
    db.add(apt)
    await db.commit()
    await db.refresh(apt)
    return apt


async def update_appointment(
    db: AsyncSession, appointment_id: uuid.UUID, data: dict
) -> Appointment | None:
    stmt = select(Appointment).where(Appointment.id == appointment_id)
    result = await db.execute(stmt)
    apt = result.scalar_one_or_none()
    if not apt:
        return None
    for key, val in data.items():
        if val is not None:
            setattr(apt, key, val)
    await db.commit()
    await db.refresh(apt)
    return apt


# ── Slots calculation ────────────────────────────────────────────────────

def _time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def _minutes_to_time(mins: int) -> time:
    return time(mins // 60, mins % 60)


def _slots_overlap(s1_start, s1_end, s2_start, s2_end) -> bool:
    return s1_start < s2_end and s2_start < s1_end


def _is_slot_occupied(candidate_start_mins: int, candidate_end_mins: int, appointments: list) -> bool:
    """Check if a candidate slot overlaps with any existing appointment."""
    for apt in appointments:
        apt_start = _time_to_minutes(apt.start_time)
        apt_end = _time_to_minutes(apt.end_time)
        if _slots_overlap(candidate_start_mins, candidate_end_mins, apt_start, apt_end):
            return True
    return False


async def get_available_slots(
    db: AsyncSession,
    seller_id: uuid.UUID,
    target_date: date,
    duration_minutes: int = 60,
) -> list[dict]:
    day_of_week = target_date.weekday()
    dow_model = (day_of_week + 1) % 7  # Convert Python weekday (0=Mon) to model format (0=Sun)

    # Get templates for that day
    tpl_stmt = select(AvailabilityTemplate).where(
        AvailabilityTemplate.user_id == seller_id,
        AvailabilityTemplate.day_of_week == dow_model,
        AvailabilityTemplate.is_available == True,
    ).order_by(AvailabilityTemplate.start_time)
    tpl_result = await db.execute(tpl_stmt)
    templates = list(tpl_result.scalars().all())

    # Get overrides for that date
    ovr_stmt = select(AvailabilityOverride).where(
        AvailabilityOverride.user_id == seller_id,
        AvailabilityOverride.date == target_date,
    )
    ovr_result = await db.execute(ovr_stmt)
    overrides = list(ovr_result.scalars().all())

    # Get existing appointments for that date
    apt_stmt = select(Appointment).where(
        Appointment.seller_id == seller_id,
        Appointment.date == target_date,
        Appointment.status.in_(["pending", "confirmed"]),
    ).order_by(Appointment.start_time)
    apt_result = await db.execute(apt_stmt)
    appointments = list(apt_result.scalars().all())

    # Start with template slots, then apply overrides
    blocked_slots = []
    extra_slots = []

    for ovr in overrides:
        if ovr.is_available:
            extra_slots.append({
                "start": ovr.start_time,
                "end": ovr.end_time,
            })
        else:
            blocked_slots.append({
                "start": ovr.start_time,
                "end": ovr.end_time,
            })

    # Build available slots from templates, removing blocked and occupied
    result_slots = []
    for tpl in templates:
        slot_start = tpl.start_time
        slot_end = tpl.end_time

        # Check if whole template slot is blocked
        is_blocked = False
        for blk in blocked_slots:
            blk_start = blk["start"]
            blk_end = blk["end"]
            if blk_start is None and blk_end is None:
                is_blocked = True
                break
            if blk_start and blk_end:
                if _slots_overlap(
                    _time_to_minutes(slot_start), _time_to_minutes(slot_end),
                    _time_to_minutes(blk_start), _time_to_minutes(blk_end),
                ):
                    is_blocked = True
                    break
        if is_blocked:
            continue

        # Generate time slots within this template
        start_mins = _time_to_minutes(slot_start)
        end_mins = _time_to_minutes(slot_end)

        for slot_start_mins in range(start_mins, end_mins - duration_minutes + 1, SLOT_INTERVAL_MINUTES):
            slot_end_mins = slot_start_mins + duration_minutes
            candidate_start = _minutes_to_time(slot_start_mins)
            candidate_end = _minutes_to_time(slot_end_mins)

            if _is_slot_occupied(slot_start_mins, slot_end_mins, appointments):
                continue

            result_slots.append({
                "start_time": candidate_start.strftime("%H:%M"),
                "end_time": candidate_end.strftime("%H:%M"),
            })

    # Add extra availability slots
    for ext in extra_slots:
        if ext["start"] and ext["end"]:
            extra_start = _time_to_minutes(ext["start"])
            extra_end = _time_to_minutes(ext["end"])
            for slot_start_mins in range(extra_start, extra_end - duration_minutes + 1, SLOT_INTERVAL_MINUTES):
                slot_end_mins = slot_start_mins + duration_minutes
                candidate_start = _minutes_to_time(slot_start_mins)
                candidate_end = _minutes_to_time(slot_end_mins)

                if not _is_slot_occupied(
                    _time_to_minutes(candidate_start), _time_to_minutes(candidate_end),
                    appointments,
                ):
                    result_slots.append({
                        "start_time": candidate_start.strftime("%H:%M"),
                        "end_time": candidate_end.strftime("%H:%M"),
                    })

    # Deduplicate and sort
    seen = set()
    unique = []
    for s in sorted(result_slots, key=lambda x: x["start_time"]):
        key = f"{s['start_time']}-{s['end_time']}"
        if key not in seen:
            seen.add(key)
            unique.append(s)

    return unique


# ── Sellers (public) ──────────────────────────────────────────────────────

async def get_sellers(db: AsyncSession) -> list[User]:
    stmt = (
        select(User)
        .where(User.role.in_(("seller", "admin")), User.is_active == True)
        .options(selectinload(User.store_locations).selectinload(StoreLocation.location))
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_seller_by_id(db: AsyncSession, seller_id: uuid.UUID) -> User | None:
    stmt = (
        select(User)
        .where(User.id == seller_id, User.role.in_(("seller", "admin")), User.is_active == True)
        .options(selectinload(User.store_locations).selectinload(StoreLocation.location))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
