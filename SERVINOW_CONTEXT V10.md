# SERVINOW CONTEXT V10

> **Última actualización:** Julio 2026
> **Estado del proyecto:** MVP Avanzado / Módulos backbone completos / Integración Social + IA + WhatsApp + Facturación DIAN (~8.5/10)
> **Stack:** React 18 + Vite | FastAPI + SQLAlchemy Async | PostgreSQL | Celery + Redis | Docker

---

## TABLA DE CONTENIDOS

1. [Visión General del Proyecto](#1-visión-general-del-proyecto)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [API Reference Completa](#3-api-reference-completa)
4. [Inventario de Módulos](#4-inventario-de-módulos)
5. [Módulos Destacados - Deep Dive](#5-módulos-destacados---deep-dive)
6. [Sistema de Diseño e Interfaz (UI/UX)](#6-sistema-de-diseño-e-interfaz-uiux)
7. [Gestión de Estado](#7-gestión-de-estado)
8. [Seguridad](#8-seguridad)
9. [Modelo de Negocio](#9-modelo-de-negocio)
10. [Deuda Técnica Crítica](#10-deuda-técnica-crítica)
11. [Gaps de Backend](#11-gaps-de-backend)
12. [Roadmap Priorizado](#12-roadmap-priorizado)

---

## 1. VISIÓN GENERAL DEL PROYECTO

### Descripción

**ServiNow** es una plataforma de gestión empresarial para PyMEs colombianas con un componente social integrado. Su tagline: *"Servir es el único negocio donde todos ganan"*.

En la versión **V10**, el proyecto ha expandido significativamente su alcance más allá de lo documentado en V9. Se incorporaron módulos completos de integración con WhatsApp Cloud API, generación de contenido por IA, publicación en redes sociales (Facebook/Instagram/TikTok), autenticación con Google OAuth, y un sistema robusto de facturación electrónica DIAN.

### Principales Logros Acumulados (V9 + V10)

**Capa UI/UX (V9):**
1. **Push Drawer Lateral:** Paneles laterales que desplazan la interfaz principal sin oscurecerla.
2. **Colapso Inteligente del Menú:** Sidebar se contrae automáticamente al abrir drawers.
3. **Tablas con Ancho Fijo (`colgroup`):** Columnas con anchos estrictos en píxeles.
4. **Confirmación de Logout Resiliente:** Modal de confirmación con corrección de colisiones CSS.

**Nuevos Módulos (V10):**
5. **WhatsApp Cloud API Integration:** Vinculación por OTP, webhook con HMAC-SHA256, NLU con Gemini para parseo de intents, conversación multi-turno, creación de productos/servicios por chat.
6. **AI Content Generation:** `AiCopyGenerator` (Gemini) y `AiVideoGenerator` (Veo) con procesamiento async vía Celery y rate limiting diario.
7. **Social Media Publishing:** Publicación cross-platform a Facebook, Instagram y TikTok con manejo de tokens OAuth (long-lived, refresh).
8. **Google OAuth:** Flujo completo con PKCE + JWKS + one-time exchange codes + rate limiting en Redis.
9. **Admin Social Panel:** Gestión de cuentas sociales de usuarios por staff.
10. **Sistema de Locaciones:** LocationSelects con `country-state-city`, GPS autofill vía Nominatim, neighborhoods personalizados con verificación.

### Stack Tecnológico Completo

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Frontend** | React + Vite | 18.3.1 / 5.4.21 |
| **Gestión de Paquetes** | PNPM (Monorepo Workspace) | 9.x |
| **Estado** | Zustand (Persist + Selectores) | 4.5.7 |
| **Routing** | React Router DOM | 6.30.4 |
| **Charts** | Chart.js + react-chartjs-2 | 4.5.1 / 5.3.1 |
| **Icons** | Lucide React + React Icons | 0.300.0 / 5.6.0 |
| **Backend** | FastAPI + SQLAlchemy 2.0 Async | 0.110.0 / 2.0+ |
| **Task Queue** | Celery + Redis | 5.4.0+ / 7-alpine |
| **Auth** | JWT (HS256) + bcrypt + Google OAuth PKCE | python-jose 3.3+ |
| **Token Encryption** | Fernet (symmetric) | cryptography 41.0+ |
| **Base de Datos** | PostgreSQL (asyncpg driver) | 15-alpine |
| **Migrations** | Alembic | 1.13+ |
| **Facturación DIAN** | ReportLab + lxml + signxml + zeep + qrcode | 4.1+ / 5.1+ / 4.0+ / 4.2+ / 7.4+ |
| **Email** | Jinja2 (templates) + smtplib | 3.1.6 |
| **Cloudinary** | Almacenamiento de imágenes | 1.40+ |
| **AI** | Google Gemini + Veo (Vertex AI) | google-genai 0.2+ |
| **Social APIs** | Meta Graph v20.0, TikTok API | - |
| **WhatsApp** | Meta WhatsApp Cloud API | v20.0 |
| **Testing** | pytest + pytest-asyncio + httpx + aiosqlite | 8.0+ / 0.23+ |
| **Infraestructura** | Docker Compose | v3.9 |
| **Deploy** | Render (Backend Docker) + Vercel (Frontend SPA) | - |

### Estadísticas del Proyecto

| Métrica | Valor |
|---------|-------|
| **Total Backend Python** | ~11,605 líneas en `Backend/app/` |
| **Total Frontend JS/JSX** | ~14,076 líneas en `Frontend/src/` |
| **Componentes React** | 56 archivos `.jsx` |
| **Archivos CSS** | 22 (8 globales + 12 de páginas + 2 de componentes) |
| **Routers Backend** | 13 módulos activos |
| **Endpoints API** | 70+ endpoints REST |
| **Modelos BD** | 14 tablas (SQLAlchemy) |
| **Migraciones Alembic** | 17 archivos |
| **Tests** | 10 archivos (7 WhatsApp + 2 generales + 1 Google Auth) |
| **Documentos de contexto** | 10 versiones (V1-V10) |

---

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Estructura del Proyecto

```
Servinow/
├── Backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app factory
│   │   ├── api/uploads.py           # Upload endpoints
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic Settings
│   │   │   ├── security.py          # JWT + bcrypt
│   │   │   ├── security_tokens.py   # Fernet encryption
│   │   │   ├── exceptions.py        # Exception handlers
│   │   │   └── celery_app.py        # Celery config
│   │   ├── db/
│   │   │   ├── base.py              # Model registry
│   │   │   ├── base_class.py        # DeclarativeBase
│   │   │   └── session.py           # Async engine + get_db
│   │   ├── modules/                 # 13 módulos funcionales
│   │   │   ├── auth/                # Auth + Google OAuth
│   │   │   ├── wall/                # Social wall + WebSockets
│   │   │   ├── products/            # CRUD productos
│   │   │   ├── categories/          # CRUD categorías
│   │   │   ├── services/            # CRUD servicios
│   │   │   ├── social/              # Redes sociales
│   │   │   ├── admin_social/        # Admin social
│   │   │   ├── billing/             # Facturación DIAN
│   │   │   ├── locations/           # Ubicaciones
│   │   │   ├── ai/                  # IA generativa
│   │   │   ├── whatsapp/            # WhatsApp Cloud API
│   │   │   └── agenda/              # (vacío - futuro)
│   │   └── shared/schemas.py        # Schemas compartidos
│   ├── alembic/                     # 17 migraciones
│   ├── tests/                       # 10 tests
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── requirements.txt
│
├── Frontend/
│   ├── src/
│   │   ├── App.jsx                  # Root con routing
│   │   ├── main.jsx                 # Entry point
│   │   ├── components/
│   │   │   ├── layout/              # MainLayout, Sidebar, Header, etc.
│   │   │   ├── ui/                  # Drawer, Modal, Table, Toast, etc.
│   │   │   ├── AI/                  # AiCopyGenerator, AiVideoGenerator
│   │   │   ├── common/              # CustomCursor
│   │   │   └── ShareModal.jsx       # Social sharing
│   │   ├── modules/                 # Módulos de página
│   │   │   ├── Landing/
│   │   │   ├── Auth/                # Login, Register, GoogleCallback
│   │   │   ├── Dashboard/           # (mock data)
│   │   │   ├── Products/
│   │   │   ├── Services/
│   │   │   ├── Categories/
│   │   │   ├── Billing/
│   │   │   ├── Agenda/              # (mock data)
│   │   │   ├── Wall/
│   │   │   ├── Statistics/          # (mock data)
│   │   │   ├── Market/              # (mock data)
│   │   │   ├── Profile/             # SocialSettings, WhatsAppSettings
│   │   │   └── Admin/               # SocialAccountsAdmin
│   │   ├── store/useStore.js        # Zustand global store
│   │   ├── hooks/                   # 5 custom hooks
│   │   ├── utils/apiClient.js       # API client layer
│   │   └── config/appConfig.js      # Configuración
│   ├── css/                         # 20 archivos CSS
│   └── package.json
│
└── docs/archive/                    # Documentos históricos V1-V9
```

### 2.2 Routing Frontend

```javascript
// App.jsx — Estructura de rutas
Rutas Públicas:
  /                   -> Landing
  /login              -> Login
  /register           -> Register
  /unauthorized       -> Unauthorized (403)
  /auth/callback      -> GoogleCallback (OAuth redirect)

Rutas Protegidas (MainLayout + ProtectedRoute):
  /dashboard          -> Dashboard (mock data)
  /products           -> Products
  /services           -> Services
  /categories         -> Categories (ADMIN, SELLER)
  /billing            -> Billing (ADMIN, SELLER)
  /agenda             -> Agenda (mock data)
  /wall               -> Wall
  /statistics         -> Statistics (ADMIN - mock data)
  /market             -> Market (ADMIN - mock data)
  /profile            -> Profile

Rutas Staff (isStaffRequired):
  /admin/social       -> SocialAccountsAdmin

Catch-all: * -> redirect /dashboard
```

**ProtectedRoute** verifica: autenticación → si `isStaffRequired` → roles permitidos. Redirige a `/login` o `/unauthorized` según el caso.

### 2.3 Backend - App Factory

**Ubicación:** `Backend/app/main.py`

- FastAPI con lifespan manager (crea tablas en startup, cierra engine en shutdown)
- CORS: Vercel production + desarrollo local + regex para preview URLs de Vercel
- Middleware: ngrok-skip-browser-warning header
- 13 routers montados bajo `/api/v1/`
- Static mounts: `/uploads` (media) y `/legal` (términos/privacy)
- Health check en `/api/v1/health` con verificación de conexión a BD

### 2.4 Base de Datos - Modelos y Relaciones

14 tablas SQLAlchemy a través de 17 migraciones Alembic:

| Tabla | Módulo | Propósito |
|-------|--------|-----------|
| `users` | auth | Usuarios (UUID PK, email unique, bcrypt hashed password, role, avatar, location_id FK) |
| `user_identities` | auth | Identidades OAuth (Google, WhatsApp) — `(provider, provider_id)` unique |
| `categories` | categories | Categorías jerárquicas (self-referential parent_id, entity_type, slug unique, depth) |
| `products` | products | Productos (name, description, category_id FK, price, stock, image/video, user_id FK) |
| `services` | services | Servicios (name, description, category_id FK, price, duration, image/video, user_id FK) |
| `posts` | wall | Posts del muro social (author_id FK, content, type, media, is_edited) |
| `comments` | wall | Comentarios (post_id FK, author_id FK, content, media, is_edited) |
| `locations` | locations | Ubicaciones (country/state/city/neighborhood/address) — usada por users y customers |
| `neighborhoods` | locations | Barrios por ciudad (name, city_identifier, is_verified) |
| `social_accounts` | social | Cuentas sociales conectadas (platform, platform_user_id, tokens) |
| `social_tokens` | social | Tokens OAuth encriptados (access_token/refresh_token encryptados con Fernet) |
| `social_app_credentials` | social | Credenciales de apps sociales (app_id, app_secret encriptados) |
| `social_posts` | social | Historial de publicaciones (platform, status, caption, media_url) |
| `customers` | billing | Clientes de facturación (id_type, id_number unique, DV, email unique, phone unique, tax_regime) |
| `invoice_sequences` | billing | Secuencias numéricas de facturación (prefix unique, current_number con incremento atómico FOR UPDATE) |
| `invoices` | billing | Facturas (prefix, number, full_number GENERATED, customer_id FK, status enum: draft/issued/sent/paid/void/overdue, cufe, qr_data) |
| `invoice_items` | billing | Líneas de factura (product_id/service_id nullable, unit enum, cantidades, precios, impuestos — columnas GENERATED) |
| `credit_notes` | billing | Notas de crédito (invoice_id FK, reason, totals, status) |
| `credit_note_items` | billing | Líneas de nota de crédito |
| `dian_events` | billing | Log de comunicación con DIAN (event_type, request/response payload, status_code) |
| `ai_generation_tasks` | ai | Tareas de IA (status: pending/success/failed, video_url, estimated_cost_usd) |

### 2.5 Infraestructura

**Docker Compose** (`Backend/docker-compose.yml`):

| Servicio | Imagen | Propósito |
|----------|--------|-----------|
| `db` | postgres:15-alpine | Base de datos PostgreSQL con healthcheck |
| `web` | Build local (Dockerfile) | FastAPI + Uvicorn con entrypoint.sh (alembic upgrade + uvicorn) |
| `redis` | redis:7-alpine | Message broker para Celery |
| `worker` | Build local (Dockerfile) | Celery worker (procesa social publish, AI video, WhatsApp) |
| `flower` | mher/flower | UI de monitoreo de Celery (puerto 5555) |

**Deployment:**
- **Backend:** Render (Docker), Render blueprint en `render.yaml`
- **Frontend:** Vercel, SPA rewrites en `vercel.json`
- **Entrypoint:** `alembic upgrade head` seguido de `uvicorn app.main:app --host 0.0.0.0 --port 8000`

### 2.6 Tests

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `tests/conftest.py` | Fixtures | Async SQLite in-memory engine, test session |
| `tests/test_main.py` | General | Smoke tests de la API |
| `tests/test_auth_google.py` | Auth | Google OAuth flow (PKCE, exchange, rate limiting) |
| `tests/whatsapp/test_create_service_intent.py` | WhatsApp | NLU intent parsing |
| `tests/whatsapp/test_intent_draft_merge.py` | WhatsApp | Multi-turn draft merging |
| `tests/whatsapp/test_otp_link_success.py` | WhatsApp | OTP linking flow |
| `tests/whatsapp/test_otp_lockout.py` | WhatsApp | OTP brute force lockout |
| `tests/whatsapp/test_price_coercion.py` | WhatsApp | Price normalization |
| `tests/whatsapp/test_webhook_dedup.py` | WhatsApp | Message deduplication |
| `tests/whatsapp/test_webhook_signature.py` | WhatsApp | HMAC-SHA256 signature verification |

---

## 3. API REFERENCE COMPLETA

### 3.1 Auth (`/api/v1/auth`)

| Método | Ruta | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| POST | `/register` | Registrar nuevo usuario | No | - |
| POST | `/login` | Iniciar sesión (email+password) | No | - |
| GET | `/me` | Obtener perfil del usuario actual | JWT | all |
| PATCH | `/me` | Actualizar perfil propio | JWT | all |
| DELETE | `/me` | Eliminar (`?permanent=true`) o desactivar cuenta | JWT | all |
| POST | `/me/avatar` | Subir avatar (jpg/png/gif/webp, max 2MB) | JWT | all |
| GET | `/google/authorize` | Iniciar flujo Google OAuth2 con PKCE | JWT | all |
| GET | `/google/callback` | Callback Google OAuth2 | No | - |
| POST | `/google/exchange` | Exchange one-time code por JWT | No | - |

### 3.2 Products (`/api/v1/products`)

| Método | Ruta | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| GET | `/` | Listar productos (`?category_id=`, `?status=`) | JWT | all |
| POST | `/` | Crear producto | JWT | ADMIN, SELLER |
| GET | `/{product_id}` | Obtener producto | JWT | all |
| PATCH | `/{product_id}` | Actualizar producto | JWT | ADMIN, SELLER |
| DELETE | `/{product_id}` | Eliminar producto (libera media) | JWT | ADMIN, SELLER |

### 3.3 Services (`/api/v1/services`)

| Método | Ruta | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| GET | `/categories` | Listar categorías de servicios | JWT | all |
| GET | `/` | Listar servicios (`?category_id=`, `?status=`) | JWT | all |
| POST | `/` | Crear servicio | JWT | ADMIN, SELLER |
| GET | `/{service_id}` | Obtener servicio | JWT | all |
| PATCH | `/{service_id}` | Actualizar servicio | JWT | ADMIN, SELLER |
| DELETE | `/{service_id}` | Eliminar servicio | JWT | ADMIN, SELLER |

### 3.4 Categories (`/api/v1/categories`)

| Método | Ruta | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| GET | `/` | Listar categorías (`?entity_type=product\|service`) | JWT | all |
| POST | `/` | Crear categoría (slug autogenerado) | JWT | ADMIN, SELLER |
| PATCH | `/{category_id}` | Actualizar categoría | JWT | ADMIN, SELLER |
| DELETE | `/{category_id}` | Eliminar categoría (protege integridad referencial) | JWT | ADMIN, SELLER |

### 3.5 Wall (`/api/v1/wall`)

| Método | Ruta | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| GET | `/` | Listar posts (paginado) | JWT | all |
| POST | `/` | Crear post (broadcast WebSocket) | JWT | all |
| PATCH | `/{post_id}` | Editar post (autor o admin) | JWT | all |
| DELETE | `/{post_id}` | Eliminar post (autor o admin) | JWT | all |
| POST | `/{post_id}/comments` | Crear comentario (broadcast WS) | JWT | all |
| PATCH | `/{post_id}/comments/{comment_id}` | Editar comentario | JWT | all |
| DELETE | `/{post_id}/comments/{comment_id}` | Eliminar comentario | JWT | all |
| GET | `/users/search?q=` | Buscar usuarios para menciones | JWT | all |
| POST | `/upload` | Subir media para wall post | JWT | all |
| WS | `/ws/wall` | WebSocket para eventos en tiempo real | - | all |

### 3.6 Social Media (`/api/v1/social`)

| Método | Ruta | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| GET | `/authorize/{platform}` | Obtener URL de autorización OAuth | JWT | all |
| GET | `/callback/{platform}` | Callback OAuth (Facebook/Instagram/TikTok) | No | - |
| POST | `/accounts/manual/validate` | Validar credenciales manuales | JWT | all |
| POST | `/accounts/manual/confirm` | Confirmar y guardar conexión manual | JWT | all |
| GET | `/accounts` | Listar cuentas conectadas | JWT | all |
| DELETE | `/accounts/{platform}` | Desconectar cuenta social | JWT | all |
| POST | `/publish` | Publicar contenido (Celery async) | JWT | all |
| GET | `/post-status/{post_id}` | Consultar estado de publicación | JWT | all |

### 3.7 Admin Social (`/api/v1/admin/social`)

| Método | Ruta | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| GET | `/users?search=` | Buscar usuarios (staff) | JWT | STAFF |
| GET | `/accounts/{user_id}` | Ver cuentas sociales de usuario | JWT | STAFF |
| POST | `/accounts/{user_id}/manual/validate` | Validar credenciales para usuario | JWT | STAFF |
| POST | `/accounts/{user_id}/manual/confirm` | Confirmar conexión para usuario | JWT | STAFF |
| DELETE | `/accounts/{user_id}/{platform}` | Eliminar cuenta social de usuario | JWT | STAFF |

### 3.8 Billing (`/api/v1/billing`)

| Método | Ruta | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| GET | `/customers` | Listar clientes (`?search=`, `?active_only=`) | JWT | ADMIN, SELLER |
| POST | `/customers` | Crear cliente (valida ID único) | JWT | ADMIN, SELLER |
| PATCH | `/customers/{customer_id}` | Actualizar cliente | JWT | ADMIN, SELLER |
| GET | `/invoices` | Listar facturas (`?status=`, `?dian_status=`, `?date_from=`) | JWT | ADMIN, SELLER |
| POST | `/invoices` | Crear factura (número atómico + CUFE SHA-384) | JWT | ADMIN, SELLER |
| GET | `/invoices/{invoice_id}` | Obtener detalle de factura | JWT | ADMIN, SELLER |
| PATCH | `/invoices/{invoice_id}` | Actualizar borrador | JWT | ADMIN, SELLER |
| POST | `/invoices/{invoice_id}/cancel` | Anular factura | JWT | ADMIN, SELLER |
| POST | `/invoices/{invoice_id}/mark-paid` | Marcar como pagada | JWT | ADMIN, SELLER |
| GET | `/invoices/{invoice_id}/download` | Descargar PDF (renderizado en tiempo real) | JWT | ADMIN, SELLER |
| POST | `/invoices/{invoice_id}/send-dian` | Enviar a DIAN (o simular en dev) | JWT | ADMIN, SELLER |
| POST | `/invoices/{invoice_id}/send-email` | Enviar factura por email (PDF adjunto) | JWT | ADMIN, SELLER |
| GET | `/invoices/{invoice_id}/dian-status` | Estado DIAN + timeline de eventos | JWT | ADMIN, SELLER |
| POST | `/credit-notes` | Crear nota de crédito | JWT | ADMIN, SELLER |
| GET | `/summary` | Resumen de facturación (dashboard) | JWT | ADMIN, SELLER |
| GET | `/payment-means` | Medios de pago válidos DIAN | JWT | ADMIN, SELLER |
| GET | `/top-selling` | Top productos/servicios más vendidos | JWT | ADMIN, SELLER |
| GET | `/invoices/{invoice_id}/pdf` | Alias legacy de /download | JWT | ADMIN, SELLER |

### 3.9 Locations (`/api/v1/locations`)

| Método | Ruta | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| GET | `/neighborhoods/{city_identifier}` | Listar barrios por ciudad | JWT | all |
| POST | `/neighborhoods` | Crear barrio personalizado (unverified) | JWT | all |

### 3.10 AI (`/api/v1/ai`)

| Método | Ruta | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| POST | `/generate-copy` | Generar copy marketing (Gemini) | JWT | all |
| POST | `/generate-video` | Generar video promocional (Veo, admin only, rate limited) | JWT | ADMIN |
| GET | `/task/{task_id}` | Consultar estado de tarea de IA | JWT | all |

### 3.11 WhatsApp (`/api/v1/whatsapp`)

| Método | Ruta | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| POST | `/link/otp` | Generar OTP de 6 dígitos para vincular WhatsApp | JWT | all |
| GET | `/link/status` | Verificar si WhatsApp está vinculado | JWT | all |
| DELETE | `/link` | Desvincular número de WhatsApp | JWT | all |
| GET | `/webhook` | Verificación de webhook Meta (GET, hub.challenge) | No | - |
| POST | `/webhook` | Recibir mensajes entrantes (HMAC-SHA256 validado) | No | - |

### 3.12 Uploads (`/api/v1/uploads`)

| Método | Ruta | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| POST | `/media` | Subir media (imagen 5MB / video 20MB, validación magic bytes) | JWT | all |
| DELETE | `/media/{filename}` | Eliminar archivo subido | JWT | all |

### 3.13 Health

| Método | Ruta | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| GET | `/api/v1/health` | Health check + DB connectivity | No | - |
| GET | `/` | Root greeting | No | - |
| GET | `/tiktok{id}.txt` | Verificación de dominio TikTok | No | - |

---

## 4. INVENTARIO DE MÓDULOS

### Estado de Implementación (V10)

| Módulo | Frontend | Backend | Integración | DB | Tests | Estado General |
|--------|----------|---------|-------------|----|-------|----------------|
| **Landing** | ✅ Completo | N/A | Mock | N/A | - | ✅ Completo |
| **Login** | ✅ Completo | ✅ | API real JWT | users | - | ✅ Completo |
| **Register** | ✅ Completo | ✅ | API real bcrypt | users | - | ✅ Completo |
| **Google OAuth** | ✅ Completo | ✅ | PKCE + JWKS | user_identities | 1 file | ✅ Completo |
| **Dashboard** | ⚠️ Parcial | ❌ | Mock data | N/A | - | ❌ Mock |
| **Products** | ✅ Completo | ✅ | API real CRUD | products | - | ✅ Completo |
| **Services** | ✅ Completo | ✅ | API real CRUD | services | - | ✅ Completo |
| **Categories** | ✅ Completo | ✅ | API real CRUD | categories | - | ✅ Completo |
| **Billing** | ✅ Completo | ✅ | API real DIAN | customers, invoices, invoice_items, credit_notes, dian_events, invoice_sequences | - | ✅ Completo |
| **Agenda** | ⚠️ Parcial | ❌ | Mock data | (vacío) | - | 🔴 CRÍTICO |
| **Wall** | ✅ Completo | ✅ | API real + WebSockets | posts, comments | - | ✅ Completo |
| **Statistics** | ⚠️ Parcial | ❌ | Mock data | N/A | - | ❌ Mock |
| **Market** | ⚠️ Parcial | ❌ | Mock data | N/A | - | ❌ Mock |
| **Profile** | ✅ Completo | ✅ | API real | users, locations | - | ✅ Completo |
| **Social Media** | ✅ Completo | ✅ | API real OAuth + Publishing | social_accounts, social_tokens, social_app_credentials, social_posts | - | ✅ Completo |
| **Admin Social** | ✅ Completo | ✅ | API real staff-only | social_accounts | - | ✅ Completo |
| **AI Generation** | ✅ Completo | ✅ | Gemini + Veo + Celery | ai_generation_tasks | - | ✅ Beta |
| **WhatsApp** | ✅ Completo | ✅ | Cloud API + NLU + OTP | user_identities | 7 files | ✅ Completo |
| **Locations** | ✅ Completo | ✅ | API real + GPS | locations, neighborhoods | - | ✅ Completo |
| **Uploads** | N/A (hook) | ✅ | Magic byte validation | filesystem | - | ✅ Completo |

### Detalle Técnico por Módulo

| Módulo | Componentes Frontend | Archivos Backend | Endpoints |
|--------|---------------------|-------------------|-----------|
| **Auth** | Login.jsx, Register.jsx, GoogleCallback.jsx | router.py, crud.py, models.py, schemas.py, deps.py, google.py | 9 |
| **Products** | Products.jsx | router.py, crud.py, models.py, schemas.py | 5 |
| **Services** | Services.jsx | router.py, crud.py, models.py, schemas.py | 6 |
| **Categories** | Categories.jsx | router.py, models.py | 4 |
| **Wall** | Wall.jsx, useWallSockets.js | router.py, crud.py, models.py, schemas.py | 9 + WS |
| **Social** | SocialSettings.jsx, ShareModal.jsx | router.py, service.py, crud.py, models.py, schemas.py, deps.py, tasks.py, manual_credentials_service.py | 8 |
| **Billing** | Billing.jsx, InvoiceForm.jsx, InvoiceDetail.jsx, CustomerModal.jsx, TopProductsSidebar.jsx | router.py, crud.py, models.py, schemas.py, dian_service.py, pdf_service.py, invoice_email_service.py, payment_means_rules.py | 18 |
| **AI** | AiCopyGenerator.jsx, AiVideoGenerator.jsx | router.py, service.py, crud.py, models.py, schemas.py, tasks.py | 3 |
| **WhatsApp** | WhatsAppSettings.jsx | router.py, service.py, tasks.py, ai.py, prompts.py, schemas.py | 5 |
| **Locations** | LocationSelects.jsx | router.py, models.py, schemas.py | 2 |
| **Admin Social** | SocialAccountsAdmin.jsx | router.py | 5 |

---

## 5. MÓDULOS DESTACADOS - DEEP DIVE

### 5.1 WhatsApp Cloud API Integration

**Arquitectura general:**

```
Usuario WhatsApp → Meta Cloud API → Webhook POST → HMAC verification
    → Celery task (process_whatsapp_message)
        → Deduplicación (Redis, TTL 1h)
        → Buscar UserIdentity por número
        → Si NO vinculado:
            → Si mensaje es OTP (6 dígitos): validar OTP en Redis, vincular
            → Si no: responder "número no vinculado"
        → Si vinculado:
            → Cargar draft existente (Redis)
            → Parsear intent con Gemini (parse_whatsapp_intent)
            → Merge draft + nuevos entities
            → Si faltan campos: guardar draft, preguntar
            → Si completos: ejecutar handler (create_product / create_service)
```

**Componentes clave:**

| Archivo | Propósito |
|---------|-----------|
| `router.py` | OTP generation (6 dígitos, 10min TTL), link status, unlink, webhook verification (GET), message receiving (POST con HMAC-SHA256) |
| `service.py` | `WhatsAppService` — envía mensajes de texto vía Meta Graph API v20.0 |
| `tasks.py` | Orquestación completa: dedup, OTP lockout (5 intentos, 10min), drafts (15min TTL), price coercion, merge multi-turn, handlers `create_product`/`create_service`/`unknown` |
| `ai.py` | `parse_whatsapp_intent` — Gemini 2.5 Flash para extraer intent + entities en JSON |
| `prompts.py` | System prompt para Gemini: instrucciones de parseo, campos requeridos (name, price), respuesta en español |
| `schemas.py` | `WhatsAppIntentResponse` — intent, entities, missing_fields, bot_reply |

**Flujo de vinculación:**
1. Usuario genera OTP en `Profile > WhatsAppSettings`
2. Usuario envía OTP por WhatsApp al número de negocio
3. Webhook recibe el mensaje, valida HMAC, encola en Celery
4. Celery verifica OTP en Redis, crea `UserIdentity(provider="whatsapp")`
5. Confirma vinculación por WhatsApp

**Seguridad:**
- HMAC-SHA256 con `META_APP_SECRET` para todos los webhooks
- Deduplicación de mensajes por `message_id` (Redis NX, TTL 1h)
- Lockout tras 5 intentos fallidos de OTP (10 min)
- OTP con expiración de 10 minutos en Redis

### 5.2 AI Content Generation

**Componentes:**

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| `AiCopyGenerator.jsx` | Gemini API | Genera copy marketing con selector de tono (persuasivo, profesional, casual, etc.) |
| `AiVideoGenerator.jsx` | Veo + Celery | Genera video promocional a partir de imagen + prompt, con polling de estado |
| `service.generate_social_copy()` | Gemini (fallback multi-modelo) | 280 caracteres, sin hashtags excesivos, tono configurable |
| `service.generate_video_from_image()` | Veo 3.1 Fast Generate Preview | Imagen → video, descarga local a `uploads/items/` |
| `tasks.generate_video_task()` | Celery async | Procesamiento en background con actualización de BD |
| `crud.py` | SQLAlchemy | Create/read AI tasks, daily rate limiter (`count_video_tasks_today`) |

**AI Models utilizados (en orden de fallback):**
1. `gemini-3.5-flash`
2. `gemini-3.1-flash-lite`
3. `gemini-flash-lite-latest`
4. `gemini-2.0-flash-lite`

**Rate Limiting:**
- Límite diario configurable (`AI_VIDEO_DAILY_LIMIT`, default 50)
- Solo administradores pueden generar videos
- Tareas con estado: `pending` → `success`/`failed`

### 5.3 Social Media Integration

**Plataformas soportadas:**
- **Facebook:** Publicación de fotos en páginas (multipart/form-data)
- **Instagram:** 2-step container creation + publish (requiere URL pública HTTPS)
- **TikTok:** Photo (PULL_FROM_URL) y Video (FILE_UPLOAD)

**Flujo OAuth:**

```
Frontend → GET /social/authorize/{platform}
    → Backend genera state firmado (user_id + platform) con URLSafeTimedSerializer
    → Redirige a Meta/TikTok OAuth dialog
Usuario autoriza → Redirect a callback → Backend exchange code por token
    → Token exchange: code → short-lived → long-lived (Meta)
    → Almacena en social_tokens (encriptado con Fernet)
```

**Conexión Manual (sin OAuth redirect):**
1. Usuario ingresa App ID, App Secret, Access Token manualmente
2. `POST /social/accounts/manual/validate` — verifica contra APIs reales (Meta debug_token, TikTok /user/info/)
3. `POST /social/accounts/manual/confirm` — guarda credenciales encriptadas en `social_app_credentials`

**Publicación (Celery async):**

```
POST /social/publish → Celery task
    → Por cada account conectada:
        → Refresh token si es necesario (TikTok)
        → Publicar según plataforma:
            - Facebook: POST photo to page feed
            - Instagram: POST container → esperar id → POST publish
            - TikTok: POST PULL_FROM_URL (foto) o FILE_UPLOAD (video)
    → Actualizar social_posts con status
```

**Archivos clave:** `service.py` (317 líneas), `tasks.py`, `manual_credentials_service.py`, `crud.py`

### 5.4 Google OAuth (PKCE + JWKS)

Implementado después de V9 (commits: `02d1858`, `9582e21`).

**Flujo:**
1. Frontend solicita `GET /auth/google/authorize` → Backend genera PKCE challenge, nonce, y state firmado
2. Backend devuelve URL de autorización de Google + PKCE data
3. Usuario autoriza en Google → Redirect a `/auth/callback` con `code` + `state`
4. Frontend envía `code` a `POST /auth/google/exchange`
5. Backend valida state, intercambia code por tokens, verifica JWT de Google con JWKS
6. Busca o crea `User` + `UserIdentity(provider="google")`
7. Devuelve JWT de ServiNow

**Seguridad adicional:**
- PKCE (Proof Key for Code Exchange) — protege contra ataques de interceptación
- Nonce — protege contra replay attacks
- State firmado con `itsdangerous` (expira 10 min)
- Rate limiting en Redis para prevenir abuso del endpoint de exchange
- One-time codes (solo pueden usarse una vez)

**Tests:** `test_auth_google.py` (176 líneas) cubre: successful exchange, expired code, reused code, rate limiting.

### 5.5 Facturación Electrónica DIAN

**Módulo más complejo del backend** (6 archivos principales, ~endpoints 18).

**Arquitectura:**

```
InvoiceForm (Frontend) → POST /billing/invoices
    → create_invoice():
        → SELECT ... FOR UPDATE en invoice_sequences (incremento atómico)
        → Calcular subtotal, impuestos, total
        → Generar CUFE (SHA-384 de datos clave)
        → Generar QR data
        → Persistir factura + items
    → generate_invoice_pdf(): pre-generar PDF en disco (copia snapshot)

GET /billing/invoices/{id}/download
    → render_invoice_pdf_bytes(): render SIEMPRE en tiempo real
        → ReportLab: logo + QR + client data + items table + totals + CUFE
        → Threadpool para no bloquear event loop

POST /billing/invoices/{id}/send-dian
    → submit_invoice_to_dian():
        → Construir XML UBL 2.1 (lxml)
        → Firmar digitalmente (signxml)
        → Enviar vía SOAP (zeep) — o simular en desarrollo
        → Registrar evento en dian_events

POST /billing/invoices/{id}/send-email
    → send_invoice_email():
        → Render PDF en tiempo real
        → Jinja2 HTML template con datos de factura
        → SMTP con attachment PDF
```

**Características DIAN:**
- UBL 2.1 XML completo
- CUFE generado con SHA-384
- QR code embebido en PDF
- Notas de crédito con referencia a factura original
- Medios de pago validados contra catálogo DIAN
- Timeline de eventos DIAN (`dian_events`)
- Modo simulación en desarrollo (sin conexión real a DIAN)

### 5.6 Wall Social en Tiempo Real

**Arquitectura WebSocket:**

```
ConnectionManager (singleton en router.py):
    - set[WebSocket] connections
    - connect() → accept + add
    - disconnect() → remove
    - broadcast() → send JSON a todos, limpia conexiones muertas

Eventos broadcast:
    - new_post
    - new_comment
    - post_updated
    - post_deleted
    - comment_updated
    - comment_deleted
```

**Frontend:** `useWallSockets.js` hook con:
- Conexión WebSocket al montar
- Reconexión automática hasta 5 intentos
- Manejo de eventos: new_post, new_comment
- Integración con estado local del componente Wall

---

## 6. SISTEMA DE DISEÑO E INTERFAZ (UI/UX)

### 6.1 Design Tokens (`variables.css`)

363 líneas de CSS custom properties con sistema de temas oscuro/claro:

**Paleta Royal Velvet (Oscuro):**
- `--primary: #D4A853` (oro)
- `--bg-primary: #0F0B1A` (púrpura oscuro)
- `--bg-secondary: #1A1528`
- `--text-primary: #F5F0FF`

**Sistema de espaciado:** 0.25rem increments (4, 8, 12, 16, 20, 24, 32, 40, 48, 64px)
**Tipografía:** Inter + system fonts, escala 12-48px
**Sombras:** 4 niveles para cards, dropdowns, modales
**Transiciones:** 200-300ms ease para todos los elementos interactivos

### 6.2 Layout System

```
┌─────────────────────────────────────────────┐
│  Header (barra superior con búsqueda + tema) │
├──────────┬──────────────────────────────────┤
│          │                                   │
│ Sidebar  │  .app-main (contenido principal)  │
│ (izq)    │                                   │
│          │                                   │
│ .sidebar-│  + Drawer derecho (push,          │
│ -nav     │    desplaza .app-main)            │
│          │                                   │
├──────────┴──────────────────────────────────┤
│ BottomNavbar (solo mobile)                   │
└─────────────────────────────────────────────┘
```

**Push Drawer:** Al abrirse un drawer derecho, `layout.css` aplica transición fluida que desplaza `.app-main` a la izquierda. El sidebar se colapsa automáticamente. Sin backdrop blur en desktop.

**Sidebar dinámico:** Se contrae a modo íconos al abrir drawers. Botón hamburguesa siempre visible para expandir/contraer manualmente.

### 6.3 Component Library

| Componente | Archivo | Props clave |
|------------|---------|-------------|
| **Modal** | `Modal.jsx` | isOpen, onClose, title, size (sm/md/lg), actions, portal-based |
| **Drawer** | `Drawer.jsx` | isOpen, onClose, position (left/right), title, sidebar-collapse-on-open |
| **LiquidDrawer** | `LiquidDrawer.jsx` | SVG liquid background, gradient orbs, shine effects (Landing page) |
| **Table** | `Table.jsx` | sortable columns, search, pagination, custom renderers, `<colgroup>` widths, footer slot |
| **Toast** | `Toast.jsx` | success/error/warning/info, 4s auto-dismiss, portal-based, Zustand store |
| **MediaCard** | `MediaCard.jsx` | image/video preview, category badge, price, stock, admin actions |
| **MediaUploader** | `MediaUploader.jsx` | drag-and-drop, preview, progress bar, type/size validation |
| **ImageCropperModal** | `ImageCropperModal.jsx` | react-easy-crop, square aspect, zoom, returns cropped File |
| **CategorySelect** | `CategorySelect.jsx` | searchable dropdown, inline "create new category" |
| **LocationSelects** | `LocationSelects.jsx` | cascading country/state/city/neighborhood, GPS autofill |
| **ItemCardSkeleton** | `ItemCardSkeleton.jsx` | loading placeholder |

### 6.4 Responsive Design

- **Desktop:** Sidebar + TopNavbar + Push Drawer + Dynamic Background
- **Mobile:** BottomNavbar reemplaza TopNavbar + Sidebar, layout de una columna
- **Breakpoints:** Sistema de media queries en `layout.css` y `components.css`

### 6.5 Dynamic Background

`DynamicBackground.jsx` + `DynamicBackground.css`:
- SVG watercolor-style blobs animados
- Aurora blobs con degradés
- Mouse glow effect que sigue al cursor
- Floating gold dust particles
- Noise overlay

---

## 7. GESTIÓN DE ESTADO

### 7.1 Zustand Store Principal

**Archivo:** `Frontend/src/store/useStore.js`

**Persistencia:** Middleware `persist` en `localStorage` bajo key `antigravity-storage`.

**Estado Persistido:**
| Campo | Tipo | Default | Propósito |
|-------|------|---------|-----------|
| `theme` | `'light' \| 'dark'` | `'light'` | Tema visual |
| `sidebarCollapsed` | `boolean` | `false` | Estado del menú lateral |
| `currentUser` | `object \| null` | `null` | Datos del usuario autenticado |
| `isAuthenticated` | `boolean` | `false` | Flag de autenticación |

**Estado No Persistido:**
| Campo | Tipo | Propósito |
|-------|------|-----------|
| `landingDrawers.feature` | `{ isOpen, drawerWidth }` | Control del drawer de features en Landing |
| `landingDrawers.benefit` | `{ isOpen, drawerWidth }` | Control del drawer de beneficios en Landing |

**Acciones:**
| Acción | Propósito |
|--------|-----------|
| `toggleTheme()` | Cambia entre light/dark, actualiza `<html data-theme>` |
| `setTheme(theme)` | Fija tema específico |
| `toggleSidebar()` | Alterna colapso del sidebar |
| `setSidebarCollapsed(collapsed)` | Fija colapso explícitamente |
| `setCurrentUser(user)` | Actualiza datos del usuario |
| `login(user)` | Fija usuario + isAuthenticated=true |
| `logout()` | Limpia usuario + isAuthenticated=false |
| `openFeatureDrawer()` | Abre drawer de feature en Landing |
| `closeFeatureDrawer()` | Cierra drawer de feature |
| `openBenefitDrawer()` | Abre drawer de beneficio |
| `closeBenefitDrawer()` | Cierra drawer de beneficio |
| `closeAllLandingDrawers()` | Cierra ambos drawers del Landing |

### 7.2 Toast Store (Secundaria)

**Ubicación:** `Frontend/src/components/ui/Toast.jsx`

Store independiente con `useToastStore` para la cola de notificaciones globales. Hook `useToast()` expone: `success()`, `error()`, `warning()`, `info()`. Auto-dismiss a los 4s.

### 7.3 Optimización con Selectores

Se utiliza suscripción granular para evitar re-renders innecesarios:
```javascript
// Correcto (V9+):
const setSidebarCollapsed = useStore(state => state.setSidebarCollapsed);
const sidebarCollapsed = useStore(state => state.sidebarCollapsed);

// Incorrecto (causaba loops infinitos en V8):
const { setSidebarCollapsed } = useStore();
```

---

## 8. SEGURIDAD

| Capa | Mecanismo | Implementación |
|------|-----------|----------------|
| **Autenticación** | JWT HS256 | `python-jose`, payload: sub (UUID), email, role, exp. Default 30 min |
| **Password Hashing** | bcrypt | `hash_password()` / `verify_password()` en `core/security.py` |
| **Google OAuth** | PKCE + nonce + JWKS | State firmado con `itsdangerous` (10 min), rate limiting Redis, one-time codes |
| **Token Encryption** | Fernet (symmetric) | `EncryptedString` TypeDecorator para tokens sociales en BD |
| **Webhook WhatsApp** | HMAC-SHA256 | Validación con `META_APP_SECRET` antes de procesar payload |
| **Role-Based Access** | 4 roles | `admin`, `seller`, `client`, `is_staff` (flag para admin panel) |
| **File Upload Validation** | Magic bytes | Verifica cabeceras de archivo (JPEG: \xff\xd8\xff, PNG: \x89PNG, etc.) |
| **Rate Limiting** | Redis | AI video (50/día), Google OAuth exchange, OTP generation |
| **CORS** | Allow list | Vercel production + localhost + regex `https://.*\.vercel\.app` |
| **Environment** | .env + pydantic-settings | Credenciales fuera del repositorio, validación en startup |

---

## 9. MODELO DE NEGOCIO

1. **Social Selling Integrado:** Publicación directa a Facebook, Instagram y TikTok desde la plataforma. Generación de copy con IA. Videos promocionales con Veo.

2. **WhatsApp Commerce:** Creación de productos y servicios mediante mensajes de WhatsApp con lenguaje natural. OTP linking para vincular números.

3. **Cumplimiento Tributario Nativo:** Facturación electrónica DIAN con generación de XML UBL 2.1, CUFE, QR, PDF profesional y envío por email.

4. **Circularidad y Redes:** Visibilización de inventarios locales a través del Módulo Wall (social feed interno) y Market (inteligencia de mercado).

5. **AI-Powered Content:** Generación automatizada de copy marketing y videos promocionales para reducir la fricción de publicación en redes.

---

## 10. DEUDA TÉCNICA CRÍTICA

### 🔴 Prioridad Alta

| Ítem | Descripción | Impacto |
|------|-------------|---------|
| **Módulo Agenda 0%** | `Backend/app/modules/agenda/` contiene solo `__init__.py` vacío. Sin modelo, router, schemas ni endpoints. | Usuarios no pueden agendar citas reales |
| **Dashboard con Mock Data** | `Dashboard.jsx` usa `MockData` 100%. KPI cards, charts y actividad reciente son simulados. | Sin visibilidad real del negocio |
| **Statistics con Mock Data** | `Statistics.jsx` usa `MockData`. Charts y rankings no reflejan datos reales. | Sin analítica funcional |
| **Market con Mock Data** | `Market.jsx` usa `MockData`. Negocios cercanos e insights son ficticios. | Módulo inútil para el usuario |

### 🟡 Prioridad Media

| Ítem | Descripción | Impacto |
|------|-------------|---------|
| **CSS Global sin Encapsular** | `InvoiceModal.css`, `CustomerModal.css` contienen reglas globales no encapsuladas. Se usa `!important` como parche. | Colisiones de estilos entre módulos |
| **Legacy Vanilla JS** | `Frontend/js/` contiene ~6 componentes en JavaScript vanilla (app.js, sidebar.js, table.js, etc.) que no se usan en la app React. | Código muerto, confusión |
| **Sin TypeScript** | Todo el frontend es JSX/JS plano. `@types/react` está instalado como devDep pero no se usa. | Sin type safety, mayor propensión a bugs runtime |
| **Cobertura de Tests Baja** | 10 tests para todo el proyecto. Solo WhatsApp tiene cobertura significativa (7 tests). | Riesgo de regresiones no detectadas |
| **CUFE Generación Cuestionable** | La generación del CUFE usa datos que pueden no coincidir exactamente con el estándar DIAN. | Potencial rechazo DIAN en producción |
| **Simulación DIAN** | `dian_service.py` tiene lógica de simulación que omite la conexión real con DIAN. | No apto para producción real |
| **Sin i18n** | Todo el contenido está en español colombiano hardcodeado. | No escalable a otros mercados |
| **Cache Busting** | No hay sistema de invalidación de caché para assets. | Usuarios pueden ver版本 desactualizadas |

---

## 11. GAPS DE BACKEND

| Gap | Módulo | Detalle |
|-----|--------|---------|
| **Agenda (appointments)** | Agenda | Crear tabla `appointments`, Pydantic schemas, CRUD, router FastAPI. Conectar frontend. |
| **Dashboard endpoints** | Dashboard | Endpoints agregados para KPIs reales: ventas del día/semana/mes, productos top, actividad reciente. |
| **Statistics endpoints** | Statistics | Endpoints para analytics: revenue mensual, categorías más vendidas, tendencias. |
| **Market endpoints** | Market | Endpoints para datos de mercado: negocios cercanos, comparativa de precios, insights. |
| **Notificaciones push** | General | No hay sistema de notificaciones (email, SMS, push) para eventos del sistema. |
| **Webhook Meta para social** | Social | No hay webhook handler para recibir eventos de Meta (cambios en páginas, etc.). |
| **Refresh Token rotation** | Auth | Los JWT no tienen refresh token. Al expirar, el usuario debe volver a login. |

---

## 12. ROADMAP PRIORIZADO

### Corto Plazo (Prioridad 1) — Sprint Actual

| Tarea | Módulo | Esfuerzo Estimado | Dependencias |
|-------|--------|-------------------|--------------|
| Desarrollar backend de Agenda (tabla `appointments`, router, CRUD) | Agenda | 3-5 días | Ninguna |
| Conectar Dashboard a datos reales (endpoint `/billing/summary` ya existe) | Dashboard | 2-3 días | Billing (listo) |
| Conectar Statistics a datos reales (nuevo endpoint `/statistics`) | Statistics | 3-4 días | Dashboard |
| Conectar Market o deprecar el módulo | Market | 1-2 días | Decisión de producto |

### Mediano Plazo (Prioridad 2) — Próximo Sprint

| Tarea | Módulo | Esfuerzo Estimado | Dependencias |
|-------|--------|-------------------|--------------|
| Encapsular reglas CSS globales bajo clases padre | CSS | 2-3 días | Ninguna |
| Eliminar `Frontend/js/` legacy | Refactor | 1 día | Ninguna |
| Migrar a TypeScript progresivamente | Frontend | 5-10 días | Ninguna |
| Aumentar cobertura de tests (mínimo 30 tests) | Testing | 5-7 días | Módulos existentes |
| Implementar refresh tokens JWT | Auth | 2-3 días | Auth (listo) |
| Conectar DIAN real (producción) | Billing | 3-5 días | Certificado DIAN |

### Largo Plazo (Prioridad 3) — Visión

| Tarea | Módulo | Justificación |
|-------|--------|---------------|
| i18n (inglés + portugués) | General | Expandir a mercados internacionales |
| Modo offline (PWA) | Frontend | Funcionar sin conexión a internet |
| App mobile nativa (React Native) | Mobile | Experiencia móvil superior |
| Sistema de notificaciones push | General | Alertas de ventas, citas, mensajes |
| WebSocket para notificaciones en tiempo real | General | Reemplazar polling en múltiples módulos |

---

*Documento generado: Julio 2026*
*Versión: V10*
*Próxima actualización recomendada: Tras implementar el backend del módulo de Agenda y conectar Dashboard a datos reales*
