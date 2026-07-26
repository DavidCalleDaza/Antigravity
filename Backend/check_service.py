import asyncio
try:
    from app.modules.whatsapp.service import whatsapp_service
    print("service OK")
    from app.modules.whatsapp.ai import parse_whatsapp_intent
    print("ai OK")
    result = asyncio.run(whatsapp_service.send_text_message("573136899547", "Test desde check_service.py"))
    print(f"send result: {result}")
except Exception as e:
    import traceback
    traceback.print_exc()
