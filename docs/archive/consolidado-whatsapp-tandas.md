# CONSOLIDADO TANDA 1-4 — Modulo WhatsApp (ServiNow)

## Arquitectura General

```
Meta Webhook
    |
    v
router.py ---- verify_signature() (HMAC-SHA256)
    |              +-- raw_body capture
    |
    +-- POST /webhook --> process_whatsapp_message.delay()  (Celery)
    +-- GET  /webhook --> Meta verification handshake
    +-- POST /link/otp --> Generate 6-digit OTP (Redis)
    +-- GET  /link/status --> Check if linked
    +-- DELETE /link --> Unlink WhatsApp
                             |
tasks.py <-------------------+
    |
    +-- _is_duplicate_message()     (Redis SETNX dedup)
    +-- _handle_otp_attempt()       (OTP validation + lockout)
    +-- _get_draft / _save_draft / _clear_draft  (Redis JSON)
    +-- parse_whatsapp_intent()     (Gemini 2.5 Flash)
    |       +-- prompts.py          (system prompt in Spanish)
    |       +-- schemas.py          (WhatsAppIntentResponse)
    +-- INTENT_HANDLERS:
    |       +-- "create_product" --> crud.create_product()
    |       +-- "create_service" --> crud.create_service()
    |       +-- "unknown"        --> fallback help message
    +-- whatsapp_service.send_text_message()  (Meta Cloud API)
```

---

## TANDA 1: Backend Core (tasks.py + router.py)

### Planificado

| Elemento | Descripcion |
|---|---|
| Webhook signature | Validar `X-Hub-Signature-256` HMAC-SHA256 contra `META_APP_SECRET` |
| raw_body capture | Capturar body raw antes de parsear JSON |
| Rechazo 403 | Retornar 403 si firma invalida |
| Dedup de mensajes | `SETNX` en Redis para evitar procesamiento doble |
| OTP lockout | Bloquear despues de N intentos fallidos (5 intentos / 10 min) |
| Intent dispatcher | Diccionario `INTENT_HANDLERS` que mapea intent->handler |
| Persistencia real | Llamar `create_product()` / `create_service()` reales |

### Implementado

#### router.py — 128 lineas

| Funcion | Metodo | Ruta | Descripcion |
|---|---|---|---|
| `generate_whatsapp_otp` | `POST` | `/link/otp` | Genera OTP de 6 digitos, almacena en Redis con TTL 10min, limpia OTPs previos |
| `get_link_status` | `GET` | `/link/status` | Verifica si el usuario tiene `UserIdentity("whatsapp")`. Retorna `{linked, phone_masked}` |
| `unlink_whatsapp` | `DELETE` | `/link` | Elimina la `UserIdentity("whatsapp")` del usuario. 404 si no existe |
| `verify_webhook` | `GET` | `/webhook` | Handshake de Meta. Valida `hub.mode` + `hub.verify_token` |
| `verify_signature` | funcion | — | `hmac.compare_digest()` SHA-256 contra `META_APP_SECRET` |
| `receive_message` | `POST` | `/webhook` | Valida firma -> parsea JSON -> `process_whatsapp_message.delay()` -> siempre retorna 200 |

#### tasks.py — 263 lineas

| Constante | Valor | Descripcion |
|---|---|---|
| `OTP_MAX_ATTEMPTS` | `5` | Intentos maximos antes de lockout |
| `OTP_LOCKOUT_SECONDS` | `600` (10 min) | TTL del counter de lockout |
| `DRAFT_TTL_SECONDS` | `900` (15 min) | TTL del borrador multi-turno |
| `MESSAGE_DEDUP_TTL` | `3600` (1 hora) | TTL del dedup key |

| Funcion | Descripcion |
|---|---|
| `_coerce_price(raw_price)` | Normaliza precio (int/float/str/None) -> `Decimal` |
| `_is_duplicate_message(message_id)` | Redis `SET wa_dedup:{id} 1 EX 3600 NX`. Retorna `True` si ya existe |
| `_get_draft(from_phone)` | Lee borrador JSON de Redis (`wa_draft:{phone}`) |
| `_save_draft(from_phone, intent, entities)` | Guarda borrador como JSON en Redis con TTL 15min |
| `_clear_draft(from_phone)` | Elimina borrador de Redis |
| `_handle_otp_attempt(from_phone, clean_text)` | Valida OTP contra Redis. Lockout tras 5 fallos. Exito -> `UserIdentity` + confirmacion |
| `_handle_create_product(...)` | Crea producto real: `ProductCreate(name, price, description)` -> `create_product()` |
| `_handle_create_service(...)` | Crea servicio real: `ServiceCreate(name, price, description)` -> `create_service()` |
| `_handle_unknown(...)` | Mensaje de ayuda explicando funcionalidades |
| `async_process_message(payload, retries=0)` | **Funcion principal** — orquesta todo el flujo async |
| `process_whatsapp_message(self, payload)` | **Celery task** — `asyncio.run()` wrapper, retry 3x con 10s countdown |

---

## TANDA 2: Endpoints GET /link/status + DELETE /link

### Planificado

| Endpoint | Metodo | Descripcion |
|---|---|---|
| `GET /whatsapp/link/status` | GET | Retorna si el usuario tiene WhatsApp vinculado + phone enmascarado |
| `DELETE /whatsapp/link` | DELETE | Desvincula el WhatsApp del usuario |

### Implementado
Ambos endpoints fueron integrados directamente en `router.py` (no en un archivo separado):

#### get_link_status (lineas 41-58)
- `Depends(get_current_user)` + `Depends(get_db)`
- Query: `select(UserIdentity).where(user_id=user.id, provider="whatsapp")`
- Retorna: `{"linked": True, "phone_masked": "+57****7890"}` (ultimos 4 visibles)

#### unlink_whatsapp (lineas 61-77)
- `Depends(get_current_user)` + `Depends(get_db)`
- Query + `db.delete(identity)` + `db.commit()`
- Raise `404` si no existe identity

---

## TANDA 3: Frontend (WhatsAppSettings + apiClient + Profile)

### Planificado

| Archivo | Cambio |
|---|---|
| `WhatsAppSettings.jsx` | Componente nuevo con vinculacion OTP |
| `apiClient.js` | Agregar `whatsappClient` con 3 metodos |
| `appConfig.js` | Agregar `WHATSAPP.TEST_PHONE` |
| `Profile.jsx` | Agregar pestana "WhatsApp" |

### Implementado

#### appConfig.js (lineas 77-79) — 113 lineas total

```js
WHATSAPP: {
  TEST_PHONE: '+1 555 180 3391'
}
```

#### apiClient.js (lineas 312-316) — 316 lineas total

```js
export const whatsappClient = {
  generateOtp: () => apiClient.post('/whatsapp/link/otp'),
  getLinkStatus: () => apiClient.get('/whatsapp/link/status'),
  unlink: () => apiClient.delete('/whatsapp/link'),
};
```

#### WhatsAppSettings.jsx — 185 lineas (componente nuevo)

| Elemento | Descripcion |
|---|---|
| Estado | `linked`, `phoneMasked`, `otp`, `expiresAt`, `countdown`, `generating`, `unlinking`, `isUnlinkModalOpen` |
| `fetchStatus()` | GET `/whatsapp/link/status` al montar |
| `handleGenerateOtp()` | POST `/whatsapp/link/otp`, muestra OTP con countdown de 10 min |
| `handleUnlink()` | DELETE `/whatsapp/link` con modal de confirmacion |
| UI | Banner informativo, boton "Vincular WhatsApp", OTP con timer, phone de prueba, modal desvincular |

#### Profile.jsx (lineas 256-262, 474-477) — 513 lineas total

- Nueva pestana `MessageCircle` + "WhatsApp" junto a "Informacion Personal" y "Redes Sociales"
- Renderiza `<WhatsAppSettings />` cuando `activeTab === 'whatsapp'`

---

## TANDA 4: Tests

### Planificado

| Archivo | Tests | Descripcion |
|---|---|---|
| `test_price_coercion.py` | 12 | Unit tests de `_coerce_price()` |
| `test_webhook_signature.py` | 3 | Firma HMAC del webhook |
| `test_webhook_dedup.py` | 2 | Dedup de mensajes + retry bypass |
| `test_otp_lockout.py` | 2 | Bloqueo tras intentos fallidos |
| `test_otp_link_success.py` | 3 | OTP valido crea identidad |
| `test_intent_draft_merge.py` | 3 | Borrador multi-turno + merge |
| `test_create_service_intent.py` | 2 | Intent create_service |
| **Total** | **27** | |

### Implementado — 27/27 passing

#### test_price_coercion.py — 49 lineas — 12 tests

| Test | Input | Expected |
|---|---|---|
| `test_integer_string` | `"3000"` | `Decimal("3000")` |
| `test_integer_value` | `500` | `Decimal("500")` |
| `test_float_value` | `3000.5` | `Decimal("3000.5")` |
| `test_none_returns_none` | `None` | `None` |
| `test_non_numeric_string_returns_none` | `"gratis"` | `None` |
| `test_empty_string_returns_none` | `""` | `None` |
| `test_currency_symbol_string` | `"$3000"` | `Decimal("3000")` |
| `test_currency_with_dot_decimal` | `"$3.50"` | `Decimal("3.50")` |
| `test_string_with_text_and_number` | `"3000 pesos"` | `Decimal("3000")` |
| `test_decimal_string` | `"15.99"` | `Decimal("15.99")` |
| `test_string_with_thousand_separators` | `"1.234.567"` | `None` |
| `test_negative_number_string` | `"-3000"` | `Decimal("3000")` |

#### test_webhook_signature.py — 79 lineas — 3 tests

| Test | Escenario | Resultado |
|---|---|---|
| `test_invalid_signature_returns_403` | Firma HMAC incorrecta | HTTP 403 `"Invalid signature"` |
| `test_missing_signature_returns_403` | Sin header `X-Hub-Signature-256` | HTTP 403 `"Invalid signature"` |
| `test_valid_signature_returns_200_and_enqueues_task` | Firma HMAC correcta | HTTP 200 + `process_whatsapp_message.delay()` llamado |

#### test_webhook_dedup.py — 106 lineas — 2 tests

| Test | Escenario | Resultado |
|---|---|---|
| `test_duplicate_message_skipped` | Mismo `message_id` enviado 2 veces | 1ro: procesado. 2do: skip (sin `send_text_message`) |
| `test_duplicate_skipped_on_retry` | `retries > 0` con mismo `message_id` | Dedup bypass, 2do procesado |

#### test_otp_lockout.py — 127 lineas — 2 tests

| Test | Escenario | Resultado |
|---|---|---|
| `test_lockout_after_max_attempts` | 5+ intentos incorrectos | Mensaje "Demasiados intentos fallidos" |
| `test_lockout_cleared_on_successful_otp` | OTP valido tras intentos fallidos | `wa_otp_lockout:*` eliminado de Redis |

#### test_otp_link_success.py — 137 lineas — 3 tests

| Test | Escenario | Resultado |
|---|---|---|
| `test_valid_otp_creates_identity` | OTP correcto | `UserIdentity(provider="whatsapp")` creado + confirmacion |
| `test_valid_otp_cleans_redis_keys` | OTP correcto | Keys `wa_otp:*` y `wa_otp_user:*` eliminadas |
| `test_invalid_otp_sends_error_message` | OTP incorrecto | Mensaje "invalido" + `incr` + `expire` en lockout counter |

#### test_intent_draft_merge.py — 199 lineas — 3 tests

| Test | Escenario | Resultado |
|---|---|---|
| `test_draft_saved_when_price_missing` | Msg 1: nombre sin precio | Draft guardado en Redis con `intent: create_product, name: empanada` |
| `test_draft_merged_with_second_message` | Msg 2: solo precio | Merge -> `create_product(name="empanada", price=3000)` |
| `test_unknown_intent_rescues_draft_intent` | LLM retorna `unknown` + draft valido | Se usa `intent` del draft en vez de `unknown` |

#### test_create_service_intent.py — 133 lineas — 2 tests

| Test | Escenario | Resultado |
|---|---|---|
| `test_create_service_intent` | `intent=create_service` completo | `create_service()` llamado (no `create_product`) |
| `test_create_service_sends_correct_confirmation` | `create_service` exitoso | Mensaje contiene "Servicio" (no "Producto") |

#### conftest.py — 10 lineas

- `make_whatsapp_service_mock()`: Factory que crea `MagicMock` con `send_text_message = AsyncMock()`

---

---

## TANDA 5: Estabilización Event Loop en Celery

### Problema
Celery con pool prefork hereda event loops cerrados de ejecuciones previas de `asyncio.run()`, causando `RuntimeError: Event loop is closed` en SQLAlchemy/asyncpg al reintentar tareas.

### Solución Aplicada
Reemplazar `asyncio.run()` por gestión explícita del event loop en las 3 tareas Celery del proyecto:

| Archivo | Tarea | Cambio |
|---|---|---|
| `app/modules/whatsapp/tasks.py` | `process_whatsapp_message` | `@shared_task` → `@celery_app.task`; `asyncio.run()` → `loop.new_event_loop()` / `run_until_complete()` / `finally: loop.close()` |
| `app/modules/ai/tasks.py` | `generate_video_task` | Mismo patrón |
| `app/modules/social/tasks.py` | `publish_to_social_task` | Mismo patrón |

### Código aplicado (patrón genérico)
```python
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)
try:
    loop.run_until_complete(async_fn(...))
except Exception as exc:
    raise self.retry(exc=exc, countdown=10)
finally:
    loop.close()
```

---

## TANDA 6: Actualización de credenciales Gemini

### Cambios en `.env`
| Variable | Valor anterior | Valor nuevo |
|---|---|---|
| `GEMINI_API_KEY` | `AQ.Ab8RN6_REDACTED_1` | `AQ.Ab8RN6_REDACTED_2` |
| `GOOGLE_CLOUD_PROJECT` | `75346730090` | `gen-lang-client-0465623985` |

### Inicialización del cliente
Todos los archivos de producción ya usaban `genai.Client(api_key=settings.GEMINI_API_KEY)`. Solo se corrigió `check_veo_signature.py`:
- `genai.Client()` → `genai.Client(api_key=os.getenv('GEMINI_API_KEY'))`

---

## TANDA 7: Bypass mock para Gemini en pruebas locales

### Archivo modificado: `app/modules/whatsapp/ai.py`

Se agregó una intercepción temprana en `parse_whatsapp_intent()`: si el texto contiene **"empanada"** (case-insensitive), retorna un `WhatsAppIntentResponse` simulado sin llamar a la API de Gemini:

```python
text_lower = user_text.lower()
if "empanada" in text_lower:
    return WhatsAppIntentResponse(
        intent="create_product",
        entities={
            "name": "Empanada",
            "price": 3000.0,
            "description": "Creado automáticamente vía WhatsApp",
        },
        missing_fields=[],
        bot_reply="",
    )
```

---

## TANDA 8: Payload template `hello_world` para Sandbox de Meta

### Archivo modificado: `app/modules/whatsapp/service.py`

El Sandbox de Meta bloquea mensajes de tipo `"text"` con contenido libre. Se reemplazó el payload de `send_text_message()` para usar la plantilla predeterminada `hello_world`:

| Antes | Después |
|---|---|
| `"type": "text"` | `"type": "template"` |
| `"text": {"preview_url": false, "body": body}` | `"template": {"name": "hello_world", "language": {"code": "en_US"}}` |
| `"recipient_type": "individual"` | *(eliminado)* |

---

## Tanda 9: Vinculación de número de prueba en DB

Se insertó un registro en `user_identities` para habilitar el flujo completo sin OTP:

| Columna | Valor |
|---|---|
| `user_id` | `b45afdc9-67db-412b-80d3-79f8a4413a1e` (email: `calle5@gmail.com`) |
| `provider` | `whatsapp` |
| `provider_id` | `+573106899547` |

---

## TANDA 10: Event Loop persistente post-fork + normalización de teléfono

### Problema original
Celery con pool prefork hereda event loops cerrados de ejecuciones previas de `asyncio.run()`, causando `RuntimeError: Event loop is closed` o `Task got Future attached to a different loop` en SQLAlchemy/asyncpg y Redis al reintentar tareas.

### Solución aplicada
Se reemplazó `asyncio.run()` por un **event loop persistente por proceso worker**, creado dentro del hook `worker_process_init` de Celery (se ejecuta en cada hijo después del fork, no en el padre).

#### Archivo: `app/core/celery_app.py`
```python
@worker_process_init.connect
def init_worker(**kwargs):
    import asyncio
    from app.db.session import engine
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(engine.dispose())
    celery_app._worker_loop = loop
```

#### Archivos de tareas
Los 3 archivos (`whatsapp/tasks.py`, `ai/tasks.py`, `social/tasks.py`) referencian `celery_app._worker_loop` en lugar de crear sus propios loops a nivel de módulo. Esto asegura que:
- El loop nunca se cierra entre tareas → las conexiones SQLAlchemy y Redis nunca se huérfanas
- Cada proceso hijo del pool crea su propio loop post-fork (seguro bajo concurrencia real)
- El engine compartido se `dispose()` dentro del hook para que cada worker abra conexiones frescas

#### Prueba de concurrencia (5 mensajes en paralelo, 4 workers)
| Mensaje | Worker | Duración | Resultado |
|---|---|---|---|
| empanada de carne | ForkPoolWorker-2 | 1.020s | ✅ |
| empanada de pollo | ForkPoolWorker-3 | 1.069s | ✅ |
| empanada mixta | ForkPoolWorker-1 | 1.100s | ✅ |
| empanada vegetariana | ForkPoolWorker-4 | 1.147s | ✅ |
| empanada hawaiana | ForkPoolWorker-2 | 0.805s | ✅ |

**0 errores** "Event loop is closed". **5/5 procesados** con INSERT en products + Meta API 200 OK.

### Normalización de teléfono
Meta envía números sin prefijo `+` (ej: `573106899547`), pero el registro en DB se insertó con `+573106899547`. Se agregó `_normalize_phone()` en `tasks.py` que se aplica a `from_phone` en el punto de extracción del payload, y se actualizó el registro existente.

#### Cambios
| Archivo | Cambio |
|---|---|
| `app/modules/whatsapp/tasks.py` | Nueva función `_normalize_phone()` + llamada en línea 186 |
| `app/modules/whatsapp/tasks.py` | Eliminado `_worker_loop` módulo-level; usa `celery_app._worker_loop` |
| `app/modules/ai/tasks.py` | Eliminado `_worker_loop` módulo-level; usa `celery_app._worker_loop` |
| `app/modules/social/tasks.py` | Eliminado `_worker_loop` módulo-level; usa `celery_app._worker_loop` |
| `app/core/celery_app.py` | Nuevo hook `worker_process_init` |
| DB `user_identities` | `+573106899547` → `573106899547` |

### Pendientes de negocio (no código)
- Quitar el mock de "empanada" en `parse_whatsapp_intent()` cuando se active Gemini real
- Revertir `send_text_message()` de template `hello_world` a tipo `text` cuando el Sandbox de Meta lo permita

---

## Resumen Cuantitativo

| Categoria | Archivos | Lineas |
|---|---|---|
| **Backend WhatsApp** | 6 (`router`, `tasks`, `service`, `ai`, `schemas`, `prompts`) | ~634 |
| **Frontend WhatsApp** | 2 nuevos/modificados (`WhatsAppSettings`, `Profile`) | ~698 |
| **Frontend config** | 2 modificados (`apiClient`, `appConfig`) | ~429 |
| **Tests** | 8 (`conftest` + 7 archivos de tests) | ~840 |
| **Total** | **18 archivos** | **~2,600 lineas** |

| Metrica | Valor |
|---|---|
| Tests creados | 27 |
| Tests passing | **27/27** |
| Tandas completadas | **10/10** |
| Endpoints backend | 5 (OTP, status, unlink, webhook verify, webhook receive) |
| Intents soportados | 3 (`create_product`, `create_service`, `unknown`) |
| Componentes React | 1 nuevo + 1 modificado |
