from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from google.cloud import storage
import base64
import uuid
from app.db.session import get_db
from app.modules.auth.deps import get_current_user
from app.modules.ai import schemas, service, crud, tasks
from app.core.config import settings

router = APIRouter()


async def _record_ai_usage(
    db: AsyncSession,
    user,
    *,
    ai_action: str,
    model_name: str,
    usage: dict,
    is_estimated: bool,
    price_kwargs: dict,
    customer_id=None,
    post_id=None,
    product_id=None,
    service_id=None,
):
    """
    Estimate the USD cost from the token/image/video counts and persist a
    TokenUsage row. Commits inside (usage is final once the AI call finished).
    """
    from app.modules.tokens.pricing import estimate_cost_usd
    from app.modules.tokens.service import record_usage

    cost = estimate_cost_usd(model_name, **price_kwargs)
    await record_usage(
        db,
        user_id=user.id,
        ai_action=ai_action,
        model_name=model_name,
        cost_usd=cost,
        input_tokens=usage.get("input_tokens", 0),
        output_tokens=usage.get("output_tokens", 0),
        image_count=price_kwargs.get("image_count", 0),
        video_seconds=price_kwargs.get("video_seconds", 0),
        is_estimated=is_estimated,
        customer_id=customer_id,
        post_id=post_id,
        product_id=product_id,
        service_id=service_id,
    )


async def _enforce_hourly_limit(db: AsyncSession, user) -> None:
    from app.modules.tokens.service import enforce_hourly_limit
    await enforce_hourly_limit(db, user.id)


@router.post("/generate-copy", response_model=schemas.GenerateCopyResponse)
async def generate_copy(
    payload: schemas.GenerateCopyRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate social media copy and persist the request (CR-3).

    The request is stored in ``ai_copy_requests`` so the frontend can show a
    generation history; the result is returned synchronously with the task id.
    """
    await _enforce_hourly_limit(db, current_user)

    request = await crud.create_copy_request(
        db=db,
        user_id=current_user.id,
        product_name=payload.product_name,
        description=payload.description,
        tone=payload.tone,
        platform=payload.platform,
    )
    try:
        text, model_name, usage, is_estimated = await service.generate_social_copy(
            payload.product_name, payload.description, payload.tone
        )
    except Exception as e:
        request = await crud.fail_copy_request(db, request.id, str(e))
        return schemas.GenerateCopyResponse(
            task_id=request.id, status="failed", error_message=str(e)
        )

    await _record_ai_usage(
        db,
        current_user,
        ai_action="generate_copy",
        model_name=model_name,
        usage=usage,
        is_estimated=is_estimated,
        price_kwargs={
            "input_tokens": usage.get("input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0),
        },
    )

    request = await crud.complete_copy_request(db, request.id, text)
    return schemas.GenerateCopyResponse(task_id=request.id, status="success", text=text)


@router.post("/improve-post-copy", response_model=schemas.ImprovePostCopyResponse)
async def improve_post_copy(
    payload: schemas.ImprovePostCopyRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Improve a wall post draft with AI (Fase 4).

    If ``post_id`` is provided, the post must exist and belong to the user
    (or the user must be admin). When the post mentions customers, the first
    mention (pending or confirmed) is attributed as ``customer_id`` on the
    TokenUsage row.
    """
    await _enforce_hourly_limit(db, current_user)

    customer_id = None
    post_id = payload.post_id
    if post_id is not None:
        from app.modules.wall.crud import get_post

        post = await get_post(db, post_id)
        if post is None:
            raise HTTPException(status_code=404, detail="Post no encontrado.")
        if post.author_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="No autorizado.")
        for mention in post.customer_mentions:
            if mention.status in {"pending", "confirmed"}:
                customer_id = mention.customer_id
                break

    try:
        text, model_name, usage, is_estimated = await service.improve_wall_post_copy(
            payload.content, payload.tone or "auténtico y cercano"
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error mejorando el texto con IA: {e}")

    await _record_ai_usage(
        db,
        current_user,
        ai_action="improve_post_copy",
        model_name=model_name,
        usage=usage,
        is_estimated=is_estimated,
        price_kwargs={
            "input_tokens": usage.get("input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0),
        },
        customer_id=customer_id,
        post_id=post_id,
    )

    return schemas.ImprovePostCopyResponse(text=text)


@router.get("/copy-requests/{request_id}", response_model=schemas.CopyRequestResponse)
async def get_copy_request(
    request_id: uuid.UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the status/result of a single copy request."""
    request = await crud.get_copy_request(db, request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if request.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para ver esta solicitud.")
    return request


@router.get("/copy-requests/history", response_model=list[schemas.CopyRequestResponse])
async def list_copy_requests(
    limit: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's copy generation history (most recent first)."""
    return await crud.list_copy_requests(db, current_user.id, limit=limit)


@router.post("/archived-copies", response_model=schemas.ArchivedCopyResponse, status_code=status.HTTP_201_CREATED)
async def create_archived_copy(
    payload: schemas.ArchivedCopyCreate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a copy text so the user can reuse it later."""
    return await crud.create_archived_copy(
        db=db,
        user_id=current_user.id,
        title=payload.title,
        content=payload.content,
        kind=payload.kind,
        source_task_id=payload.source_task_id,
    )


@router.get("/archived-copies", response_model=list[schemas.ArchivedCopyResponse])
async def list_archived_copies(
    limit: int = Query(50, ge=1, le=100),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's archived copies."""
    return await crud.list_archived_copies(db, current_user.id, limit=limit)


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

    await _enforce_hourly_limit(db, current_user)

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
        "media_url": task.media_url,
        "error_message": task.error_message
    }


@router.post("/enhance-audio")
async def enhance_audio(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reduce ruido y normaliza volumen de un audio con Auphonic (asíncrono).
    Responde de inmediato con {task_id}; el resultado se consulta con
    GET /ai/task/{task_id} (campo media_url cuando status == "success").
    """
    if not settings.AUPHONIC_API_KEY:
        raise HTTPException(status_code=503, detail="Servicio de mejora de audio no configurado.")

    await _enforce_hourly_limit(db, current_user)

    try:
        audio_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error leyendo el audio: {e}")

    if len(audio_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio demasiado grande (máx 5MB).")

    import os
    os.makedirs("uploads/inputs", exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1] or ".mp3"
    local_filename = f"uploads/inputs/{uuid.uuid4()}{ext}"
    try:
        with open(local_filename, "wb") as f:
            f.write(audio_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error guardando el audio localmente: {e}")

    task = await crud.create_ai_task(db=db, user_id=current_user.id, task_type="enhance_audio")
    tasks.enhance_audio_task.delay(str(task.id), local_filename)

    return {"task_id": str(task.id)}


@router.post("/enhance-video")
async def enhance_video(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Aumenta la resolución/calidad de un video con Replicate (asíncrono).
    Responde de inmediato con {task_id}; el resultado se consulta con
    GET /ai/task/{task_id} (campo media_url cuando status == "success").
    """
    if not settings.REPLICATE_API_TOKEN:
        raise HTTPException(status_code=503, detail="Servicio de mejora de video no configurado.")

    await _enforce_hourly_limit(db, current_user)

    try:
        video_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error leyendo el video: {e}")

    if len(video_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Video demasiado grande (máx 25MB).")

    import os
    os.makedirs("uploads/inputs", exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1] or ".mp4"
    local_filename = f"uploads/inputs/{uuid.uuid4()}{ext}"
    try:
        with open(local_filename, "wb") as f:
            f.write(video_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error guardando el video localmente: {e}")

    task = await crud.create_ai_task(db=db, user_id=current_user.id, task_type="enhance_video")
    tasks.enhance_video_task.delay(str(task.id), local_filename)

    return {"task_id": str(task.id)}


@router.post("/enhance-image")
async def enhance_image(
    file: UploadFile = File(...),
    prompt: str | None = Form(None),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Formato de imagen no soportado (jpeg, png, webp).")

    await _enforce_hourly_limit(db, current_user)

    try:
        image_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error leyendo la imagen: {e}")

    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Imagen demasiado grande (máx 5MB).")

    try:
        enhanced_bytes, mime_type, usage, is_estimated = await service.enhance_image(
            image_bytes, file.content_type or "image/jpeg", prompt
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error mejorando la imagen con IA: {e}")

    await _record_ai_usage(
        db,
        current_user,
        ai_action="enhance_image",
        model_name="gemini-2.5-flash-image",
        usage=usage,
        is_estimated=is_estimated,
        price_kwargs={
            "input_tokens": usage.get("input_tokens", 0),
            "image_count": 1,
        },
    )

    return {
        "image_base64": base64.b64encode(enhanced_bytes).decode("ascii"),
        "mime_type": mime_type,
    }


@router.post("/describe-media")
async def describe_media(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Genera un texto/caption sugerido a partir del contenido real de una
    imagen/audio/video (multimodal, síncrono — cabe dentro del límite de
    datos inline de Gemini).
    """
    content_type = file.content_type or ""
    if not (
        content_type.startswith("image/")
        or content_type.startswith("audio/")
        or content_type.startswith("video/")
    ):
        raise HTTPException(status_code=400, detail="Tipo de archivo no soportado (imagen, audio o video).")

    await _enforce_hourly_limit(db, current_user)

    try:
        media_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error leyendo el archivo: {e}")

    if len(media_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo demasiado grande (máx 25MB).")

    try:
        text, model_name, usage, is_estimated = await service.describe_media(media_bytes, content_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error generando texto con IA: {e}")

    await _record_ai_usage(
        db,
        current_user,
        ai_action="describe_media",
        model_name=model_name,
        usage=usage,
        is_estimated=is_estimated,
        price_kwargs={
            "input_tokens": usage.get("input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0),
        },
    )

    return {"text": text}