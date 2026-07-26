from app.db.session import engine
from sqlalchemy import text
import asyncio

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT name, image_url FROM products WHERE name='Test-product-001';"))
        for row in res:
            print(row)

asyncio.run(main())
