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
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
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

    # --- Billing / DIAN ---
    COMPANY_NIT: str = "900000000"
    COMPANY_NAME: str = "Servinow SAS"
    COMPANY_ADDRESS: str = "Calle 1 # 1-1"
    COMPANY_CITY: str = "Bogotá"
    COMPANY_DEPARTMENT: str = "Cundinamarca"
    COMPANY_PHONE: str = "+57 300 0000000"
    COMPANY_EMAIL: str = "facturacion@servinow.co"

    DIAN_ENVIRONMENT: str = "test"  # "test" | "production"
    DIAN_SOFTWARE_ID: str = ""
    DIAN_SOFTWARE_PIN: str = ""
    DIAN_TECHNICAL_KEY: str = ""
    DIAN_CERTIFICATE_PATH: str = ""
    DIAN_CERTIFICATE_PASSWORD: str = ""
    DIAN_RESOLUTION_NUMBER: str = ""
    DIAN_RESOLUTION_DATE: str = ""
    DIAN_RESOLUTION_PREFIX: str = "SETT"
    DIAN_RESOLUTION_RANGE_FROM: int = 1
    DIAN_RESOLUTION_RANGE_TO: int = 5000

    # --- Social OAuth ---
    META_APP_ID: str = ""
    META_APP_SECRET: str = ""
    META_REDIRECT_URI: str = ""
    TIKTOK_CLIENT_KEY: str = ""
    TIKTOK_CLIENT_SECRET: str = ""
    TIKTOK_REDIRECT_URI: str = ""


# Singleton instance — importable across the application.
settings = Settings()

