import os
import google.genai as genai
import inspect

client = genai.Client()
print(inspect.signature(client.models.generate_videos))
