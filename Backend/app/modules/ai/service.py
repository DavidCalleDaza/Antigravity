from google import genai
from app.core.config import settings

async def generate_social_copy(product_name: str, description: str, tone: str = "persuasivo") -> str:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    prompt = (
        f"Escribe un texto {tone} y breve (máximo 280 caracteres) para publicar en redes "
        f"sociales sobre este producto: '{product_name}'. Descripción: {description}. "
        f"No uses hashtags excesivos ni emojis de más."
    )
    response = await client.aio.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
    )
    return response.text

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
