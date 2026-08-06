"""
DonApp API — Agenda Module Critical Tests.

Tests for appointment authorization, CRUD operations, and slot calculation.
"""

import pytest
import pytest_asyncio
import uuid
from datetime import date, time, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.agenda.models import Appointment, AvailabilityTemplate
from app.modules.auth.models import User


# ── Fixtures ────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def seller_user(db_session: AsyncSession) -> User:
    """Create a test seller user."""
    user = User(
        id=uuid.uuid4(),
        email="seller@test.com",
        full_name="Test Seller",
        role="seller",
        is_active=True,
        hashed_password="hashed_password",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def client_user(db_session: AsyncSession) -> User:
    """Create a test client user."""
    user = User(
        id=uuid.uuid4(),
        email="client@test.com",
        full_name="Test Client",
        role="client",
        is_active=True,
        hashed_password="hashed_password",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Create a test admin user."""
    user = User(
        id=uuid.uuid4(),
        email="admin@test.com",
        full_name="Test Admin",
        role="admin",
        is_active=True,
        hashed_password="hashed_password",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_appointment(db_session: AsyncSession, seller_user: User, client_user: User) -> Appointment:
    """Create a test appointment."""
    apt = Appointment(
        id=uuid.uuid4(),
        seller_id=seller_user.id,
        client_id=client_user.id,
        date=date.today() + timedelta(days=1),
        start_time=time(10, 0),
        end_time=time(11, 0),
        status="pending",
    )
    db_session.add(apt)
    await db_session.commit()
    await db_session.refresh(apt)
    return apt


# ── Authorization Tests ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_appointment_unauthorized(client: AsyncClient, test_appointment: Appointment):
    """Test that unauthorized users cannot update appointments."""
    response = await client.patch(
        f"/api/v1/agenda/appointments/{test_appointment.id}",
        json={"status": "confirmed"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_appointment_status_transition(client: AsyncClient, test_appointment: Appointment):
    """Test that invalid status transitions are rejected."""
    # This test would require authentication setup
    # For now, we'll test the logic directly
    from app.modules.agenda.router import VALID_STATUS_TRANSITIONS
    
    # Valid transitions
    assert "confirmed" in VALID_STATUS_TRANSITIONS["pending"]
    assert "cancelled" in VALID_STATUS_TRANSITIONS["pending"]
    
    # Invalid transitions
    assert "completed" not in VALID_STATUS_TRANSITIONS["pending"]
    assert "pending" not in VALID_STATUS_TRANSITIONS["confirmed"]
    assert len(VALID_STATUS_TRANSITIONS["cancelled"]) == 0
    assert len(VALID_STATUS_TRANSITIONS["completed"]) == 0


# ── CRUD Tests ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_appointment(client: AsyncClient, seller_user: User, client_user: User):
    """Test creating a new appointment."""
    response = await client.post(
        "/api/v1/agenda/appointments",
        json={
            "seller_id": str(seller_user.id),
            "date": (date.today() + timedelta(days=1)).isoformat(),
            "start_time": "10:00",
            "end_time": "11:00",
        }
    )
    # Should fail without authentication
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_appointments(client: AsyncClient):
    """Test listing appointments."""
    response = await client.get("/api/v1/agenda/appointments")
    # Should fail without authentication
    assert response.status_code == 401


# ── Slots Tests ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_available_slots(client: AsyncClient, seller_user: User):
    """Test getting available slots for a seller."""
    response = await client.get(
        f"/api/v1/agenda/slots?seller_id={seller_user.id}&date={(date.today() + timedelta(days=1)).isoformat()}"
    )
    # Should fail without authentication
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_slot_calculation_logic():
    """Test the slot calculation logic directly."""
    from app.modules.agenda.crud import (
        _time_to_minutes,
        _minutes_to_time,
        _slots_overlap,
        _is_slot_occupied,
        SLOT_INTERVAL_MINUTES,
    )
    
    # Test time conversion
    assert _time_to_minutes(time(10, 30)) == 630
    assert _minutes_to_time(630) == time(10, 30)
    
    # Test overlap detection
    assert _slots_overlap(600, 660, 630, 690) == True  # 10:00-11:00 overlaps 10:30-11:30
    assert _slots_overlap(600, 660, 660, 720) == False  # 10:00-11:00 doesn't overlap 11:00-12:00
    assert _slots_overlap(600, 660, 540, 600) == False  # 10:00-11:00 doesn't overlap 9:00-10:00
    
    # Test slot interval constant
    assert SLOT_INTERVAL_MINUTES == 30


# ── Helper Function Tests ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_build_appointment_response():
    """Test the _build_appointment_response helper function."""
    from app.modules.agenda.router import _build_appointment_response
    from app.modules.agenda.schemas import AppointmentResponse
    from datetime import datetime
    
    # Create a mock appointment object
    class MockAppointment:
        id = uuid.uuid4()
        seller_id = uuid.uuid4()
        client_id = uuid.uuid4()
        service_id = None
        store_location_id = None
        date = date.today()
        start_time = time(10, 0)
        end_time = time(11, 0)
        status = "pending"
        notes = None
        cancellation_reason = None
        created_at = datetime.now()
        updated_at = None
        seller = None
        client = None
        service = None
    
    apt = MockAppointment()
    response = _build_appointment_response(apt)
    
    assert isinstance(response, AppointmentResponse)
    assert response.start_time.hour == 10
    assert response.start_time.minute == 0
    assert response.end_time.hour == 11
    assert response.end_time.minute == 0
    assert response.status == "pending"


# ── State Machine Tests ────────────────────────────────────────────────────

def test_valid_status_transitions():
    """Test that the state machine allows only valid transitions."""
    from app.modules.agenda.router import VALID_STATUS_TRANSITIONS
    
    # pending -> confirmed (valid)
    assert "confirmed" in VALID_STATUS_TRANSITIONS["pending"]
    
    # pending -> cancelled (valid)
    assert "cancelled" in VALID_STATUS_TRANSITIONS["pending"]
    
    # pending -> completed (invalid)
    assert "completed" not in VALID_STATUS_TRANSITIONS["pending"]
    
    # confirmed -> completed (valid)
    assert "completed" in VALID_STATUS_TRANSITIONS["confirmed"]
    
    # confirmed -> cancelled (valid)
    assert "cancelled" in VALID_STATUS_TRANSITIONS["confirmed"]
    
    # confirmed -> pending (invalid)
    assert "pending" not in VALID_STATUS_TRANSITIONS["confirmed"]
    
    # cancelled -> any (invalid, no transitions allowed)
    assert len(VALID_STATUS_TRANSITIONS["cancelled"]) == 0
    
    # completed -> any (invalid, no transitions allowed)
    assert len(VALID_STATUS_TRANSITIONS["completed"]) == 0
