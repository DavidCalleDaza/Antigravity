"""
DonApp API — Core Configuration Module.

Loads all application settings from environment variables using
pydantic-settings. Values fallback to defaults defined here.
"""

import logging
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application-wide settings loaded from environment / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # --- Application ---
    APP_NAME: str = "DonApp API"
    PROJECT_NAME: str = "DonApp V9"
    APP_VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    DEBUG: bool = False
    ENVIRONMENT: str = "production"  # "development" | "production"

    # --- Company Info (defaults de simulación; override vía .env en producción) ---
    COMPANY_NAME: str = "DonApp (Simulación)"
    COMPANY_NIT: str = "900000000-0"
    COMPANY_ADDRESS: str = "Calle 123 #45-67"
    COMPANY_CITY: str = "Bogotá"
    COMPANY_PHONE: str = "3000000000"
    COMPANY_EMAIL: str = "simulacion@donapp.com"
    COMPANY_DEPARTMENT: str = "Cundinamarca"

    # --- Contact Form ---
    CONTACT_NOTIFICATION_EMAIL: str = "servinowdpr@gmail.com"

    # --- Google OAuth (Opcionales con valor None por defecto) ---
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    GOOGLE_REDIRECT_URI: str | None = None

    # --- DIAN Resolution (defaults para simulación) ---
    DIAN_RESOLUTION_NUMBER: str = "18760000001"
    DIAN_RESOLUTION_DATE: str = "2026-01-01"
    DIAN_RESOLUTION_RANGE_FROM: int = 1
    DIAN_RESOLUTION_RANGE_TO: int = 999999

    # --- DIAN Integration (defaults para modo simulación) ---
    DIAN_ENVIRONMENT: str = "test"
    DIAN_SOFTWARE_ID: str = ""
    DIAN_CERTIFICATE_PATH: str = ""
    DIAN_TECHNICAL_KEY: str = ""

    # --- Database ---
    POSTGRES_USER: str = "servinow_user"
    POSTGRES_PASSWORD: str = "CHANGE_ME_LOCAL_ONLY"
    POSTGRES_DB: str = "servinow_db"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    postgres_host_port: int = 5432
    DATABASE_URL: str = (
        "postgresql+asyncpg://servinow_user:CHANGE_ME_LOCAL_ONLY@db:5432/servinow_db"
    )

    # --- Security / JWT ---
    SECRET_KEY: str = "change-me-to-a-very-long-random-string-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    FIELD_ENCRYPTION_KEY: str = ""

    _INSECURE_SECRET_KEY = "change-me-to-a-very-long-random-string-in-production"

    @field_validator("SECRET_KEY", mode="after")
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        """Block startup in production if SECRET_KEY is insecure.

        In development, allow the default but emit a warning so developers
        don't accidentally run with an insecure key without noticing.
        Generate a secure key with:
            python -c "import secrets; print(secrets.token_urlsafe(64))"
        """
        is_insecure = v == cls._INSECURE_SECRET_KEY or len(v) < 32
        # info.data may not yet have ENVIRONMENT if validation order differs;
        # fall back to a direct env read to be safe.
        import os
        environment = (info.data or {}).get("ENVIRONMENT") or os.getenv("ENVIRONMENT", "production")
        if is_insecure:
            if environment == "production":
                raise ValueError(
                    "SECRET_KEY is insecure and ENVIRONMENT=production is set. "
                    "Set a strong SECRET_KEY (>=32 chars, not the default value) before starting in production. "
                    "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
                )
            else:
                _logger.warning(
                    "[SECURITY] SECRET_KEY is using the insecure default value. "
                    "This is acceptable in development but MUST be changed before going to production. "
                    "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
                )
        return v

    @field_validator("FIELD_ENCRYPTION_KEY", mode="after")
    @classmethod
    def validate_field_encryption_key(cls, v: str) -> str:
        if not v:
            raise ValueError("FIELD_ENCRYPTION_KEY cannot be empty. Run Fernet.generate_key() to generate one.")
        return v

    # --- CORS ---
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # --- Frontend URL (for CORS in production) ---
    FRONTEND_URL: str = ""

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

    @property
    def effective_cors_origins(self) -> List[str]:
        """
        Returns CORS origins, automatically including FRONTEND_URL
        if it is set and not already in the list.
        """
        origins = list(self.CORS_ORIGINS)
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        return origins

    # --- Celery / Redis ---
    REDIS_URL: str = "redis://localhost:6379/0"

    PUBLIC_VERIFY_BASE_URL: str = "https://tudominio.com/verify"

    # --- Email / SMTP ---
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "DonApp"
    SMTP_USE_TLS: bool = True

    # --- Cloudinary ---
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # --- Social OAuth ---
    META_APP_ID: str = ""
    META_APP_SECRET: str = ""
    META_REDIRECT_URI: str = ""
    META_API_VERSION: str = "v21.0"
    
    TIKTOK_CLIENT_KEY: str = ""
    TIKTOK_CLIENT_SECRET: str = ""
    TIKTOK_REDIRECT_URI: str = ""

    # --- AI Generation (Testing Phase) ---
    GEMINI_API_KEY: str = ""
    GOOGLE_CLOUD_PROJECT: str = ""
    GOOGLE_CLOUD_LOCATION: str = "global"
    GCS_VIDEO_BUCKET: str = "servinow-ai-video-dev"
    AI_VIDEO_DAILY_LIMIT: int = 50

    # --- AI Media Enhancement (Muro: audios/videos adicionales) ---
    AUPHONIC_API_KEY: str = ""
    REPLICATE_API_TOKEN: str = ""

    # --- AI Cost Control (Tokens Module) ---
    # Máximo consumo USD por usuario en una ventana de 1 hora.
    AI_HOURLY_COST_LIMIT_USD: float = 0.50

    # --- WhatsApp Cloud API ---
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_PHONE_ID: str = ""
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = ""
    WHATSAPP_VERIFY_TOKEN: str = ""


# Singleton instance — importable across the application.
settings = Settings()