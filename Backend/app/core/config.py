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
        extra="ignore"
    )

    # --- Application ---
    APP_NAME: str = "Servinow API"
    PROJECT_NAME: str = "Servinow V9"
    APP_VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    DEBUG: bool = False
    ENVIRONMENT: str = "production"  # "development" | "production"

    # --- Database ---
    POSTGRES_USER: str = "servinow_user"
    POSTGRES_PASSWORD: str = "servinow_secret_password"
    POSTGRES_DB: str = "servinow_db"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    postgres_host_port: int = 5432
    DATABASE_URL: str = (
        "postgresql+asyncpg://servinow_user:servinow_secret_password@db:5432/servinow_db"
    )

    # --- Security / JWT ---
    SECRET_KEY: str = "change-me-to-a-very-long-random-string-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    FIELD_ENCRYPTION_KEY: str = ""

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

    # --- Email / SMTP ---
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "ServiNow"
    SMTP_USE_TLS: bool = True
    COMPANY_NAME: str = ""
    COMPANY_NIT: str = ""
    COMPANY_ADDRESS: str = ""
    COMPANY_CITY: str = ""
    COMPANY_PHONE: str = ""

    # --- Cloudinary ---
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # --- Social OAuth ---
    META_APP_ID: str = ""
    META_APP_SECRET: str = ""
    META_REDIRECT_URI: str = ""
    META_API_VERSION: str = "v20.0"
    
    TIKTOK_CLIENT_KEY: str = ""
    TIKTOK_CLIENT_SECRET: str = ""
    TIKTOK_REDIRECT_URI: str = ""
    
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""

    # --- AI Generation (Testing Phase) ---
    GEMINI_API_KEY: str = ""
    GOOGLE_CLOUD_PROJECT: str = ""
    GOOGLE_CLOUD_LOCATION: str = "global"
    GCS_VIDEO_BUCKET: str = "servinow-ai-video-dev"
    AI_VIDEO_DAILY_LIMIT: int = 50

    # --- WhatsApp Cloud API ---
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_PHONE_ID: str = ""
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = ""
    WHATSAPP_VERIFY_TOKEN: str = ""


# Singleton instance — importable across the application.
settings = Settings()
