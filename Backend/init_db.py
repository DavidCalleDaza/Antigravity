"""
Servinow — Emergency Database Initialization Script

Usage:
    cd Backend
    source .venv/bin/activate
    python init_db.py

Or inside Docker container:
    docker compose exec web python init_db.py
"""

import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


async def init_database():
    """Force-create all tables using SQLAlchemy Base.metadata."""
    logger.info("Starting emergency database initialization...")

    try:
        from app.core.config import settings
        logger.info(f"Database URL host: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'configured'}")

        from app.db.base_class import Base
        from app.modules.auth.models import User
        from app.modules.wall.models import Comment, Post
        from app.modules.products.models import Product
        from app.modules.services.models import Service

        from sqlalchemy import text
        from app.db.session import engine

        logger.info(f"Base class imported: {Base}")
        logger.info(f"Base.metadata.tables BEFORE create_all: {list(Base.metadata.tables.keys())}")

        async with engine.connect() as conn:
            logger.info("Checking existing tables...")
            result = await conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
            existing = [row[0] for row in result.fetchall()]
            logger.info(f"Existing tables in database: {existing or 'None'}")

        logger.info("Creating tables via Base.metadata.create_all...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("create_all() completed!")

        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
            tables = sorted([row[0] for row in result.fetchall()])
            logger.info(f"Tables after create_all: {tables}")

        missing = []
        expected = ['comments', 'posts', 'products', 'services', 'users']
        for tbl in expected:
            if tbl not in tables:
                missing.append(tbl)

        if missing:
            logger.warning(f"⚠️ Missing tables: {missing}")
        else:
            logger.info("✅ All expected tables exist!")

        if 'products' in tables and 'services' in tables:
            logger.info("✅ SUCCESS: 'products' and 'services' tables created!")
            return True
        else:
            logger.error(f"❌ FAILED: products={('products' in tables)}, services={('services' in tables)}")
            return False

    except Exception as e:
        logger.error(f"❌ ERROR during initialization: {e}")
        import traceback
        traceback.print_exc()
        return False


async def verify_tables():
    """Verify what tables exist and what models are registered."""
    logger.info("=== VERIFYING DATABASE STATE ===")

    try:
        from sqlalchemy import text
        from app.db.session import engine
        from app.db.base_class import Base

        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
            tables = sorted([row[0] for row in result.fetchall()])
            logger.info(f"Tables in database: {tables}")

        logger.info(f"Models in Base.metadata: {list(Base.metadata.tables.keys())}")

    except Exception as e:
        logger.error(f"Error during verification: {e}")


async def drop_all_tables():
    """Drop all tables - FOR DEVELOPMENT ONLY."""
    logger.warning("⚠️  Dropping ALL tables...")
    try:
        from app.db.base import Base
        from app.db.session import engine

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        logger.info("✅ All tables dropped.")
    except Exception as e:
        logger.error(f"❌ Error dropping tables: {e}")


if __name__ == "__main__":
    if "--drop" in sys.argv:
        asyncio.run(drop_all_tables())
    elif "--verify" in sys.argv:
        asyncio.run(verify_tables())
    else:
        success = asyncio.run(init_database())
        sys.exit(0 if success else 1)