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


# Singleton instance — importable across the application.
settings = Settings()
