try:
    from app.modules.whatsapp.tasks import process_whatsapp_message
    print("IMPORT OK")
except Exception as e:
    import traceback
    traceback.print_exc()
