import asyncio
from sqlalchemy import text
from app.db.session import engine

async def check_db():
    print("--- CUENTAS SOCIALES VINCULADAS ---")
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT id, platform, platform_username, created_at FROM social_accounts"))
        accounts = result.fetchall()
        if not accounts:
            print("No hay cuentas vinculadas aún.")
        for acc in accounts:
            print(f"ID: {acc.id} | Plataforma: {acc.platform} | Usuario: {acc.platform_username} | Fecha: {acc.created_at}")

    print("\n--- PUBLICACIONES SOCIALES ---")
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT id, platform, status, platform_post_id, error_message FROM social_posts"))
        posts = result.fetchall()
        if not posts:
            print("No hay publicaciones registradas aún.")
        for post in posts:
            print(f"ID: {post.id} | Plataforma: {post.platform} | Estado: {post.status} | Post ID: {post.platform_post_id} | Error: {post.error_message}")

    print("\n--- USUARIOS CREADOS (Para que recuerdes tu usuario) ---")
    async with engine.connect() as conn:
        # Asumiendo que la tabla users tiene email, full_name, etc.
        result = await conn.execute(text("SELECT id, email, is_active FROM users"))
        users = result.fetchall()
        if not users:
            print("No hay usuarios registrados.")
        for u in users:
            print(f"ID: {u.id} | Email/Usuario: {u.email} | Activo: {u.is_active}")

if __name__ == "__main__":
    asyncio.run(check_db())
