"""
Servinow API — Async Database Session Management.

Configures the SQLAlchemy 2.0 async engine and provides a dependency-injectable
session factory for FastAPI route handlers.
"""

import ssl
from typing import AsyncGenerator
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

_ASYNCPG_INCOMPATIBLE_PARAMS = {"sslmode", "sslrootcert", "sslcert", "sslkey"}


def get_connect_args(database_url: str) -> dict:
    """Return connect_args with SSL context for cloud providers that require it."""
    if "neon.tech" in database_url:
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        return {"ssl": ssl_ctx}
    return {}


def sanitize_database_url(database_url: str) -> str:
    """Remove query parameters incompatible with asyncpg (e.g. sslmode)."""
    parsed = urlparse(database_url)
    params = parse_qs(parsed.query, keep_blank_values=True)
    cleaned = {k: v for k, v in params.items() if k.lower() not in _ASYNCPG_INCOMPATIBLE_PARAMS}
    return urlunparse(parsed._replace(query=urlencode(cleaned, doseq=True)))


# --- Async Engine ---
engine = create_async_engine(
    sanitize_database_url(settings.DATABASE_URL),
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
    connect_args=get_connect_args(settings.DATABASE_URL),
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
