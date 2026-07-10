import asyncio
import sys
from app.core.config import settings
from app.modules.ai.service import generate_social_copy

async def main():
    print("Testing AI Service...")
    if not settings.GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY no está configurada en .env")
        sys.exit(1)
        
    print("GEMINI_API_KEY configurada. Llamando a Gemini...")
    try:
        copy = await generate_social_copy(
            product_name="Miel Orgánica Servinow",
            description="Miel pura de abejas, 100% natural, recolectada de forma sostenible."
        )
        print("--------------------------------------------------")
        print("Respuesta Exitosa de Gemini:")
        print(copy)
        print("--------------------------------------------------")
    except Exception as e:
        print(f"Error al generar el copy: {e}")

if __name__ == "__main__":
    asyncio.run(main())
