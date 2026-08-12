import logging
import asyncio
import base64
import os

from google import genai
from app.core.config import settings

logger = logging.getLogger(__name__)

# Cascade de modelos de texto, en orden de preferencia.
# NOTA: gemini-2.0-flash-lite fue deprecado por Google el 2026-06-01 y NO se
# incluye aquí; sigue en tokens/pricing.py solo para precio histórico.
TEXT_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
]


def extract_usage_counts(response) -> dict | None:
    """
    Read real token counts from ``response.usage_metadata`` if available
    (google-genai 2.15.0 exposes prompt_token_count / candidates_token_count /
    thoughts_token_count). Returns None when the shape is absent so callers
    fall back to estimation and mark ``is_estimated=True``.
    """
    meta = getattr(response, "usage_metadata", None)
    if meta is None:
        return None
    return {
        "input_tokens": int(getattr(meta, "prompt_token_count", 0) or 0),
        "output_tokens": int(getattr(meta, "candidates_token_count", 0) or 0),
        "thought_tokens": int(getattr(meta, "thoughts_token_count", 0) or 0),
    }


def estimate_counts(prompt: str, text: str) -> dict:
    """Rough token estimate (4 chars/token) used when metadata is missing."""
    return {
        "input_tokens": max(len(prompt) // 4, 0),
        "output_tokens": max(len(text) // 4, 0),
        "thought_tokens": 0,
    }


async def _generate_text(prompt: str) -> tuple[str, str, dict, bool]:
    """Run the fallback cascade; returns (text, model_name, usage_counts, is_estimated)."""
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    last_error = None

    for model_name in TEXT_MODELS:
        try:
            logger.info(f"Generating text using model: {model_name}")
            response = await client.aio.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            usage = extract_usage_counts(response)
            if usage is None:
                usage = estimate_counts(prompt, response.text or "")
                return response.text, model_name, usage, True
            return response.text, model_name, usage, False
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {e}. Trying next fallback...")
            last_error = e

    raise last_error


async def generate_social_copy(
    product_name: str,
    description: str,
    tone: str = "persuasivo",
) -> tuple[str, str, dict, bool]:
    """Generate social media copy; returns (text, model_name, usage_counts, is_estimated)."""
    prompt = (
        f"Escribe un texto {tone} y breve (máximo 280 caracteres) para publicar en redes "
        f"sociales sobre este producto: '{product_name}'. Descripción: {description}. "
        f"No uses hashtags excesivos ni emojis de más."
    )
    return await _generate_text(prompt)


async def improve_wall_post_copy(
    content: str,
    tone: str = "auténtico y cercano",
) -> tuple[str, str, dict, bool]:
    """
    Improve a wall post draft for a community/donation post.
    Returns (improved_text, model_name, usage_counts, is_estimated).
    """
    prompt = (
        "Mejora la redacción de este texto para una publicación comunitaria sobre una "
        "donación o testimonio de impacto. Corrige gramática y claridad, mantén el tono "
        f"humano y sincero ({tone}), no lo conviertas en un anuncio, no agregues hashtags "
        "ni emojis excesivos, máximo 600 caracteres. "
        f"Texto original: '{content}'"
    )
    return await _generate_text(prompt)


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
    video_uri = generated_video.uri

    import httpx
    import uuid
    video_filename = f"{uuid.uuid4()}.mp4"
    video_path = f"uploads/items/{video_filename}"
    os.makedirs("uploads/items", exist_ok=True)

    async with httpx.AsyncClient() as http_client:
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


async def enhance_image(
    image_bytes: bytes,
    mime_type: str,
    prompt: str | None = None,
) -> tuple[bytes, str, dict | None, bool]:
    """
    Mejora una imagen con gemini-2.5-flash-image (edición de imagen).
    Returns (enhanced_bytes, mime_type, usage_counts|None, is_estimated).
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
    usage = extract_usage_counts(response)
    is_estimated = usage is None
    if is_estimated:
        usage = {"input_tokens": 0, "output_tokens": 0, "thought_tokens": 0}

    if response.candidates and response.candidates[0].finish_reason != types.FinishReason.STOP:
        raise RuntimeError(f"Gemini finalizó sin generar la imagen: {response.candidates[0].finish_reason}")

    if response.candidates:
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.data:
                enhanced = base64.b64decode(part.inline_data.data)
                return enhanced, part.inline_data.mime_type or "image/png", usage, is_estimated

    if getattr(response, "generated_images", None) and response.generated_images:
        image = response.generated_images[0].image
        return image.image_bytes, image.mime_type or "image/png", usage, is_estimated

    raise RuntimeError("Gemini no devolvió una imagen mejorada")