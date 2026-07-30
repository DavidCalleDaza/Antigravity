# SERVINOW CONTEXT V11

## Diagnóstico de Integración Google Gemini/Veo — Backend

---

## 1. Configuración de IA en `app/core/config.py`

**Archivo:** `Backend/app/core/config.py` — Líneas 154-159

```python
# --- AI Generation (Testing Phase) ---
GEMINI_API_KEY: str = ""
GOOGLE_CLOUD_PROJECT: str = ""
GOOGLE_CLOUD_LOCATION: str = "global"
GCS_VIDEO_BUCKET: str = "servinow-ai-video-dev"
AI_VIDEO_DAILY_LIMIT: int = 50
```

**Total:** 5 variables de IA definidas en la clase `Settings`.

---

## 2. Archivo `Backend/.env` — Variables Existentes

**Ubicación:** `Backend/.env`

| Variable | Estado |
|---|---|
| `POSTGRES_USER` | ✅ presente |
| `POSTGRES_PASSWORD` | ✅ presente |
| `POSTGRES_DB` | ✅ presente |
| `POSTGRES_HOST` | ✅ presente |
| `POSTGRES_PORT` | ✅ presente |
| `DATABASE_URL` | ✅ presente |
| `GOOGLE_CLIENT_ID` | ✅ presente |
| `GOOGLE_CLIENT_SECRET` | ✅ presente |
| `GOOGLE_REDIRECT_URI` | ✅ presente |
| `SECRET_KEY` | ✅ presente (duplicado) |
| `ALGORITHM` | ✅ presente |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ✅ presente |
| `CORS_ORIGINS` | ✅ presente |
| `APP_NAME` | ✅ presente |
| `APP_VERSION` | ✅ presente |
| `DEBUG` | ✅ presente |
| `REDIS_URL` | ✅ presente |
| `COMPANY_EMAIL` | ✅ presente |
| `DIAN_RESOLUTION_NUMBER` | ✅ presente |
| `DIAN_RESOLUTION_DATE` | ✅ presente |
| `DIAN_RESOLUTION_RANGE_FROM` | ✅ presente |
| `DIAN_RESOLUTION_RANGE_TO` | ✅ presente |
| `FIELD_ENCRYPTION_KEY` | ✅ presente |
| **`GEMINI_API_KEY`** | **❌ AUSENTE** |
| **`GOOGLE_CLOUD_PROJECT`** | **❌ AUSENTE** |
| **`GOOGLE_CLOUD_LOCATION`** | **❌ AUSENTE** |
| **`GCS_VIDEO_BUCKET`** | **❌ AUSENTE** |

> **⚠️ Ninguna variable de AI/Veo está definida en `.env`.** Sin `GEMINI_API_KEY`, toda llamada a Gemini o Veo fallará.

---

## 3. Archivos del Módulo AI (`app/modules/ai/`)

### 3.1 `__init__.py`
```python
# AI module
```

### 3.2 `schemas.py`
```python
from pydantic import BaseModel, Field

class GenerateCopyRequest(BaseModel):
    product_name: str = Field(..., description="Name of the product or service")
    description: str = Field(..., description="Description of the product or service")
    tone: str = Field(default="persuasivo", description="Tone of the generated copy")

class GenerateVideoRequest(BaseModel):
    image_gcs_uri: str = Field(..., description="GCS URI of the uploaded image")
    prompt: str = Field(..., description="Prompt for the video generation")
    product_id: str | None = None
    service_id: str | None = None
```

### 3.3 `models.py`
```python
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base_class import Base

class AiGenerationTask(Base):
    __tablename__ = "ai_generation_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="SET NULL"), nullable=True)

    status = Column(String, default="pending", nullable=False) # pending, success, failed
    video_url = Column(String, nullable=True)
    estimated_cost_usd = Column(Numeric(precision=10, scale=4), nullable=True)
    error_message = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
```

### 3.4 `crud.py`
```python
import uuid
from datetime import datetime, time, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.modules.ai.models import AiGenerationTask
from app.core.config import settings

async def create_ai_task(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID = None, service_id: uuid.UUID = None) -> AiGenerationTask:
    db_obj = AiGenerationTask(
        user_id=user_id,
        product_id=product_id,
        service_id=service_id,
        status="pending"
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def update_ai_task_status(db: AsyncSession, task_id: uuid.UUID, status: str, video_url: str = None, error_message: str = None, estimated_cost_usd: float = None) -> AiGenerationTask:
    result = await db.execute(select(AiGenerationTask).where(AiGenerationTask.id == task_id))
    task = result.scalar_one_or_none()
    if task:
        task.status = status
        if video_url:
            task.video_url = video_url
        if error_message:
            task.error_message = error_message
        if estimated_cost_usd is not None:
            task.estimated_cost_usd = estimated_cost_usd
        if status in ["success", "failed"]:
            task.completed_at = func.now()
        await db.commit()
        await db.refresh(task)
    return task

async def get_ai_task(db: AsyncSession, task_id: uuid.UUID) -> AiGenerationTask:
    result = await db.execute(select(AiGenerationTask).where(AiGenerationTask.id == task_id))
    return result.scalar_one_or_none()

async def count_video_tasks_today(db: AsyncSession) -> int:
    today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min).replace(tzinfo=timezone.utc)
    result = await db.execute(
        select(func.count(AiGenerationTask.id)).where(AiGenerationTask.created_at >= today_start)
    )
    return result.scalar_one() or 0
```

### 3.5 `service.py`
```python
from google import genai
from app.core.config import settings

async def generate_social_copy(product_name: str, description: str, tone: str = "persuasivo") -> str:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    prompt = (
        f"Escribe un texto {tone} y breve (máximo 280 caracteres) para publicar en redes "
        f"sociales sobre este producto: '{product_name}'. Descripción: {description}. "
        f"No uses hashtags excesivos ni emojis de más."
    )
    
    import logging
    logger = logging.getLogger(__name__)
    
    models_to_try = [
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-lite-latest",
        "gemini-2.0-flash-lite"
    ]
    last_error = None
    
    for model_name in models_to_try:
        try:
            logger.info(f"Generating social copy using model: {model_name}")
            response = await client.aio.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            return response.text
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {e}. Trying next fallback...")
            last_error = e
            
    raise last_error


import asyncio
import os

async def generate_video_from_image(local_image_path: str, prompt: str) -> str:
    # Use standard AI Studio API (no Vertex AI)
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    # Read local image bytes
    with open(local_image_path, "rb") as f:
        image_bytes = f.read()
        
    from google.genai import types
    image_obj = types.Image(image_bytes=image_bytes, mime_type="image/jpeg")

    # Generate the video
    operation = client.models.generate_videos(
        model="veo-3.1-fast-generate-preview",
        prompt=prompt,
        image=image_obj
    )
    
    # Polling the operation
    while not operation.done:
        await asyncio.sleep(15)
        operation = client.operations.get(operation=operation)
        
    if operation.error:
        raise RuntimeError(f"Veo error: {operation.error}")
        
    if not operation.result or not operation.result.generated_videos:
        raise RuntimeError("Veo no devolvió un video generado")
        
    generated_video = operation.result.generated_videos[0].video
    
    # Save the generated video to local uploads/items/ to be served statically
    video_uri = generated_video.uri 
    
    # Alternatively, we could download the video bytes. Does generated_video have bytes?
    # Or we just return the URI if it's accessible. But AI Studio URIs might expire or require auth!
    # Wait! If we return the URI, the frontend might not be able to load it!
    # Let's download the bytes and save it locally!
    import httpx
    import uuid
    video_filename = f"{uuid.uuid4()}.mp4"
    video_path = f"uploads/items/{video_filename}"
    os.makedirs("uploads/items", exist_ok=True)
    
    async with httpx.AsyncClient() as http_client:
        # We might need to pass the API key to download it
        headers = {"x-goog-api-key": settings.GEMINI_API_KEY}
        resp = await http_client.get(video_uri, headers=headers)
        if resp.status_code == 200:
            with open(video_path, "wb") as f:
                f.write(resp.content)
            return f"/uploads/items/{video_filename}"
        else:
            # Fallback to returning the URI directly if download fails
            return video_uri
```

### 3.6 `tasks.py`
```python
import asyncio
import uuid
from app.core.celery_app import celery_app
from app.db.session import async_session_factory
from app.modules.ai import crud, service

async def _process_video_task(task_id_str: str, image_gcs_uri: str, prompt: str):
    task_id = uuid.UUID(task_id_str)
    
    async with async_session_factory() as db:
        try:
            # Generate the video
            video_uri = await service.generate_video_from_image(image_gcs_uri, prompt)
            
            # Update the task status to success
            await crud.update_ai_task_status(
                db, 
                task_id, 
                status="success", 
                video_url=video_uri,
                estimated_cost_usd=0.60 # Default estimated cost for Veo Fast mode
            )
        except Exception as e:
            # Update task status to failed
            await crud.update_ai_task_status(
                db, 
                task_id, 
                status="failed", 
                error_message=str(e)
            )
            raise e

@celery_app.task(
    name="ai.generate_video",
    bind=True,
    max_retries=1, # Veo tasks shouldn't be retried too many times due to cost
)
def generate_video_task(self, task_id_str: str, image_gcs_uri: str, prompt: str):
    """
    Celery task to generate a video using Veo in the background.
    """
    loop = celery_app._worker_loop
    try:
        loop.run_until_complete(
            _process_video_task(task_id_str, image_gcs_uri, prompt)
        )
    except Exception as exc:
        raise self.retry(exc=exc, countdown=10)
```

### 3.7 `router.py`
```python
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from google.cloud import storage
import uuid
from app.db.session import get_db
from app.modules.auth.deps import get_current_user
from app.modules.ai import schemas, service, crud, tasks
from app.core.config import settings

router = APIRouter()

@router.post("/generate-copy")
async def generate_copy(
    payload: schemas.GenerateCopyRequest,
    current_user = Depends(get_current_user),
):
    text = await service.generate_social_copy(payload.product_name, payload.description, payload.tone)
    return {"text": text}

@router.post("/generate-video")
async def generate_video(
    prompt: str = Form(...),
    product_id: str = Form(None),
    service_id: str = Form(None),
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo los administradores pueden generar videos.")
        
    if await crud.count_video_tasks_today(db) >= settings.AI_VIDEO_DAILY_LIMIT:
        raise HTTPException(status_code=429, detail="Límite de videos de prueba alcanzado por hoy, intenta mañana.")
        
    # Guardar archivo localmente para la tarea Celery
    import os
    os.makedirs("uploads/inputs", exist_ok=True)
    local_filename = f"uploads/inputs/{uuid.uuid4()}.jpg"
    
    try:
        with open(local_filename, "wb") as f:
            f.write(await file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error guardando imagen localmente: {e}")
        
    # Crear tarea en BD
    task = await crud.create_ai_task(
        db=db,
        user_id=current_user.id,
        product_id=uuid.UUID(product_id) if product_id else None,
        service_id=uuid.UUID(service_id) if service_id else None,
    )
    
    # Encolar en Celery
    tasks.generate_video_task.delay(str(task.id), local_filename, prompt)
    
    return {"task_id": str(task.id)}

@router.get("/task/{task_id}")
async def get_task_status(
    task_id: str,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await crud.get_ai_task(db, uuid.UUID(task_id))
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
        
    if task.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para ver esta tarea.")
        
    return {
        "id": str(task.id),
        "status": task.status,
        "video_url": task.video_url,
        "error_message": task.error_message
    }
```

---

## 4. `test_ai_service.py` (raíz de Backend/)

```python
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
```

---

## 5. Scripts de Verificación Veo (raíz de Backend/)

### `check_veo.py`
```python
import os
import time
import google.genai as genai

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
try:
    print("Uploading file...")
    pass
except Exception as e:
    print('Error:', e)
```

### `check_veo_signature.py`
```python
import os
import google.genai as genai
import inspect

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
print(inspect.signature(client.models.generate_videos))
```

---

## 6. Todas las Referencias a IA en `app/` (grep)

| Archivo | Línea | Contenido |
|---|---|---|
| `app/modules/ai/router.py` | 21 | `async def generate_video(` |
| `app/modules/ai/router.py` | 55 | `tasks.generate_video_task.delay(str(task.id), local_filename, prompt)` |
| `app/modules/ai/service.py` | 16 | `"gemini-3.5-flash"` |
| `app/modules/ai/service.py` | 17 | `"gemini-3.1-flash-lite"` |
| `app/modules/ai/service.py` | 18 | `"gemini-flash-lite-latest"` |
| `app/modules/ai/service.py` | 19 | `"gemini-2.0-flash-lite"` |
| `app/modules/ai/service.py` | 26 | `response = await client.aio.models.generate_content(` |
| `app/modules/ai/service.py` | 41 | `async def generate_video_from_image(local_image_path: str, prompt: str) -> str:` |
| `app/modules/ai/service.py` | 49 | `from google.genai import types` |
| `app/modules/ai/service.py` | 53 | `operation = client.models.generate_videos(` |
| `app/modules/ai/service.py` | 54 | `model="veo-3.1-fast-generate-preview"` |
| `app/modules/ai/tasks.py` | 13 | `video_uri = await service.generate_video_from_image(image_gcs_uri, prompt)` |
| `app/modules/ai/tasks.py` | 34 | `name="ai.generate_video"` |
| `app/modules/ai/tasks.py` | 38 | `def generate_video_task(self, task_id_str: str, image_gcs_uri: str, prompt: str):` |
| `app/modules/whatsapp/ai.py` | 20 | `response = await client.aio.models.generate_content(` |
| `app/modules/whatsapp/ai.py` | 21 | `model="gemini-2.5-flash"` |

---

## 7. Dependencias en `requirements.txt`

```
google-genai>=0.2.0
google-cloud-storage>=2.10.0
```

---

## 8. Endpoints de API Relacionados

**Router montado en:** `app/main.py:141-143` → `prefix="/api/v1/ai"` con tag `"AI Generation"`

| Método | Ruta | Función | Auth |
|---|---|---|---|
| **POST** | `/api/v1/ai/generate-copy` | `generate_copy` | `get_current_user` |
| **POST** | `/api/v1/ai/generate-video` | `generate_video` | `get_current_user` + `role == "admin"` |
| **GET** | `/api/v1/ai/task/{task_id}` | `get_task_status` | `get_current_user` |

Además, el módulo `app/modules/whatsapp/ai.py` usa Gemini internamente para parseo de lenguaje natural, invocado desde el router de WhatsApp (no expuesto directamente como endpoint AI).

---

## 9. Resumen de Hallazgos

| # | Hallazgo | Impacto |
|---|---|---|
| 1 | **`GEMINI_API_KEY` ausente en `.env`** — ninguna de las 5 variables de IA del `Settings` están definidas | Toda llamada a Gemini/Veo falla |
| 2 | **Nombres de modelos Gemini probablemente incorrectos**: `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-flash-lite-latest` (no corresponden a modelos reales conocidos) | Fallback loop siempre fallará |
| 3 | Modelo Veo usado: `veo-3.1-fast-generate-preview` | Verificar si es nombre real del API |
| 4 | Módulo `ai/` completo: modelo BD, CRUD, schemas, router, service + Celery task | Estructuralmente sólido pero sin API key |
| 5 | Gemini también integrado en módulo WhatsApp (`gemini-2.5-flash`) | Misma dependencia de API key |
| 6 | `check_veo.py` y `check_veo_signature.py` están incompletos (exploratorios) | Bajo riesgo, scripts de prueba |
| 7 | Dependencia `google-genai>=0.2.0` presente | Correcta para el SDK |
| 8 | Límite diario de videos: 50 (`AI_VIDEO_DAILY_LIMIT`) | Control de costos implementado |
