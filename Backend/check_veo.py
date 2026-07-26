import os
import time
import google.genai as genai

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
try:
    print("Uploading file...")
    # Just create a dummy image or use an existing one in the frontend uploads if any.
    # We will upload a dummy text file to test the API structure? No, veo needs an image.
    pass
except Exception as e:
    print('Error:', e)
