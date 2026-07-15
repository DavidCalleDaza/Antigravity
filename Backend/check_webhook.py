import requests

try:
    url = "http://localhost:8000/api/v1/whatsapp/webhook"
    params = {"hub.mode": "subscribe", "hub.challenge": "12345", "hub.verify_token": "servinow_whatsapp_secret_123"}
    response = requests.get(url, params=params)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
