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
from app.modules.categories.router import router as categories_router
from app.modules.services.router import router as services_router
from app.modules.social.router import router as social_router
from app.modules.admin_social.router import router as admin_social_router
from app.modules.billing.router import router as billing_router
from app.modules.locations.router import router as locations_router
from app.api.uploads import router as uploads_router
from app.modules.ai.router import router as ai_router
from app.modules.whatsapp.router import router as whatsapp_router
from app.modules.agenda.router import router as agenda_router
from app.modules.notifications.router import router as notifications_router
from app.modules.billing.public_verify_router import router as public_verify_router

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
    allow_origins=[
        "https://servinow.vercel.app",
        *settings.effective_cors_origins
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Exception Handlers ──────────────────────────────────────────────────────

register_exception_handlers(app)


# ── Ngrok Skip Browser Warning Middleware ────────────────────────────────────

@app.middleware("http")
async def add_ngrok_skip_header(request, call_next):
    response = await call_next(request)
    response.headers["ngrok-skip-browser-warning"] = "true"
    return response


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
    categories_router,
    prefix="/api/v1/categories",
    tags=["Categories"],
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
    admin_social_router,
    prefix="/api/v1",
    tags=["Admin Social Media"],
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

app.include_router(
    locations_router,
    prefix="/api/v1/locations",
    tags=["Locations"],
)

app.include_router(
    ai_router,
    prefix="/api/v1/ai",
    tags=["AI Generation"],
)

app.include_router(
    whatsapp_router,
    prefix="/api/v1/whatsapp",
    tags=["WhatsApp Integration"],
)

app.include_router(
    agenda_router,
    prefix="/api/v1/agenda",
    tags=["Agenda"],
)

app.include_router(
    notifications_router,
    prefix="/api/v1/notifications",
    tags=["Notifications"],
)

app.include_router(
    public_verify_router,
    prefix="/api/v1",
    tags=["Public Verification"],
)

app.mount("/uploads", StaticFiles(directory="uploads", html=False), name="uploads")
app.mount("/legal", StaticFiles(directory="legal", html=True), name="legal")


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

@app.get("/", include_in_schema=False)
async def root():
    return {"message": "Servinow API is running"}

@app.get("/tiktok{verification_id}.txt", include_in_schema=False)
async def tiktok_verify_dynamic(verification_id: str):
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(f"tiktok-developers-site-verification={verification_id}")
