import asyncio
from app.db.session import async_session_factory
from app.modules.locations.models import Neighborhood
from sqlalchemy import select

async def seed_neighborhoods():
    async with async_session_factory() as db:
        city_name = "Perímetro Urbano Popayán"
        city_name_alt = "Popayán"
        
        neighborhoods = [
            "Centro Histórico", "La Esmeralda", "El Recuerdo", "Bello Horizonte",
            "Ciudad Jardín", "La Paz", "Pomona", "Los Hoyos", "Antonio Nariño",
            "Santa Elena", "El Cadillal", "Modelo", "Prados del Norte",
            "Campamento", "La Virginia", "Lomas de Granada", "Bolívar",
            "Villa del Viento Etapa 1", "Villa del Viento Etapa 2",
            "Villa del Viento Etapa 3", "Villa del Viento Etapa 4",
            "Ciudadela Comfacauca", "El Ortiz", "Las Américas",
            "Pandiguando", "Camilo Torres"
        ]
        
        count = 0
        for name in neighborhoods:
            for city in [city_name, city_name_alt]:
                result = await db.execute(
                    select(Neighborhood).filter(
                        Neighborhood.city_identifier == city,
                        Neighborhood.name == name
                    )
                )
                existing = result.scalars().first()
                
                if not existing:
                    db_obj = Neighborhood(
                        name=name,
                        city_identifier=city,
                        is_verified=True
                    )
                    db.add(db_obj)
                    count += 1
        
        await db.commit()
        print(f"Seeded {count} new neighborhoods for Popayán.")

if __name__ == "__main__":
    asyncio.run(seed_neighborhoods())
