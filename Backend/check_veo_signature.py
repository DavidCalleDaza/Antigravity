import os
import google.genai as genai
import inspect

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
print(inspect.signature(client.models.generate_videos))
