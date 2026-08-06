"""
DonApp API — Test Configuration & Fixtures.

Provides an async test client and an in-memory SQLite database session
for isolated, repeatable integration tests.
"""

from typing import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.db.base_class import Base
from app.db.session import get_db
from app.main import app

# ── In-Memory Test Database ─────────────────────────────────────────────────

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Database Setup / Teardown ────────────────────────────────────────────────


@pytest_asyncio.fixture(autouse=True)
async def setup_database() -> AsyncGenerator[None, None]:
    """
    Create all tables before each test and drop them after.

    This ensures every test starts with a clean schema.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ── Test Database Session ────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a fresh async database session for each test."""
    async with TestSessionLocal() as session:
        yield session


# ── Override get_db Dependency ───────────────────────────────────────────────


async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """Replacement for get_db that uses the test database."""
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = _override_get_db


# ── Async HTTP Client ───────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Provide an async HTTP client wired to the FastAPI test application.

    Usage in tests::

        async def test_example(client: AsyncClient):
            response = await client.get("/api/v1/health")
            assert response.status_code == 200
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
