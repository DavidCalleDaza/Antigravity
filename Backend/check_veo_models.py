import os
from google import genai

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

print("Modelos disponibles que contienen 'veo':")
for model in client.models.list():
    if 'veo' in model.name.lower():
        print(f"  - {model.name}")
