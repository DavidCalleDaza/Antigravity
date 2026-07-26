"""
Alembic environment configuration for async SQLAlchemy.

Configured to use the Servinow async engine and Base metadata
for automatic migration generation.

IMPORTANT: We import Base from ``app.db.base`` (NOT ``base_class``)
because that module also imports every ORM model, ensuring
``Base.metadata`` has the full table catalog at autogenerate time.
"""

import asyncio
import ssl
from logging.config import fileConfig
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.core.config import settings
from app.db.base import Base  # Imports Base + all registered models

_ASYNCPG_INCOMPATIBLE_PARAMS = {"sslmode", "sslrootcert", "sslcert", "sslkey"}


def _sanitize_database_url(database_url: str) -> str:
    """Remove query parameters incompatible with asyncpg (e.g. sslmode)."""
    parsed = urlparse(database_url)
    params = parse_qs(parsed.query, keep_blank_values=True)
    cleaned = {k: v for k, v in params.items() if k.lower() not in _ASYNCPG_INCOMPATIBLE_PARAMS}
    return urlunparse(parsed._replace(query=urlencode(cleaned, doseq=True)))

# Alembic Config object
config = context.config

# Override sqlalchemy.url with our settings (sanitize for asyncpg compatibility)
config.set_main_option("sqlalchemy.url", _sanitize_database_url(settings.DATABASE_URL))

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# MetaData object for 'autogenerate' support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    """Helper to run migrations within a connection context."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode using async engine."""
    connectable_kwargs = dict(
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    if "neon.tech" in settings.DATABASE_URL:
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        connectable_kwargs["connect_args"] = {"ssl": ssl_ctx, "server_settings": {"search_path": "public"}}

    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        **connectable_kwargs,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
