# Guía de Pruebas — Módulo WhatsApp (DonApp)

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

## 1. Prerrequisitos

| Requisito | Versión / Detalle |
|---|---|
| **Python** | 3.11+ con `pip install -r requirements.txt` |
| **Redis** | 7+ (Docker: `redis:7-alpine`) |
| **PostgreSQL** | 15+ (Docker: `postgres:15-alpine`) |
| **Node.js** | 18+ |
| **pnpm** | Última versión estable |
| **ngrok** | Solo para E2E con Meta real |
| **Cuenta Meta Developer** | Con app configurada y WhatsApp Cloud API habilitada |

### 1.1 Variables de entorno (.env)

Archivo `Backend/.env` debe contener al menos:

```env
# --- Base de datos ---
DATABASE_URL=postgresql+asyncpg://servinow_user:servinow_secret_password@localhost:5432/servinow_db
POSTGRES_USER=servinow_user
POSTGRES_PASSWORD=servinow_secret_password
POSTGRES_DB=servinow_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# --- Redis ---
REDIS_URL=redis://localhost:6379/0

# --- Seguridad ---
SECRET_KEY=una-clave-segura-aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FIELD_ENCRYPTION_KEY=<generar con: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">

# --- Meta (WhatsApp Cloud API) ---
META_APP_SECRET=<app-secret-de-meta-developer>
WHATSAPP_ACCESS_TOKEN=<token-de-acceso-permanente>
WHATSAPP_PHONE_ID=<id-del-número-de-teléfono>
WHATSAPP_BUSINESS_ACCOUNT_ID=<id-de-la-cuenta-de-negocio>
WHATSAPP_VERIFY_TOKEN=donapp_whatsapp_secret_123

# --- Gemini (AI) ---
GEMINI_API_KEY=<api-key-de-google-ai-studio>

# --- CORS ---
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# --- Frontend ---
FRONTEND_URL=http://localhost:5173
```

---

## 2. Tests Automatizados (27 tests)

### 2.1 Ejecución básica

```bash
cd Backend
pytest tests/whatsapp/ -v
```

Salida esperada:

```
tests/whatsapp/test_price_coercion.py ............

tests/whatsapp/test_webhook_signature.py ...

tests/whatsapp/test_webhook_dedup.py ..

tests/whatsapp/test_otp_lockout.py ..

tests/whatsapp/test_otp_link_success.py ...

tests/whatsapp/test_intent_draft_merge.py ...

tests/whatsapp/test_create_service_intent.py ..

==================== 27 passed in 2.34s ====================
```

### 2.2 Tests con cobertura

```bash
pytest tests/whatsapp/ --cov=app.modules.whatsapp --cov-report=term-missing -v
```

### 2.3 Ejecutar un archivo específico

```bash
pytest tests/whatsapp/test_webhook_signature.py -v --tb=short
pytest tests/whatsapp/test_otp_link_success.py -v --tb=long
```

### 2.4 Tests individuales

```bash
pytest tests/whatsapp/test_price_coercion.py::TestCoercePrice::test_integer_string -v
pytest tests/whatsapp/test_webhook_dedup.py::test_duplicate_message_skipped -v
```

### 2.5 Descripción detallada de cada suite

#### test_price_coercion.py (12 tests)

`_coerce_price()` normaliza precios desde el LLM. Los tests verifican:

| Test | Input | Expected | Propósito |
|---|---|---|---|
| `test_integer_string` | `"3000"` | `Decimal("3000")` | String numérico simple |
| `test_integer_value` | `500` | `Decimal("500")` | Entero directo |
| `test_float_value` | `3000.5` | `Decimal("3000.5")` | Flotante |
| `test_none_returns_none` | `None` | `None` | Nulo |
| `test_non_numeric_string_returns_none` | `"gratis"` | `None` | Texto sin número |
| `test_empty_string_returns_none` | `""` | `None` | Vacío |
| `test_currency_symbol_string` | `"$3000"` | `Decimal("3000")` | Símbolo monetario |
| `test_currency_with_dot_decimal` | `"$3.50"` | `Decimal("3.50")` | Decimal con símbolo |
| `test_string_with_text_and_number` | `"3000 pesos"` | `Decimal("3000")` | Número + texto |
| `test_decimal_string` | `"15.99"` | `Decimal("15.99")` | Decimal string |
| `test_string_with_thousand_separators` | `"1.234.567"` | `None` | Múltiples puntos = inválido |
| `test_negative_number_string` | `"-3000"` | `Decimal("3000")` | Negativo se vuelve positivo |

#### test_webhook_signature.py (3 tests)

Verifica la validación de firma HMAC-SHA256 contra `META_APP_SECRET`.

| Test | Escenario | Resultado |
|---|---|---|
| `test_invalid_signature_returns_403` | Enviar firma incorrecta | HTTP 403 + `{"detail": "Invalid signature"}` |
| `test_missing_signature_returns_403` | Enviar sin header `X-Hub-Signature-256` | HTTP 403 |
| `test_valid_signature_returns_200_and_enqueues_task` | Firma HMAC correcta | HTTP 200 + `process_whatsapp_message.delay()` invocado |

#### test_webhook_dedup.py (2 tests)

Verifica deduplicación de mensajes vía Redis `SETNX`.

| Test | Escenario | Resultado |
|---|---|---|
| `test_duplicate_message_skipped` | Mismo `message_id` enviado 2 veces | 1ro: procesado. 2do: `send_text_message` NO llamado |
| `test_duplicate_skipped_on_retry` | `retries > 0` con mismo `message_id` | Dedup bypass, 2do procesado (Celery retry) |

#### test_otp_lockout.py (2 tests)

Verifica bloqueo por intentos fallidos de OTP.

| Test | Escenario | Resultado |
|---|---|---|
| `test_lockout_after_max_attempts` | 5+ intentos incorrectos | Mensaje "Demasiados intentos fallidos" |
| `test_lockout_cleared_on_successful_otp` | OTP válido tras intentos previos | Key `wa_otp_lockout:*` eliminada de Redis |

#### test_otp_link_success.py (3 tests)

Verifica el flujo exitoso/falido de vinculación OTP.

| Test | Escenario | Resultado |
|---|---|---|
| `test_valid_otp_creates_identity` | OTP de 6 dígitos correcto | Se crea `UserIdentity(provider="whatsapp")` + confirmación |
| `test_valid_otp_cleans_redis_keys` | OTP correcto | Keys `wa_otp:*` y `wa_otp_user:*` eliminadas |
| `test_invalid_otp_sends_error_message` | OTP incorrecto | Mensaje "inválido" + contador de intentos incrementado |

#### test_intent_draft_merge.py (3 tests)

Verifica el borrador multi-turno (draft en Redis).

| Test | Escenario | Resultado |
|---|---|---|
| `test_draft_saved_when_price_missing` | Msg 1: nombre sin precio | Draft guardado: `intent: create_product, entities: {name: "empanada"}` |
| `test_draft_merged_with_second_message` | Msg 2: solo precio | Merge → `create_product(name="empanada", price=3000)` ejecutado |
| `test_unknown_intent_rescues_draft_intent` | LLM retorna `unknown` + draft válido | Usa intent del draft en vez de `unknown` |

#### test_create_service_intent.py (2 tests)

Verifica que el handler de servicio sea diferente al de producto.

| Test | Escenario | Resultado |
|---|---|---|
| `test_create_service_intent` | `intent=create_service` completo | `create_service()` llamado (no `create_product`) |
| `test_create_service_sends_correct_confirmation` | create_service exitoso | Mensaje contiene "Servicio" (no "Producto") |

---

## 3. Pruebas Manuales del Backend (API REST)

### 3.1 Levantar servicios

```bash
# Terminal 1: Redis
docker run --rm -p 6379:6379 redis:7-alpine

# Terminal 2: PostgreSQL (opcional si solo pruebas endpoints sin BD real)
docker run --rm -p 5432:5432 \
  -e POSTGRES_USER=servinow_user \
  -e POSTGRES_PASSWORD=servinow_secret_password \
  -e POSTGRES_DB=servinow_db \
  postgres:15-alpine

# Terminal 3: FastAPI
cd Backend
source .venv/bin/activate  # o tu entorno virtual
uvicorn app.main:app --reload --port 8000
```

Verificar que el servidor inició:

```bash
curl -s http://localhost:8000/api/v1/health | python -m json.tool
```

### 3.2 Webhook — Verificación GET (Meta Handshake)

#### Token válido

```bash
curl -s "http://localhost:8000/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.challenge=987654321&hub.verify_token=donapp_whatsapp_secret_123"
```

Respuesta esperada:
```
987654321
```

Código de estado: **200**

#### Token inválido

```bash
curl -s -w "\nHTTP_CODE: %{http_code}\n" "http://localhost:8000/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.challenge=12345&hub.verify_token=wrong_token"
```

Respuesta esperada:
```json
{"detail": "Verification failed"}
```

Código de estado: **403**

### 3.3 Webhook — Recepción de mensajes POST

#### Firma inválida

```bash
curl -s -w "\nHTTP_CODE: %{http_code}\n" -X POST "http://localhost:8000/api/v1/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=invalida" \
  -d '{"entry":[]}'
```

Respuesta esperada:
```json
{"detail": "Invalid signature"}
```

HTTP **403**

#### Sin header de firma

```bash
curl -s -w "\nHTTP_CODE: %{http_code}\n" -X POST "http://localhost:8000/api/v1/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d '{"entry":[]}'
```

HTTP **403**

#### Firma válida (payload de mensaje de texto)

Usa este script para generar la firma HMAC correcta:

```bash
python3 << 'EOF'
import hmac, hashlib, json

SECRET = "eb418859481aa17346d876c31b7370e7"  # META_APP_SECRET del .env

payload = {
    "object": "whatsapp_business_account",
    "entry": [{
        "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
        "changes": [{
            "value": {
                "messaging_product": "whatsapp",
                "metadata": {
                    "display_phone_number": "+15551803391",
                    "phone_number_id": "1279745251878274"
                },
                "contacts": [{
                    "profile": {"name": "Test User"},
                    "wa_id": "+573001234567"
                }],
                "messages": [{
                    "from": "+573001234567",
                    "id": "wamid.test123",
                    "timestamp": "1700000000",
                    "text": {"body": "Crear producto empanada por 3000"},
                    "type": "text"
                }]
            },
            "field": "messages"
        }]
    }]
}

body = json.dumps(payload)
sig = "sha256=" + hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()

print(f"Firma: {sig}")
print()
print(f"curl -X POST 'http://localhost:8000/api/v1/whatsapp/webhook' \\")
print(f"  -H 'Content-Type: application/json' \\")
print(f"  -H 'X-Hub-Signature-256: {sig}' \\")
print(f"  -d '{body}'")
EOF
```

Ejecuta el comando `curl` generado. Respuesta esperada:

```
OK
```

HTTP **200** (el mensaje se encola en Celery para procesamiento asíncrono)

#### Payload de OTP (código de 6 dígitos)

```bash
python3 << 'EOF'
import hmac, hashlib, json

SECRET = "eb418859481aa17346d876c31b7370e7"

payload = {
    "object": "whatsapp_business_account",
    "entry": [{
        "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
        "changes": [{
            "value": {
                "messaging_product": "whatsapp",
                "metadata": {
                    "display_phone_number": "+15551803391",
                    "phone_number_id": "1279745251878274"
                },
                "contacts": [{
                    "profile": {"name": "Test User"},
                    "wa_id": "+573001234567"
                }],
                "messages": [{
                    "from": "+573001234567",
                    "id": "wamid.otp_test",
                    "timestamp": "1700000000",
                    "text": {"body": "654321"},
                    "type": "text"
                }]
            },
            "field": "messages"
        }]
    }]
}

body = json.dumps(payload)
sig = "sha256=" + hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()

print(f"curl -X POST 'http://localhost:8000/api/v1/whatsapp/webhook' \\")
print(f"  -H 'Content-Type: application/json' \\")
print(f"  -H 'X-Hub-Signature-256: {sig}' \\")
print(f"  -d '{body}'")
EOF
```

---

### 3.4 Flujo OTP (Vinculación)

Este flujo requiere autenticación. Primero obtén un token JWT.

#### Obtener token de prueba

```bash
# Crea un usuario si no existe (o usa el sistema de auth existente)
# Método rápido: generar token directo con Python
python3 -c "
from app.core.security_tokens import create_access_token
token = create_access_token({'sub': 'user-uuid-de-prueba'})
print(f'TOKEN={token}')
"
```

O mejor, usa los endpoints de auth:

```bash
# Registro
curl -s -X POST 'http://localhost:8000/api/v1/auth/register' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"Test1234!","name":"Test User"}' | python -m json.tool

# Login
TOKEN=$(curl -s -X POST 'http://localhost:8000/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"Test1234!"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "TOKEN=$TOKEN"
```

#### 3.4.1 Generar OTP

```bash
curl -s -X POST 'http://localhost:8000/api/v1/whatsapp/link/otp' \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```

Respuesta esperada:
```json
{
    "otp": "837291",
    "expires_in_seconds": 600
}
```

**Nota:** El OTP se muestra en la respuesta porque es un entorno de desarrollo. En producción se enviaría por otro canal.

El OTP queda almacenado en Redis con TTL de 10 minutos:
```
wa_otp:837291 → "user-uuid-xxx"
wa_otp_user:user-uuid-xxx → "837291"
```

#### 3.4.2 Verificar OTP (simular desde WhatsApp)

Hay que enviar el OTP como mensaje de texto desde WhatsApp. Para simularlo sin Meta real, envía un POST directo al webhook (con el OTP como body del mensaje).

Usa el script de la sección 3.3 con el payload modificado:
- `messages[0].text.body = "837291"` (el código OTP)
- `messages[0].from = "+573001234567"` (número que se vinculará)
- `messages[0].id = "wamid.otp_verify"`

Si el OTP es correcto:
- Se crea un `UserIdentity(provider="whatsapp", provider_id="+573001234567", user_id="user-uuid-xxx")`
- Se limpian las keys de Redis
- Se envía mensaje de confirmación: "✅ ¡Tu número ha sido vinculado exitosamente..."

Si el OTP es incorrecto:
- Se incrementa el contador `wa_otp_lockout:+573001234567`
- Se envía mensaje: "❌ El código que enviaste es inválido..."
- Después de 5 intentos fallidos: "🔒 Demasiados intentos fallidos..."

#### 3.4.3 Consultar estado de vinculación

```bash
curl -s 'http://localhost:8000/api/v1/whatsapp/link/status' \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```

Antes de vincular:
```json
{
    "linked": false
}
```

Después de vincular:
```json
{
    "linked": true,
    "phone_masked": "****4567"
}
```

#### 3.4.4 Desvincular WhatsApp

```bash
curl -s -X DELETE 'http://localhost:8000/api/v1/whatsapp/link' \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```

Respuesta esperada:
```json
{
    "detail": "Número desvinculado correctamente"
}
```

Si se intenta desvincular sin tener vinculación:
```json
{
    "detail": "No hay número vinculado"
}
```

HTTP **404**

#### 3.4.5 Prueba de expiración de OTP

1. Generar OTP
2. Esperar 10 minutos (o usar `redis-cli TTL wa_otp:837291`)
3. Enviar el OTP expirado → debe responder "inválido o ha expirado"

```bash
# Ver TTL del OTP
redis-cli TTL "wa_otp:837291"

# Forzar expiración (para pruebas)
redis-cli EXPIRE "wa_otp:837291" 0
```

#### 3.4.6 Prueba de lockout

1. Generar OTP
2. Enviar 5 OTPs incorrectos consecutivos (el contador `wa_otp_lockout:+573001234567` se incrementa)
3. El 6to intento debe responder "Demasiados intentos fallidos"

```bash
# Ver contador de lockout
redis-cli GET "wa_otp_lockout:+573001234567"
```

---

### 3.5 Flujo de creación de producto/servicio

Requiere: número vinculado (sección 3.4.2 completada).

#### 3.5.1 Crear producto (mensaje completo en un solo turno)

Payload del mensaje: `"Crear producto empanada por 3000"`

Flujo esperado:
1. Webhook recibe payload → valida firma → encola Celery task
2. Task detecta número vinculado → busca `UserIdentity` → obtiene `user`
3. LLM parsea: `intent=create_product`, `entities={name: "empanada", price: 3000}`
4. No hay draft previo, no falta nombre ni precio → ejecuta handler
5. `_handle_create_product()` llama a `create_product()` en BD
6. Mensaje de confirmación enviado: "✅ Producto 'empanada' creado con éxito por $3000!"

#### 3.5.2 Crear producto (multiturno — nombre primero)

**Turno 1:** Enviar `"Crear producto empanada"`

Flujo:
1. LLM parsea: `intent=create_product`, `entities={name: "empanada"}` (price es `None`)
2. Falta "price" en entities → guarda draft en Redis
3. Mensaje del bot: "¿Cuál es el precio del producto 'empanada'?" (respuesta del LLM)

Draft en Redis:
```
wa_draft:+573001234567 → {"intent": "create_product", "entities": {"name": "empanada"}}
```

**Turno 2:** Enviar `"3000"`

Flujo:
1. LLM parsea: puede retornar `intent=unknown` o similar
2. `async_process_message` detecta draft existente → merge entities: `{name: "empanada", price: 3000}`
3. Ya no faltan campos → ejecuta `_handle_create_product()`
4. Draft eliminado de Redis
5. Confirmación enviada

#### 3.5.3 Crear servicio

Mismo flujo que producto pero con mensaje `"Crear servicio corte de cabello por 15000"`.

Verificar que:
- La confirmación dice "Servicio" (no "Producto")
- Se llama a `create_service()` en vez de `create_product()`

#### 3.5.4 Mensaje desconocido

Enviar mensaje que no sea un intent reconocido: `"Hola, quiero información"`

Respuesta esperada:
```
"Lo siento, aún no entiendo cómo hacer eso. Intenta decir:
'Crear producto empanada por 3000 pesos' o 'Crear servicio corte de cabello por 15000 pesos'."
```

#### 3.5.5 Número no vinculado

Enviar mensaje desde un número que **no** tiene `UserIdentity`:

Respuesta esperada:
```
"Hola! Tu número no está vinculado a una cuenta de DonApp.
Ve a tu perfil en la web y añade tu número para empezar a crear
productos desde aquí. Si ya tienes un código, escríbelo aquí (6 dígitos)."
```

Si el mensaje son exactamente 6 dígitos → se trata como intento de OTP.

---

### 3.6 Pruebas de Redis directas

```bash
# Conectar a Redis
redis-cli -p 6379

# Listar todas las keys de WhatsApp
KEYS "wa_*"

# Ver un draft específico
GET "wa_draft:+573001234567"

# Ver un OTP
GET "wa_otp:837291"

# Ver contador de lockout
GET "wa_otp_lockout:+573001234567"

# Verificar dedup
GET "wa_msg_seen:wamid.test123"

# Limpiar todo (para reset entre pruebas)
DEL "wa_draft:+573001234567" "wa_otp:837291" "wa_otp_user:user-uuid-xxx" "wa_otp_lockout:+573001234567"
```

---

## 4. Pruebas del Frontend (Manuales)

### 4.1 Levantar frontend

```bash
cd Frontend
pnpm install   # si no está instalado
pnpm dev       # → http://localhost:5173
```

Asegúrate de que el backend esté corriendo en `http://localhost:8000`.

### 4.2 Verificar configuración

Revisar `Frontend/src/config/appConfig.js` línea 77-79:

```javascript
WHATSAPP: {
    TEST_PHONE: '+1 555 180 3391'
}
```

Este es el número de prueba que se muestra en la UI para que el usuario sepa a qué número de WhatsApp enviar el OTP.

### 4.3 Verificar apiClient

Revisar `Frontend/src/utils/apiClient.js` línea 312-316:

```javascript
export const whatsappClient = {
    generateOtp: () => apiClient.post('/whatsapp/link/otp'),
    getLinkStatus: () => apiClient.get('/whatsapp/link/status'),
    unlink: () => apiClient.delete('/whatsapp/link'),
};
```

### 4.4 Verificar integración en Profile

Revisar `Frontend/src/modules/Profile/Profile.jsx`:
- Líneas ~256-262: Definición de pestaña "WhatsApp"
- Líneas ~474-477: Render condicional de `<WhatsAppSettings />`

### 4.5 Prueba visual del componente WhatsAppSettings

```bash
# Ruta completa
Frontend/src/modules/Profile/WhatsAppSettings.jsx  # 185 líneas
```

#### Estados del componente:

| Estado | Condición | Elementos visibles |
|---|---|---|
| **Loading** | `loading=true` | Spinner + "Cargando estado..." |
| **No vinculado** | `linked=false, otp=""` | Banner informativo + Botón "Vincular WhatsApp" |
| **OTP generado** | `linked=false, otp!=""` | Código OTP en grande + countdown + número de prueba |
| **Vinculado** | `linked=true` | Check verde + "Vinculado: ****7890" + Botón "Desvincular" |
| **Desvinculando** | `isUnlinkModalOpen=true` | Modal de confirmación |
| **Error** | Error en fetch/generar/unlink | Toast de error |

#### Pasos de prueba manual:

1. **Iniciar sesión** en el frontend con un usuario registrado
2. **Navegar a Perfil** → Deben aparecer las pestañas: "Información Personal", "Redes Sociales", "WhatsApp"
3. **Ir a pestaña WhatsApp** → Debe mostrar:
   - Icono de WhatsApp verde
   - Título "WhatsApp Business"
   - Banner informativo
   - Botón "Vincular WhatsApp"
4. **Hacer clic en "Vincular WhatsApp"** → Debe:
   - Mostrar loading en el botón
   - Mostrar OTP de 6 dígitos en fuente grande
   - Mostrar countdown regresivo
   - Mostrar "Envía este código por WhatsApp al +1 555 180 3391"
   - Mostrar toast de éxito
5. **Esperar expiración** → Cuando el countdown llega a 0, el OTP desaparece
6. **Vincular realmente** (si hay Meta configurado) → Enviar OTP por WhatsApp → Recargar página → Debe mostrar estado vinculado
7. **Desvincular** → Clic en "Desvincular" → Modal aparece → "Sí, desvincular" → Toast de éxito → Estado vuelve a no vinculado

---

## 5. Prueba End-to-End con Meta WhatsApp Cloud API

### 5.1 Requisitos de Meta

| Requisito | Dónde obtenerlo |
|---|---|
| Cuenta de negocio en Meta | https://business.facebook.com |
| Aplicación en Meta Developer | https://developers.facebook.com |
| WhatsApp Cloud API habilitada | En la app → Products → WhatsApp |
| Número de teléfono de negocio | Configurado en WhatsApp Cloud API |
| Token de acceso permanente | En la sección "API Setup" del dashboard de WhatsApp |
| Webhook configurado | En la app → Webhook → Configurar |

### 5.2 Configurar Webhook en Meta Developer

1. Ir a [Meta for Developers](https://developers.facebook.com)
2. Seleccionar tu aplicación
3. Ir a **Products → WhatsApp → Configuration**
4. En la sección **Webhook**, hacer clic en **Configure**

#### Callback URL

Para desarrollo local, necesitas exponer tu servidor con ngrok:

```bash
# Terminal: exponer backend
ngrok http 8000 --domain=tu-subdominio.ngrok-free.dev
# → https://tu-subdominio.ngrok-free.dev
```

La Callback URL será:
```
https://tu-subdominio.ngrok-free.dev/api/v1/whatsapp/webhook
```

#### Verify Token

Debe coincidir con `WHATSAPP_VERIFY_TOKEN` en tu `.env`:

```
donapp_whatsapp_secret_123
```

#### Proceso de verificación:

1. Meta envía un GET a tu callback URL con `hub.mode=subscribe`, `hub.challenge=XXXX`, `hub.verify_token=donapp_whatsapp_secret_123`
2. Tu endpoint `verify_webhook()` en `router.py` valida el token y responde con el challenge
3. Si la respuesta es correcta, Meta muestra "Verified" en el dashboard

#### Suscribirse a eventos:

En la misma página, en **Webhook Fields**, suscríbete a:
- `messages` — recibir mensajes entrantes
- `message_deliveries` — confirmaciones de entrega (opcional)

### 5.3 Obtener token de acceso permanente

1. En [Meta for Developers](https://developers.facebook.com), selecciona tu aplicación
2. Ve a **WhatsApp → API Setup**
3. En la sección **Temporary Access Token**, genera un token
4. Copia el **Token** y la **Phone Number ID**
5. Para obtener un token permanente, ve al **Access Token Tool** y extiende el token

Guarda en `.env`:
```env
WHATSAPP_ACCESS_TOKEN=EAA...
WHATSAPP_PHONE_ID=1279745251878274
WHATSAPP_BUSINESS_ACCOUNT_ID=1540734430762556
WHATSAPP_VERIFY_TOKEN=donapp_whatsapp_secret_123
META_APP_SECRET=eb418859481aa17346d876c31b7370e7
```

### 5.4 META_APP_SECRET

El `META_APP_SECRET` se obtiene de:
1. **Meta for Developers** → Tu App → **Settings → Basic**
2. Sección **App Secret** → hacer clic en **Show**
3. Ese valor se usa para validar las firmas HMAC-SHA256 de los webhooks

### 5.5 Flujo E2E completo

#### Paso 1: Verificar conectividad

```bash
# Verificar que el servidor responde
curl -s http://localhost:8000/api/v1/health

# Verificar que ngrok funciona
curl -s https://tu-subdominio.ngrok-free.dev/api/v1/health
```

#### Paso 2: Probar GET webhook manual

```bash
curl -s "https://tu-subdominio.ngrok-free.dev/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.challenge=123456&hub.verify_token=donapp_whatsapp_secret_123"
# → 123456
```

Si esto funciona, Meta podrá verificarlo.

#### Paso 3: Configurar en Meta Dashboard

1. Callback URL: `https://tu-subdominio.ngrok-free.dev/api/v1/whatsapp/webhook`
2. Verify Token: `donapp_whatsapp_secret_123`
3. Hacer clic en **Verify and Save**
4. Debe mostrar **Verified** en verde

#### Paso 4: Suscribir campos

- Marcar `messages` y `message_deliveries`
- Hacer clic en **Subscribe**

#### Paso 5: Enviar mensaje de prueba desde WhatsApp real

1. Desde tu celular, envía un mensaje al número de negocio configurado
2. El mensaje debe ser algo como: `"Hola"` (para probar que el webhook recibe)
3. En los logs del backend deberías ver:
   ```
   Received text from +573001234567: Hola
   ```

#### Paso 6: Probar vinculación (flujo completo)

1. **Frontend:** Iniciar sesión → Perfil → WhatsApp → "Vincular WhatsApp"
2. Se genera OTP → lo ves en pantalla: `837291`
3. **Celular:** Enviar el código `837291` al número de negocio
4. Meta envía webhook → backend procesa OTP → vincula el número
5. **Frontend:** Recargar Perfil → WhatsApp → Debe mostrar "Vinculado: ****4567"
6. **Celular:** Deberías recibir mensaje de confirmación

#### Paso 7: Probar creación de producto

1. **Celular:** Enviar `"Crear producto empanada por 3000"`
2. Meta envía webhook → backend procesa → LLM parsea intent → crea producto
3. **Celular:** Deberías recibir confirmación
4. **Frontend:** Ir a Productos → Debe aparecer "empanada" por $3000

#### Paso 8: Probar creación de producto multiturno

1. **Celular:** Enviar `"Crear producto pizza"`
2. Bot responde preguntando el precio
3. **Celular:** Enviar `"25000"`
4. Bot confirma creación de "pizza" por $25000

#### Paso 9: Probar servicio

1. **Celular:** Enviar `"Crear servicio corte de cabello por 15000"`
2. Confirmación debe decir "Servicio" y aparecer en Productos → Servicios

#### Paso 10: Probar desvinculación

1. **Frontend:** Perfil → WhatsApp → "Desvincular" → Confirmar
2. **Celular:** Enviar `"Crear producto prueba por 1000"`
3. Respuesta debe ser: "Tu número no está vinculado..."

### 5.6 Verificar logs en tiempo real

```bash
# Logs del backend
docker compose logs -f web

# Logs del worker de Celery
docker compose logs -f worker

# Logs detallados de FastAPI (desarrollo)
uvicorn app.main:app --reload --port 8000 --log-level debug

# Monitoreo de Celery con Flower
# http://localhost:5555 (si ejecutas Flower)
```

### 5.7 Monitoreo con Flower

```bash
# Iniciar Flower
celery -A app.core.celery_app.celery_app flower --port=5555

# Abrir en navegador
# http://localhost:5555
```

Flower muestra:
- Tasks en cola, en ejecución, completadas, fallidas
- Tiempo de ejecución de cada task
- Argumentos de cada task
- Opción de revocar/retry tasks

### 5.8 Troubleshooting común

| Problema | Causa probable | Solución |
|---|---|---|
| Meta muestra "Verification failed" | `WHATSAPP_VERIFY_TOKEN` no coincide o ngrok caído | Verificar token y que ngrok esté corriendo |
| Webhook responde 403 | `META_APP_SECRET` incorrecto | Copiar App Secret exacto de Meta Developer |
| El mensaje no se procesa | Celery worker no corriendo | `docker compose up -d worker` o `celery -A app.core.celery_app.celery_app worker --loglevel=info` |
| No se crea producto/servicio | Gemini API key faltante o incorrecta | Verificar `GEMINI_API_KEY` en `.env` |
| OTP no funciona | Redis no accesible | Verificar `REDIS_URL` y que Redis esté corriendo |
| Frontend muestra error de red | Backend no accesible desde frontend | Verificar CORS y que `FRONTEND_URL` coincida |
| "Demasiados intentos" sin haber intentado | Lockout key residual | `redis-cli DEL "wa_otp_lockout:+573001234567"` |

---

## 6. Pruebas de Redis (Monitoreo Manual)

```bash
# Iniciar Redis CLI
redis-cli -p 6379

# Ver todas las keys activas del módulo WhatsApp
KEYS "wa_*"

# Ver tipo de cada key
TYPE "wa_draft:+573001234567"
TYPE "wa_otp:837291"
TYPE "wa_otp_lockout:+573001234567"
TYPE "wa_msg_seen:wamid.test123"

# Ver TTL restante
TTL "wa_draft:+573001234567"
TTL "wa_otp:837291"

# Ver contenido
GET "wa_draft:+573001234567"
GET "wa_otp:837291"
GET "wa_otp_user:user-uuid-xxx"
GET "wa_otp_lockout:+573001234567"
GET "wa_msg_seen:wamid.test123"

# Monitorear en tiempo real (nuevas keys)
MONITOR
```

### 6.1 Escenarios de prueba con Redis

#### Verificar dedup:

```bash
# Enviar mismo message_id dos veces seguidas
# 1ra vez:
redis-cli GET "wa_msg_seen:wamid.test123"  # → nil (no existe)
# La task crea: SET wa_msg_seen:wamid.test123 1 EX 3600 NX

# 2da vez (con mismo message_id):
redis-cli GET "wa_msg_seen:wamid.test123"  # → "1" (existe)
# La task ve que SETNX retorna None → salta el mensaje
```

#### Verificar draft:

```bash
# Después de enviar "Crear producto empanada" (sin precio)
redis-cli GET "wa_draft:+573001234567"
# → {"intent": "create_product", "entities": {"name": "empanada"}}

# Después de enviar "3000" (segundo turno)
redis-cli GET "wa_draft:+573001234567"
# → nil (draft eliminado tras procesar)
```

#### Verificar lockout:

```bash
# Después de 5 OTPs incorrectos
redis-cli GET "wa_otp_lockout:+573001234567"
# → "5"
redis-cli TTL "wa_otp_lockout:+573001234567"
# → 580 (aprox 10 minutos restantes)
```

#### Limpiar estado entre pruebas:

```bash
# Eliminar todas las keys de WhatsApp
redis-cli --scan --pattern "wa_*" | xargs redis-cli DEL
```

---

## 7. Resumen de comandos

```bash
# === LEVANTAR ENTORNO ===

# Redis standalone
docker run --rm -p 6379:6379 redis:7-alpine

# PostgreSQL standalone
docker run --rm -p 5432:5432 \
  -e POSTGRES_USER=servinow_user \
  -e POSTGRES_PASSWORD=servinow_secret_password \
  -e POSTGRES_DB=servinow_db \
  postgres:15-alpine

# FastAPI (desarrollo)
cd Backend && uvicorn app.main:app --reload --port 8000

# Frontend (desarrollo)
cd Frontend && pnpm dev

# Celery worker (para procesamiento async)
cd Backend && celery -A app.core.celery_app.celery_app worker --loglevel=info

# ngrok (exponer webhook)
ngrok http 8000 --domain=tu-subdominio.ngrok-free.dev

# Toda la infraestructura con Docker Compose
docker compose up -d

# === TESTS ===

# Todos los tests de WhatsApp (27)
pytest tests/whatsapp/ -v

# Con cobertura
pytest tests/whatsapp/ --cov=app.modules.whatsapp --cov-report=term-missing -v

# Un archivo específico
pytest tests/whatsapp/test_webhook_signature.py -v --tb=short

# Un test específico
pytest tests/whatsapp/test_webhook_dedup.py::test_duplicate_message_skipped -v

# === MONITOREO ===

# Logs del backend
docker compose logs -f web

# Logs del worker
docker compose logs -f worker

# Flower (UI de Celery)
celery -A app.core.celery_app.celery_app flower --port=5555
# → http://localhost:5555

# Redis CLI
redis-cli -p 6379

# === UTILIDADES ===

# Limpiar Redis
redis-cli --scan --pattern "wa_*" | xargs redis-cli DEL

# Verificar health
curl -s http://localhost:8000/api/v1/health | python -m json.tool

# Generar FIELD_ENCRYPTION_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## 8. Mapa de cobertura de pruebas

| Funcionalidad | Cobertura tests | Prueba manual |
|---|---|---|
| `_coerce_price()` | 12 unit tests | — |
| Firma HMAC-SHA256 | 3 tests | curl POST |
| Dedup de mensajes | 2 tests | curl + Redis |
| OTP lockout | 2 tests | curl + Redis |
| OTP link exitoso | 3 tests | curl + Redis + BD |
| Draft + merge multiturno | 3 tests | curl + Redis |
| Intent create_service | 2 tests | curl + BD |
| GET /webhook (handshake) | — | curl |
| POST /link/otp | — | curl + Token |
| GET /link/status | — | curl + Token |
| DELETE /link | — | curl + Token |
| WhatsAppSettings UI | — | Manual (Frontend) |
| Profile integración | — | Manual (Frontend) |
| E2E con Meta real | — | Flujo Completo |
