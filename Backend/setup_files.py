#!/usr/bin/env python3
"""
One-time bootstrap script.
Writes all project source files into the correct locations.
Run from the Backend directory, then delete this file.
"""
import os
from pathlib import Path

BASE = Path(__file__).resolve().parent

FILES: dict[str, str] = {}

# ─── .env.example ─────────────────────────────────────────────────────────
FILES[".env.example"] = """\
# ============================================
# Servinow Backend - Environment Configuration
# ============================================
# Copy this file to .env and fill in the values.

# --- Database ---
POSTGRES_USER=servinow_user
POSTGRES_PASSWORD=servinow_secret_password
POSTGRES_DB=servinow_db
POSTGRES_HOST=db
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://servinow_user:servinow_secret_password@db:5432/servinow_db

# --- Security ---
SECRET_KEY=change-me-to-a-very-long-random-string-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# --- CORS ---
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# --- Application ---
APP_NAME=Servinow API
APP_VERSION=0.1.0
DEBUG=True
"""

# ─── Dockerfile ───────────────────────────────────────────────────────────
FILES["Dockerfile"] = """\
# ============================================
# Servinow Backend - Multi-stage Dockerfile
# ============================================
FROM python:3.11-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1

WORKDIR /app

# --- Dependencies stage ---
FROM base AS dependencies

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \\
    && pip install --no-cache-dir -r requirements.txt

# --- Application stage ---
FROM dependencies AS application

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
"""

# ─── docker-compose.yml ──────────────────────────────────────────────────
FILES["docker-compose.yml"] = """\
# ============================================
# Servinow Backend - Docker Compose (Local Dev)
# ============================================
version: "3.9"

services:
  # --- PostgreSQL Database ---
  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-servinow_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-servinow_secret_password}
      POSTGRES_DB: ${POSTGRES_DB:-servinow_db}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-servinow_user} -d ${POSTGRES_DB:-servinow_db}"]
      interval: 5s
      timeout: 5s
      retries: 5

  # --- FastAPI Application ---
  web:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "8000:8000"
    volumes:
      - .:/app
    depends_on:
      db:
        condition: service_healthy

volumes:
  postgres_data:
    driver: local
"""

# ─── pyproject.toml ───────────────────────────────────────────────────────
FILES["pyproject.toml"] = """\
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
"""

# ─── app/__init__.py ─────────────────────────────────────────────────────
FILES["app/__init__.py"] = '\"\"\"Servinow API — Application root package.\"\"\"\n'

# ─── app/core/__init__.py ────────────────────────────────────────────────
FILES["app/core/__init__.py"] = '\"\"\"Servinow API — Core package.\"\"\"\n'

# ─── app/core/config.py ─────────────────────────────────────────────────
FILES["app/core/config.py"] = '''\
"""
Servinow API — Core Configuration Module.

Loads all application settings from environment variables using
pydantic-settings. Values fallback to defaults defined here.
"""

from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide settings loaded from environment / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # --- Application ---
    APP_NAME: str = "Servinow API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # --- Database ---
    POSTGRES_USER: str = "servinow_user"
    POSTGRES_PASSWORD: str = "servinow_secret_password"
    POSTGRES_DB: str = "servinow_db"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = (
        "postgresql+asyncpg://servinow_user:servinow_secret_password@db:5432/servinow_db"
    )

    # --- Security / JWT ---
    SECRET_KEY: str = "change-me-to-a-very-long-random-string-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # --- CORS ---
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | List[str]) -> List[str]:
        """Accept both a JSON-encoded string and a plain list."""
        if isinstance(value, str):
            import json

            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                return [origin.strip() for origin in value.split(",")]
        return value


# Singleton instance — importable across the application.
settings = Settings()
'''

# ─── app/core/security.py ───────────────────────────────────────────────
FILES["app/core/security.py"] = '''\
"""
Servinow API — Core Security Module.

Provides JWT token creation / verification and password hashing utilities.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# --- Password Hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


# --- JWT Tokens ---

def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create a signed JWT access token.

    Args:
        data: Payload claims to encode into the token.
        expires_delta: Optional custom expiration duration. Defaults to
                       ``ACCESS_TOKEN_EXPIRE_MINUTES`` from settings.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """
    Decode and verify a JWT access token.

    Returns:
        The token payload if valid, or ``None`` on failure.
    """
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except JWTError:
        return None
'''

# ─── app/core/exceptions.py ─────────────────────────────────────────────
FILES["app/core/exceptions.py"] = '''\
"""
Servinow API — Centralized HTTP Exception Handlers.

Defines custom exception classes and registers global handlers
on the FastAPI application to return consistent JSON error responses.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


# ── Custom Exception Classes ────────────────────────────────────────────────


class ServinowException(Exception):
    """Base exception for all Servinow domain errors."""

    def __init__(
        self,
        status_code: int = 500,
        detail: str = "An unexpected error occurred.",
    ) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class NotFoundException(ServinowException):
    """Raised when a requested resource does not exist."""

    def __init__(self, detail: str = "Resource not found.") -> None:
        super().__init__(status_code=404, detail=detail)


class UnauthorizedException(ServinowException):
    """Raised when authentication credentials are missing or invalid."""

    def __init__(self, detail: str = "Invalid or missing credentials.") -> None:
        super().__init__(status_code=401, detail=detail)


class ForbiddenException(ServinowException):
    """Raised when the user lacks permission for the requested action."""

    def __init__(self, detail: str = "You do not have permission to perform this action.") -> None:
        super().__init__(status_code=403, detail=detail)


class BadRequestException(ServinowException):
    """Raised when the client sends malformed or invalid data."""

    def __init__(self, detail: str = "Bad request.") -> None:
        super().__init__(status_code=400, detail=detail)


class ConflictException(ServinowException):
    """Raised when a resource conflict occurs (e.g. duplicate entry)."""

    def __init__(self, detail: str = "Resource conflict.") -> None:
        super().__init__(status_code=409, detail=detail)


# ── Handler Registration ────────────────────────────────────────────────────


def register_exception_handlers(app: FastAPI) -> None:
    """
    Attach global exception handlers to the FastAPI application instance.

    This ensures every ``ServinowException`` (and unhandled ``Exception``)
    returns a uniform JSON envelope:

    .. code-block:: json

        {"detail": "Human-readable error message"}
    """

    @app.exception_handler(ServinowException)
    async def servinow_exception_handler(
        _request: Request,
        exc: ServinowException,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        _request: Request,
        exc: Exception,
    ) -> JSONResponse:
        # In production, avoid leaking internal error details.
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error."},
        )
'''

# ─── app/db/__init__.py ─────────────────────────────────────────────────
FILES["app/db/__init__.py"] = '\"\"\"Servinow API — Database package.\"\"\"\n'

# ─── app/db/session.py ──────────────────────────────────────────────────
FILES["app/db/session.py"] = '''\
"""
Servinow API — Async Database Session Management.

Configures the SQLAlchemy 2.0 async engine and provides a dependency-injectable
session factory for FastAPI route handlers.
"""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# --- Async Engine ---
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
)

# --- Session Factory ---
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields an async database session.

    Usage::

        @router.get("/items")
        async def list_items(db: AsyncSession = Depends(get_db)):
            ...

    The session is automatically closed when the request finishes.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
'''

# ─── app/db/base_class.py ───────────────────────────────────────────────
FILES["app/db/base_class.py"] = '''\
"""
Servinow API — Declarative Base Class.

All ORM models must inherit from ``Base`` so that Alembic can discover
them automatically for migration auto-generation.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    SQLAlchemy declarative base for all Servinow ORM models.

    Extend this class when defining new database tables::

        class User(Base):
            __tablename__ = "users"
            id: Mapped[int] = mapped_column(primary_key=True)
    """

    pass
'''

# ─── app/shared/__init__.py ─────────────────────────────────────────────
FILES["app/shared/__init__.py"] = '\"\"\"Servinow API — Shared utilities package.\"\"\"\n'

# ─── app/shared/schemas.py ──────────────────────────────────────────────
FILES["app/shared/schemas.py"] = '''\
"""
Servinow API — Shared Pydantic Schemas.

Generic response models reused across multiple modules.
"""

from pydantic import BaseModel


class MessageResponse(BaseModel):
    """Standard message-only response schema."""

    detail: str


class HealthCheckResponse(BaseModel):
    """Response schema for the health-check endpoint."""

    status: str
    db_connection: bool
'''

# ─── app/modules/__init__.py ────────────────────────────────────────────
FILES["app/modules/__init__.py"] = '\"\"\"Servinow API — Modules package (Modular Monolith).\"\"\"\n'

# ─── Module placeholders ────────────────────────────────────────────────
for mod in ("auth", "products", "billing", "agenda", "wall"):
    FILES[f"app/modules/{mod}/__init__.py"] = f'\"\"\"Servinow API — {mod.capitalize()} module.\"\"\"\n'

# ─── app/main.py ─────────────────────────────────────────────────────────
FILES["app/main.py"] = '''\
"""
Servinow API — Application Entrypoint.

Configures the FastAPI application instance, registers middleware,
exception handlers, and API routers.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.db.session import engine
from app.shared.schemas import HealthCheckResponse


# ── Lifespan ────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager.

    Runs startup logic before ``yield`` and shutdown logic after.
    """
    # --- Startup ---
    yield
    # --- Shutdown ---
    await engine.dispose()


# ── Application Factory ─────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Servinow — Plataforma SPA de gestión empresarial. "
        "API REST construida con FastAPI, SQLAlchemy 2.0 y PostgreSQL."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── Middleware ───────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Exception Handlers ──────────────────────────────────────────────────────

register_exception_handlers(app)


# ── Health Check ─────────────────────────────────────────────────────────────


@app.get(
    "/api/v1/health",
    response_model=HealthCheckResponse,
    tags=["Health"],
    summary="Health Check",
    description=(
        "Returns the current health status of the API and validates "
        "database connectivity by executing a lightweight query."
    ),
)
async def health_check() -> HealthCheckResponse:
    """
    Verify that the API is running and the database is reachable.

    Returns:
        JSON with ``status`` and ``db_connection`` fields.
    """
    db_ok = False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        db_ok = False

    return HealthCheckResponse(status="ok", db_connection=db_ok)
'''

# ─── tests/__init__.py ──────────────────────────────────────────────────
FILES["tests/__init__.py"] = '\"\"\"Servinow API — Tests package.\"\"\"\n'

# ─── tests/conftest.py ──────────────────────────────────────────────────
FILES["tests/conftest.py"] = '''\
"""
Servinow API — Test Configuration & Fixtures.

Provides an async test client and an in-memory SQLite database session
for isolated, repeatable integration tests.
"""

import asyncio
from typing import AsyncGenerator

import pytest
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


# ── Event Loop Fixture ──────────────────────────────────────────────────────


@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for all session-scoped tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


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
    """Replacement for ``get_db`` that uses the test database."""
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
'''

# ─── tests/test_main.py ─────────────────────────────────────────────────
FILES["tests/test_main.py"] = '''\
"""
Servinow API — Health Check Endpoint Tests.

Validates the /api/v1/health endpoint returns the expected
response structure and status code.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check_returns_200(client: AsyncClient) -> None:
    """GET /api/v1/health should return HTTP 200."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_check_response_schema(client: AsyncClient) -> None:
    """GET /api/v1/health should return {status, db_connection}."""
    response = await client.get("/api/v1/health")
    data = response.json()

    assert "status" in data
    assert "db_connection" in data
    assert data["status"] == "ok"
    assert isinstance(data["db_connection"], bool)


@pytest.mark.asyncio
async def test_health_check_db_connection_is_bool(client: AsyncClient) -> None:
    """The ``db_connection`` field must be a boolean, regardless of connectivity."""
    response = await client.get("/api/v1/health")
    data = response.json()
    assert isinstance(data["db_connection"], bool)
'''

# ─── Write everything ───────────────────────────────────────────────────────

def main() -> None:
    written = 0
    for relpath, content in FILES.items():
        target = BASE / relpath
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        written += 1
        print(f"  ✓ {relpath}")
    print(f"\n✅ {written} files written successfully.")


if __name__ == "__main__":
    main()
