import httpx
import asyncio
import json

async def main():
    # Test webhook GET (verification)
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "http://localhost:8000/api/v1/whatsapp/webhook",
            params={
                "hub.mode": "subscribe",
                "hub.challenge": "TEST123",
                "hub.verify_token": "servinow_whatsapp_secret_123"
            }
        )
        print(f"GET /webhook status: {r.status_code}")
        print(f"GET /webhook body: {r.text}")
        
        # Test webhook POST (simulate incoming message)
        fake_payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "1540734430762556",
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {"phone_number_id": "1279745251878274"},
                        "messages": [{
                            "from": "573106899547",
                            "type": "text",
                            "text": {"body": "Hola bot de prueba"}
                        }]
                    },
                    "field": "messages"
                }]
            }]
        }
        r2 = await client.post(
            "http://localhost:8000/api/v1/whatsapp/webhook",
            json=fake_payload
        )
        print(f"POST /webhook status: {r2.status_code}")
        print(f"POST /webhook body: {r2.text}")

asyncio.run(main())
