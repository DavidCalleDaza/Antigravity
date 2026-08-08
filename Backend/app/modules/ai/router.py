from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from google.cloud import storage
import base64
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

@router.post("/enhance-image")
async def enhance_image(
    file: UploadFile = File(...),
    prompt: str | None = Form(None),
    current_user = Depends(get_current_user),
):
    # NOTA (pendiente): sin límite diario ni control de costo en este ciclo (a diferencia de
    # /generate-video). Gemini cobra por request de imagen — revisar antes de producción:
    # contador diario por usuario o columna `type` en ai_generation_tasks (ver service.enhance_image).
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Formato de imagen no soportado (jpeg, png, webp).")

    try:
        image_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error leyendo la imagen: {e}")

    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Imagen demasiado grande (máx 5MB).")

    try:
        enhanced_bytes, mime_type = await service.enhance_image(
            image_bytes, file.content_type or "image/jpeg", prompt
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error mejorando la imagen con IA: {e}")

    return {
        "image_base64": base64.b64encode(enhanced_bytes).decode("ascii"),
        "mime_type": mime_type,
    }

