"""
Servinow API — Application Entrypoint.

Configures the FastAPI application instance, registers middleware,
exception handlers, and API routers.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.db.session import engine
from app.modules.auth.router import router as auth_router
from app.modules.wall.router import router as wall_router
from app.modules.products.router import router as products_router
from app.modules.services.router import router as services_router
from app.modules.social.router import router as social_router
from app.modules.billing.router import router as billing_router
from app.api.uploads import router as uploads_router

from app.db.base import Base
from app.shared.schemas import HealthCheckResponse

import os
os.makedirs("uploads", exist_ok=True)


# ── Lifespan ────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager.

    Runs startup logic before ``yield`` and shutdown logic after.
    """
    # --- Startup ---
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # --- Shutdown ---
    await engine.dispose()


# ── Application Factory ─────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Servinow — Plataforma SPA de gestion empresarial. "
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


# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(
    auth_router,
    prefix="/api/v1/auth",
    tags=["Authentication"],
)

app.include_router(
    wall_router,
    prefix="/api/v1/wall",
    tags=["Wall"],
)

app.include_router(
    products_router,
    prefix="/api/v1/products",
    tags=["Products"],
)

app.include_router(
    services_router,
    prefix="/api/v1/services",
    tags=["Services"],
)

app.include_router(
    social_router,
    prefix="/api/v1/social",
    tags=["Social Media"],
)

app.include_router(
    billing_router,
    prefix="/api/v1/billing",
    tags=["Billing"],
)

app.include_router(
    uploads_router,
    prefix="/api/v1/uploads",
    tags=["Uploads"],
)


app.mount("/uploads", StaticFiles(directory="uploads", html=False), name="uploads")


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
