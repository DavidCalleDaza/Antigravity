import google.genai.types as types
img = types.Image(image_bytes=b"123", mime_type="image/jpeg")
print("Image created:", img)
