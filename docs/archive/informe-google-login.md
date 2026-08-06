# Informe: Funcionalidad "Iniciar sesión con Google"

**Fecha:** 2026-07-25
**Proyecto:** DonApp
**Estado general:** Código completo, no funcional en el entorno actual (falta configuración)

---

## 1. Resumen Ejecutivo

La funcionalidad de login con Google está **implementada en código** con una arquitectura segura (OAuth2 Authorization Code + PKCE + JWKS). Sin embargo, **no es funcional** porque las variables de entorno necesarias (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`) no están configuradas en el archivo `.env` del backend.

---

## 2. Estado de la Implementación

| Capa | Estado | Observación |
|------|--------|-------------|
| Backend OAuth endpoints | COMPLETO | 3 endpoints: authorize, callback, exchange |
| Seguridad (PKCE, JWKS, nonce) | COMPLETO | Nivel alto de protección |
| Base de datos (user_identities) | COMPLETO | Migración Alembic aplicada |
| Frontend (botones, callback, routing) | COMPLETO | Login, Register y ruta /auth/callback |
| Tests | COMPLETO | 3 tests unitarios |
| Configuración de entorno | INCOMPLETO | Variables de Google OAuth ausentes en .env |
| Funcionamiento en dev | NO DISPONIBLE | Lanza BadRequestException por config faltante |

---

## 3. Arquitectura del Flujo

```
┌─────────────────┐
│  Login/Register  │
│   (Frontend)     │
└────────┬────────┘
         │ <a href="/auth/google/authorize?role=client">
         ▼
┌─────────────────────────────────┐
│  GET /auth/google/authorize      │
│  - Genera PKCE (verifier+challenge) │
│  - Almacena en Redis (10min TTL)    │
│  - Redirige a Google               │
└────────┬────────────────────────┘
         ▼
┌─────────────────┐
│  Google OAuth    │  (Pantalla de consentimiento)
│  (Externo)       │
└────────┬────────┘
         │ Redirect → /auth/google/callback
         ▼
┌─────────────────────────────────┐
│  GET /auth/google/callback        │
│  - Valida state firmado           │
│  - Intercambia code por tokens    │
│  - Valida id_token (JWKS RS256)  │
│  - Valida nonce y email_verified  │
│  - Upsert User + UserIdentity     │
│  - Genera exchange code (60s)     │
│  - Redirige a /auth/callback      │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Frontend: GoogleCallback.jsx     │
│  - Lee code de URL params         │
│  - POST /auth/google/exchange     │
│  - Obtiene JWT de la app          │
│  - Login en Zustand store         │
│  - Redirige a /dashboard          │
└─────────────────────────────────┘
```

---

## 4. Archivos Involucrados

### Backend

| Archivo | Líneas relevantes | Función |
|---------|-------------------|---------|
| `Backend/app/modules/auth/google.py` | 1-296 (completo) | Core del flujo OAuth: authorize, callback, exchange |
| `Backend/app/modules/auth/router.py` | 18, 21 | Monta `google_router` en auth router |
| `Backend/app/modules/auth/models.py` | 48, 132-143 | `User.hashed_password` nullable; modelo `UserIdentity` |
| `Backend/app/modules/auth/schemas.py` | 114-119 | Schema `TokenResponse` usado en exchange |
| `Backend/app/modules/auth/deps.py` | 17 | `OAuth2PasswordBearer` para extracción de JWT |
| `Backend/app/modules/auth/crud.py` | 21-34, 44-68 | `get_user_by_email`, `create_user` (usados por Google flow) |
| `Backend/app/core/config.py` | 128-130 | Settings: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| `Backend/app/core/security.py` | 28-68 | `create_access_token`, `decode_access_token` (JWT post-exchange) |
| `Backend/app/main.py` | 19, 106-110 | Monta auth router en `/api/v1/auth` |
| `Backend/alembic/versions/cead60bc2af0_google_auth.py` | 1-51 | Migración: tabla `user_identities`, `hashed_password` nullable |
| `Backend/tests/test_auth_google.py` | 1-176 | 3 tests: null-password, unique constraint, role non-escalation |

### Frontend

| Archivo | Líneas relevantes | Función |
|---------|-------------------|---------|
| `Frontend/src/modules/Auth/Login.jsx` | 130-143 | Botón "Iniciar sesión con Google" con SVG |
| `Frontend/src/modules/Auth/Register.jsx` | 167-180 | Botón "Continuar con Google" con role dinámico |
| `Frontend/src/modules/Auth/GoogleCallback.jsx` | 1-92 | Página de callback: intercambia code, login automático |
| `Frontend/src/App.jsx` | 9, 38 | Importa `GoogleCallback`, ruta `/auth/callback` |
| `Frontend/src/utils/apiClient.js` | 182 | Método `authClient.googleExchange(code)` |

### Configuración

| Archivo | Estado |
|---------|--------|
| `Backend/.env.example` | Líneas 14-17: plantilla con vars vacías |
| `Backend/.env` | **FALTAN** las 3 variables de Google OAuth |
| `Frontend/.env.example` | Sin vars específicas de Google (correcto) |

---

## 5. Seguridad Implementada

| Mecanismo | Estado | Detalle |
|-----------|--------|---------|
| PKCE (Proof Key for Code Exchange) | ✅ | Code challenge S256, verifier almacenado en Redis |
| State firmado | ✅ | `itsdangerous.URLSafeTimedSerializer`, TTL 10 min |
| Anti-replay de PKCE | ✅ | Datos PKCE en Redis con key `pkce:{state_id}`, se eliminan tras uso |
| Verificación JWRS del id_token | ✅ | Firma RS256, audience, issuer, nonce validados |
| Validación nonce OIDC | ✅ | Nonce generado aleatoriamente y verificado en callback |
| Verificación email_verified | ✅ | Rechaza usuarios con email no verificado por Google |
| Exchange codes únicos | ✅ | Código de un solo uso en Redis, TTL 60 segundos, eliminación inmediata |
| Rate limiting | ✅ | 10 requests/minuto por IP en los 3 endpoints |
| No escalación de roles | ✅ | Si un usuario existente hace login con Google, su rol NO cambia |
| Password nullable | ✅ | `User.hashed_password` permite NULL para usuarios creados via Google |

---

## 6. Faltantes y Pendientes

### CRÍTICO - Bloquea Funcionamiento

| # | Faltante | Ubicación | Impacto |
|---|----------|-----------|---------|
| 1 | Variables de entorno de Google OAuth no configuradas | `Backend/.env` (ausentes) | El flujo lanza `BadRequestException("Google Auth is not configured on the server.")` en `google.py:69`. **La feature no funciona.** |

**Solución:** Agregar al `Backend/.env`:
```env
GOOGLE_CLIENT_ID=<client-id-de-google-cloud-console>
GOOGLE_CLIENT_SECRET=<client-secret-de-google-cloud-console>
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
```

### IMPORTANTES - Funcionalidad Pendiente

| # | Faltante | Descripción | Esfuerzo estimado |
|---|----------|-------------|-------------------|
| 2 | Sin "desvincular Google" | No hay endpoint ni UI para eliminar la identidad Google asociada a una cuenta | Medio |
| 3 | Sin recuperación de contraseña para usuarios Google | Usuarios creados via Google tienen `hashed_password=None`. Si Google falla, no hay ruta de acceso alternativa | Medio |
| 4 | Sin envío de email al vincular identidad | TODO pendiente en `google.py:223`: notificar cuando se vincula una nueva identidad Google a una cuenta existente | Bajo |
| 5 | Sin botón de Google en Landing page | El botón solo existe en Login y Register; no hay acceso directo desde la landing | Bajo |
| 6 | Sin verificación de email propia | Solo valida `email_verified` de Google; no hay flujo propio de verificación | Medio |

### MENORES - Mejoras Sugeridas

| # | Faltante | Descripción |
|---|----------|-------------|
| 7 | Sin refresh tokens de Google | Solo se usa el id_token; no se almacenan refresh tokens para mantener sesiones largas |
| 8 | Sin MFA/2FA | No hay autenticación de dos factores |
| 9 | Sin "olvidé mi contraseña" | El enlace en Login.jsx dice "Próximamente" |
| 10 | Sin inicio de sesión social adicional | No hay Facebook, Apple o Microsoft login |

---

## 7. Modelos de Base de Datos

### Tabla `users` (modificada)

| Columna | Tipo | Cambio para Google Auth |
|---------|------|------------------------|
| `hashed_password` | VARCHAR | Cambiado a **nullable** (NULL para usuarios creados via Google) |

### Tabla `user_identities` (nueva)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK → users.id) | Cascade on delete |
| `provider` | VARCHAR | "google" |
| `provider_id` | VARCHAR | Sub claim de Google |
| `created_at` | DATETIME | Timestamp de creación |
| *Constraint* | UNIQUE | (`provider`, `provider_id`) |

---

## 8. Endpoints API

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `GET` | `/api/v1/auth/google/authorize` | No | Genera state+PKCE, redirige a Google |
| `GET` | `/api/v1/auth/google/callback` | No | Valida respuesta de Google, crea/vincula usuario |
| `POST` | `/api/v1/auth/google/exchange` | No | Intercambia exchange code por JWT de la app |

---

## 9. Test Plan (Tests Existentes)

| Test | Archivo | Qué valida |
|------|---------|------------|
| Login con password NULL | `test_auth_google.py:14-35` | Usuarios Google con `hashed_password=None` rechazan login por email/password con error genérico |
| Unique constraint | `test_auth_google.py:37-90` | No se pueden crear identidades duplicadas (mismo provider+provider_id) |
| No escalación de roles | `test_auth_google.py:92-176` | Login Google no cambia el rol de un usuario existente |

---

## 10. Checklist de Activación

Para habilitar la funcionalidad en un entorno de desarrollo:

- [ ] Crear proyecto en Google Cloud Console
- [ ] Habilitar Google OAuth 2.0 API
- [ ] Configurar pantallas de consentimiento (email, logo, URLs de privacidad)
- [ ] Crear credenciales OAuth 2.0 Client ID (tipo Web Application)
- [ ] Agregar URI de redirección autorizada: `http://localhost:8000/api/v1/auth/google/callback`
- [ ] Copiar Client ID y Client Secret al `Backend/.env`
- [ ] Asegurar que Redis está corriendo (requerido para PKCE state y exchange codes)
- [ ] Ejecutar migración Alembic: `alembic upgrade head`
- [ ] Probar flujo completo: Login → Google → Callback → Dashboard

---

*Informe generado automáticamente el 2026-07-25*
