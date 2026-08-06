"""
DonApp — Emergency Database Initialization Script

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

        from app.db.base import Base
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
        expected = [
            'comments', 'posts', 'products', 'services', 'users',
            'social_accounts', 'social_posts', 'categories', 'customers',
            'invoices', 'invoice_items', 'invoice_sequences', 'credit_notes',
            'credit_note_items', 'dian_events'
        ]
        for tbl in expected:
            if tbl not in tables:
                missing.append(tbl)

        if missing:
            logger.warning(f"⚠️ Missing tables: {missing}")
        else:
            logger.info("✅ All expected tables exist!")

        if 'products' in tables and 'services' in tables:
            logger.info("✅ SUCCESS: 'products' and 'services' tables created!")
            
            # Seed default categories
            from app.db.session import async_session_factory
            async with async_session_factory() as db:
                await seed_categories(db)
                
            return True
        else:
            logger.error(f"❌ FAILED: products={('products' in tables)}, services={('services' in tables)}")
            return False

    except Exception as e:
        logger.error(f"❌ ERROR during initialization: {e}")
        import traceback
        traceback.print_exc()
        return False


async def seed_categories(db):
    """Seed initial categories for products and services."""
    logger.info("Seeding default categories...")
    from app.modules.categories.models import Category
    from sqlalchemy import select

    # Check if there are already categories
    result = await db.execute(select(Category))
    if result.scalars().first() is not None:
        logger.info("Categories already seeded.")
        return

    default_products = [
        ('Alimentos', 'Alimentos y comida en general'),
        ('Bebidas', 'Bebidas calientes, frías y licores'),
        ('Ropa', 'Prendas de vestir para todas las edades'),
        ('Calzado', 'Zapatos y calzado deportivo/formal'),
        ('Tecnología', 'Dispositivos electrónicos y accesorios'),
        ('Hogar', 'Decoración, muebles y accesorios para el hogar'),
        ('Salud', 'Productos de bienestar y farmacia'),
        ('Belleza', 'Cuidado personal y cosméticos'),
        ('Deportes', 'Equipamiento deportivo y fitness'),
        ('Mascotas', 'Alimentos y accesorios para mascotas'),
        ('Papelería', 'Útiles escolares y de oficina'),
        ('Otros', 'Otros artículos y productos generales')
    ]

    default_services = [
        ('Barbería', 'Corte de cabello para caballeros y arreglo de barba'),
        ('Estilista / Peluquería', 'Corte, peinado y tratamientos capilares'),
        ('Manicura / Pedicura', 'Cuidado de uñas y manos/pies'),
        ('Masajes / Spa', 'Tratamientos de relajación y masajes corporales'),
        ('Fisioterapia', 'Rehabilitación y terapia física'),
        ('Entrenamiento Personal', 'Asesoría deportiva y rutinas de ejercicio'),
        ('Asesoría / Consultoría', 'Servicios profesionales de consultoría'),
        ('Soporte Técnico', 'Reparación de hardware y soporte de sistemas'),
        ('Limpieza / Mantenimiento', 'Servicios de aseo y mantenimiento general'),
        ('Tutorías / Clases', 'Apoyo académico y lecciones privadas'),
        ('Otros', 'Otros servicios generales')
    ]

    categories_to_add = []
    
    def make_slug(name, entity):
        s = name.lower()
        for char in ['/', ' ', ',', '.', '&', '(', ')', '/']:
            s = s.replace(char, '-')
        while '--' in s:
            s = s.replace('--', '-')
        s = s.strip('-')
        return f"{s}-{entity}"

    for name, desc in default_products:
        categories_to_add.append(Category(
            name=name,
            description=desc,
            slug=make_slug(name, 'product'),
            entity_type='product',
            status='active',
            depth=0
        ))

    for name, desc in default_services:
        categories_to_add.append(Category(
            name=name,
            description=desc,
            slug=make_slug(name, 'service'),
            entity_type='service',
            status='active',
            depth=0
        ))

    try:
        db.add_all(categories_to_add)
        await db.commit()
        logger.info(f"Successfully seeded {len(categories_to_add)} categories!")
    except Exception as e:
        await db.rollback()
        logger.error(f"Error seeding categories: {e}")


async def verify_tables():
    """Verify what tables exist and what models are registered."""
    logger.info("=== VERIFYING DATABASE STATE ===")

    try:
        from sqlalchemy import text
        from app.db.session import engine
        from app.db.base import Base

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