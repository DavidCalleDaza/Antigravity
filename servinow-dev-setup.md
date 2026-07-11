---
name: servinow-dev-setup
description: Instalación, variables de entorno y arranque local de ServiNow (Docker vs. instalación nativa, healthcheck, script start.bat). Consulta esta skill SIEMPRE que el usuario reporte un problema al levantar el entorno de desarrollo, pida ayuda con Docker/venv/pnpm, o necesite saber qué variables de entorno son obligatorias. No uses esta skill para decisiones de arquitectura o código de features — solo para diagnóstico y arranque de entorno.
---

# Entorno de desarrollo de ServiNow

## Prerrequisitos

- Git, Node.js LTS 18+, Python 3.11+
- Docker + Docker Compose (opcional pero recomendado)

`README.md` e `INSTALL.md` son actualmente idénticos — si te piden actualizar uno, actualiza el otro también o señala que deberían consolidarse en un solo archivo para evitar que diverjan.

## Métodos de instalación

**Método A — Docker (recomendado)**:
```bash
cd Backend && cp .env.example .env
docker compose up --build -d
docker compose exec web python init_db.py
cd ../Frontend && pnpm install && pnpm dev
```

**Método B — Nativo (para debug directo)**:
```bash
cd Backend
docker compose up db -d   # solo la BD, mapeada a localhost:5433
cp .env.example .env      # editar POSTGRES_HOST=localhost, POSTGRES_PORT=5433
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python init_db.py
uvicorn app.main:app --reload
```
Frontend igual en ambos métodos: `cd Frontend && pnpm install && pnpm dev`.

**Diferencia clave entre métodos**: el `.env.example` por defecto asume red interna Docker (`POSTGRES_HOST=db`, puerto `5432`). En el Método B hay que sobrescribir explícitamente a `localhost:5433` — si no se hace, el backend nativo no podrá conectar a la BD.

## Variables de entorno (`Backend/.env.example`)

- **DB**: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST`, `POSTGRES_PORT`, `DATABASE_URL`
- **Seguridad**: `SECRET_KEY`, `ALGORITHM` (HS256), `ACCESS_TOKEN_EXPIRE_MINUTES`
- **CORS**: `CORS_ORIGINS`
- **App**: `APP_NAME`, `APP_VERSION`, `DEBUG`

**Meta/TikTok**: confirmado que estas variables **no existen** en `.env.example` a la fecha. Si vas a implementar o probar el flujo OAuth social, primero hay que añadirlas a la plantilla — no asumas que ya están ahí solo porque el módulo social existe en `servinow-social-oauth`.

## Verificar que el entorno funciona

- Healthcheck: `GET http://localhost:8000/api/v1/health` → `{"status":"ok","db_connection":true}`
- Tests backend (con venv activo, dentro de `Backend/`): `pytest` → éxito = `=== X passed in Ys ===`

## Script `start.bat`

Abre 3 paneles en Windows Terminal vía WSL: Backend (`uvicorn --reload`), Frontend (`npm run dev`), Ngrok (expone puerto 8000 con dominio fijo `limeade-legible-fifth.ngrok-free.dev`).

**⚠️ No es genérico — está hardcodeado para una máquina específica**:
- Rutas absolutas WSL quemadas (`\\wsl$\Ubuntu\home\davidcalle\Projects\Servinow`)
- Asume el entorno virtual se llama `venv`, **pero `INSTALL.md`/`README.md` indican `.venv`** — esta inconsistencia de nombre puede romper el script si alguien siguió la guía de instalación al pie de la letra. Si te piden arreglar `start.bat`, señala este desajuste y confirma cuál es el nombre real de la carpeta del entorno virtual antes de asumir uno.
- Dominio ngrok fijo a una cuenta particular

No lo trates como script reutilizable por defecto para otro desarrollador sin adaptarlo primero.

## Errores comunes al levantar el entorno

1. **`Connection Refused` a la BD en modo nativo**: causa casi siempre es no haber cambiado `POSTGRES_HOST`/`POSTGRES_PORT` de `db:5432` (Docker) a `localhost:5433` (nativo).
2. **`command not found` / fallos de import de FastAPI**: entorno virtual no activado (verificar prefijo en la terminal antes de correr `pip`/`uvicorn`).
3. **Lockfile desincronizado en frontend**: usar siempre `pnpm`, nunca `npm install` — el proyecto depende de resolución estricta de `pnpm`.
