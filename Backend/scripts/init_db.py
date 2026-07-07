"""
Servinow — Database Initialization Script

Usage:
    python scripts/init_db.py

Creates all tables defined in SQLAlchemy models using Base.metadata.
Useful when Alembic migrations haven't been run or tables don't exist yet.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine


async def create_tables():
    """Create all tables defined in Base.metadata."""
    print(f"Connecting to database: {settings.DATABASE_URL.split('@')[1]}")

    async with engine.connect() as conn:
        print("Checking if tables exist...")
        result = await conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
        existing_tables = [row[0] for row in result.fetchall()]
        print(f"Existing tables: {existing_tables or 'None'}")

    print("\nCreating tables from Base.metadata...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("\nVerifying created tables...")
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
        tables = [row[0] for row in result.fetchall()]
        print(f"Tables now exist: {sorted(tables)}")

    if 'products' in tables and 'services' in tables:
        print("\n✅ Tables 'products' and 'services' created successfully!")
    else:
        print("\n⚠️ Warning: Some tables may not have been created")
        if 'products' not in tables:
            print("   - 'products' table is missing!")
        if 'services' not in tables:
            print("   - 'services' table is missing!")


async def drop_tables():
    """Drop all tables defined in Base.metadata (for development only!)."""
    print("⚠️  Dropping ALL tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("✅ All tables dropped.")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--drop":
        asyncio.run(drop_tables())
    else:
        asyncio.run(create_tables())