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
import base64
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


DEFAULT_ENHANCE_PROMPT = (
    "Mejora la calidad de esta imagen: aumenta la nitidez, corrige la iluminación y el balance "
    "de color, y reduce el ruido. Mantén la composición, los sujetos y el contenido originales "
    "sin alteraciones significativas. Devuelve únicamente la imagen mejorada."
)


async def enhance_image(image_bytes: bytes, mime_type: str, prompt: str | None = None) -> tuple[bytes, str]:
    """
    Mejora una imagen con gemini-2.5-flash-image (edición de imagen).

    NOTA (pendiente): este endpoint NO tiene límite diario ni control de costo en el ciclo
    actual (a diferencia de /ai/generate-video, que usa AI_VIDEO_DAILY_LIMIT). Gemini cobra
    por request de imagen; antes de producción revisar:
    - contador diario por usuario (como crud.count_video_tasks_today),
    - o reutilizar ai_generation_tasks añadiendo una columna `type`.

    Shape real de la respuesta (verificado contra docs del SDK google-genai 0.8+):
    la imagen generada viene en candidates[0].content.parts[] como part.inline_data
    (base64), NO en response.generated_images (ese shape es solo de generate_images/Imagen
    y de generate_videos). Se deja igualmente un fallback defensivo por si el shape cambia.
    """
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    from google.genai import types
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[image_part, prompt or DEFAULT_ENHANCE_PROMPT],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
        ),
    )

    if response.candidates and response.candidates[0].finish_reason != types.FinishReason.STOP:
        raise RuntimeError(f"Gemini finalizó sin generar la imagen: {response.candidates[0].finish_reason}")

    if response.candidates:
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.data:
                enhanced = base64.b64decode(part.inline_data.data)
                return enhanced, part.inline_data.mime_type or "image/png"

    if getattr(response, "generated_images", None) and response.generated_images:
        image = response.generated_images[0].image
        return image.image_bytes, image.mime_type or "image/png"

    raise RuntimeError("Gemini no devolvió una imagen mejorada")
