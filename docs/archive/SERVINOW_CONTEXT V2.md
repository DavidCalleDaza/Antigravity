# SERVINOW PROJECT - CONTEXT DOCUMENTATION

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Backend - Análisis Detallado](#backend---análisis-detallado)
4. [Frontend - Análisis Detallado](#frontend---análisis-detallado)
5. [Base de Datos](#base-de-datos)
6. [Arquitectura y Patrones de Diseño](#arquitectura-y-patrones-de-diseño)
7. [Seguridad y Autenticación](#seguridad-y-autenticación)
8. [Configuración y Despliegue](#configuración-y-despliegue)
9. [Funcionalidades Implementadas](#funcionalidades-implementadas)
10. [Estado Actual y Métricas](#estado-actual-y-métricas)
11. [Código Legacy](#código-legacy)
12. [Mejores Prácticas y Observaciones](#mejores-prácticas-y-observaciones)

---

## Resumen Ejecutivo

**Servinow** es una aplicación web full-stack diseñada para gestión empresarial con enfoque en impacto social. El eslogan de la aplicación es: *"Servir es el único negocio donde todos ganan"*.

La aplicación gestiona productos, servicios, facturación, citas/turnos, estadísticas y un muro social para donaciones/testimonios. El proyecto está compuesto por:

- **Backend**: API REST construida con FastAPI (Python 3.11+)
- **Frontend**: Aplicación React 18 con Vite 5
- **Base de Datos**: PostgreSQL 15 con SQLAlchemy 2.0 (async)
- **Contenedores**: Docker + Docker Compose para despliegue

### Estado Actual del Proyecto

| Módulo | Backend API | Frontend UI | Estado |
|--------|-------------|-------------|--------|
| Auth | ✅ Completo | ✅ Completo | Implementado |
| Wall | ✅ Completo | ✅ Completo | Implementado |
| Products | ❌ Stub | ✅ Completo (mock data) | Parcial |
| Services | ❌ Stub | ✅ Completo (mock data) | Parcial |
| Billing | ❌ Stub | ✅ Completo (mock data) | Parcial |
| Agenda | ❌ Stub | ✅ Completo (mock data) | Parcial |
| Statistics | ❌ Stub | ✅ Completo (mock data) | Parcial |
| Market | ❌ Stub | ✅ Completo (mock data) | Parcial |
| Profile | ✅ (via auth) | ✅ Completo | Implementado |

---

## Estructura del Proyecto

```
Servinow/
├── Backend/                          # API REST - FastAPI + Python
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # Punto de entrada FastAPI
│   │   ├── core/                     # Configuración central
│   │   │   ├── config.py             # Pydantic Settings
│   │   │   ├── exceptions.py         # Excepciones custom + handlers
│   │   │   └── security.py           # JWT + bcrypt utilities
│   │   ├── db/                       # Capa de base de datos
│   │   │   ├── base.py               # Registro de modelos para Alembic
│   │   │   ├── base_class.py         # SQLAlchemy DeclarativeBase
│   │   │   └── session.py            # Gestión de sesiones async
│   │   ├── modules/                  # Módulos feature (arquitectura modular)
│   │   │   ├── auth/                 # Módulo de autenticación (COMPLETO)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py         # User model (SQLAlchemy)
│   │   │   │   ├── schemas.py        # UserCreate, UserResponse, TokenResponse, etc.
│   │   │   │   ├── crud.py           # get_user_by_email, create_user, update_user, etc.
│   │   │   │   ├── router.py         # Endpoints: /register, /login, /me, /me/avatar
│   │   │   │   └── deps.py           # get_current_user dependency
│   │   │   ├── wall/                 # Módulo de muro social (COMPLETO)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py         # WallPost, Comment (SQLAlchemy)
│   │   │   │   ├── schemas.py        # PostCreate, PostResponse, CommentCreate, etc.
│   │   │   │   ├── crud.py           # CRUD operations para posts y comments
│   │   │   │   └── router.py         # Endpoints + WebSocket /ws/wall
│   │   │   ├── agenda/               # Stub (vacío - solo __init__.py)
│   │   │   ├── billing/              # Stub (vacío - solo __init__.py)
│   │   │   └── products/             # Stub (vacío - solo __init__.py)
│   │   └── shared/                   # Schemas compartidos
│   ├── alembic/                      # Migraciones de base de datos
│   │   ├── versions/
│   │   │   ├── 9693c1c7cbdc_create_users_table.py
│   │   │   ├── 7059b6e65061_add_avatar_url_to_users.py
│   │   │   ├── ad3dea62b861_create_wall_posts_and_comments_tables.py
│   │   │   └── 880556632e90_add_media_and_edited_fields_to_wall.py
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── uploads/                      # Archivos subidos por usuarios
│   │   ├── avatars/                  # Avatares de usuario
│   │   └── wall/                     # Multimedia de posts
│   ├── tests/                        # Suite de pruebas
│   │   ├── conftest.py               # Fixtures (SQLite async para tests)
│   │   └── test_main.py             # Tests de health check
│   ├── .env                          # Variables de entorno
│   ├── .env.example                  # Template de variables
│   ├── alembic.ini                   # Configuración Alembic
│   ├── docker-compose.yml            # PostgreSQL + servicio web
│   ├── Dockerfile                    # Build multi-stage Python
│   ├── pyproject.toml                # Configuración pytest
│   └── requirements.txt              # Dependencias Python
│
├── Frontend/                         # Aplicación React + Vite
│   ├── src/
│   │   ├── main.jsx                  # Entry point React
│   │   ├── App.jsx                   # Componente principal + rutas
│   │   ├── config/
│   │   │   └── appConfig.js          # Configuración de la app
│   │   ├── store/
│   │   │   └── useStore.js           # Zustand store (state management)
│   │   ├── utils/
│   │   │   ├── api.js                # Funciones helpers de API
│   │   │   ├── apiClient.js          # Cliente API completo con auth
│   │   │   ├── helpers.js            # Utilidades varias
│   │   │   ├── useWallSockets.js     # Hook para WebSocket del wall
│   │   │   └── mockData.js           # Datos mock para desarrollo
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── DashboardLayout.jsx
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── LandingFooter.jsx
│   │   │   │   ├── LandingNav.jsx
│   │   │   │   ├── ProtectedRoute.jsx
│   │   │   │   └── Sidebar.jsx
│   │   │   └── ui/
│   │   │       ├── ImageCropperModal.jsx
│   │   │       ├── Modal.jsx
│   │   │       ├── Table.jsx
│   │   │       └── Toast.jsx
│   │   └── modules/                  # Módulos de páginas/funcionalidades
│   │       ├── Agenda/
│   │       │   └── Agenda.jsx         (UI completa con mock data)
│   │       ├── Auth/
│   │       │   ├── Login.jsx
│   │       │   ├── Register.jsx
│   │       │   └── Unauthorized.jsx
│   │       ├── Billing/
│   │       │   └── Billing.jsx         (UI completa con mock data)
│   │       ├── Dashboard/
│   │       │   └── Dashboard.jsx       (UI completa con mock data)
│   │       ├── Landing/
│   │       │   └── Landing.jsx         (UI completa)
│   │       ├── Market/
│   │       │   └── Market.jsx          (UI completa con mock data)
│   │       ├── Products/
│   │       │   └── Products.jsx        (UI completa con mock data)
│   │       ├── Profile/
│   │       │   └── Profile.jsx          (UI completa)
│   │       ├── Services/
│   │       │   └── Services.jsx        (UI completa con mock data)
│   │       ├── Statistics/
│   │       │   └── Statistics.jsx       (UI completa con mock data)
│   │       └── Wall/
│   │           ├── Wall.jsx            (UI completa, интегрирован с WebSocket)
│   │           └── useWallSockets.js    (Custom hook para WebSocket)
│   ├── css/                          # Estilos CSS (plain CSS)
│   │   ├── animations.css
│   │   ├── base.css
│   │   ├── components.css
│   │   ├── layout.css
│   │   ├── reset.css
│   │   ├── utilities.css
│   │   ├── variables.css
│   │   └── pages/
│   │       ├── agenda.css, auth.css, billing.css, dashboard.css
│   │       ├── landing.css, products.css, profile.css, statistics.css
│   │       └── wall.css
│   ├── js/                           # Versión legacy (vanilla JS)
│   ├── assets/
│   │   ├── icons/
│   │   ├── images/
│   │   └── logo/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── dist/                         # Build de producción
│
├── SERVINOW_CONTEXT.md               # Este documento
└── docker-compose.yml               # En la raíz (en desuso, usar Backend/)
```

---

## Backend - Análisis Detallado

### Stack Tecnológico

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | FastAPI | 0.110+ |
| Servidor | Uvicorn | 0.27+ |
| Base de Datos | PostgreSQL | 15 |
| ORM | SQLAlchemy | 2.0+ (async) |
| Driver DB | asyncpg | 0.29+ |
| Migraciones | Alembic | 1.13+ |
| Validación | Pydantic | 2.5+ |
| Settings | pydantic-settings | 2.1+ |
| Hashing | bcrypt | 4.0+ |
| JWT | python-jose | 3.3+ |
| Testing | pytest | 8.0+ |
| Lenguaje | Python | 3.11+ |

### Dependencias (requirements.txt)

```
fastapi>=0.110.0,<1.0.0
uvicorn[standard]>=0.27.0,<1.0.0
python-multipart>=0.0.9,<1.0.0
sqlalchemy[asyncio]>=2.0.0,<3.0.0
asyncpg>=0.29.0,<1.0.0
alembic>=1.13.0,<2.0.0
pydantic>=2.5.0,<3.0.0
pydantic-settings>=2.1.0,<3.0.0
bcrypt>=4.0.0,<5.0.0
python-jose[cryptography]>=3.3.0,<4.0.0
pytest>=8.0.0,<9.0.0
pytest-asyncio>=0.23.0,<1.0.0
httpx>=0.27.0,<1.0.0
aiosqlite>=0.20.0,<1.0.0
python-dotenv>=1.0.0,<2.0.0
```

### Variables de Entorno (.env)

```env
# Database
POSTGRES_USER=servinow_user
POSTGRES_PASSWORD=servinow_secret_password
POSTGRES_DB=servinow_db
POSTGRES_HOST=db
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://servinow_user:servinow_secret_password@db:5432/servinow_db

# Security
SECRET_KEY=<random-long-string-aqui>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# App
APP_NAME=Servinow API
APP_VERSION=0.1.0
DEBUG=True
```

### Punto de Entrada (app/main.py)

El archivo `main.py` configura la aplicación FastAPI con:
- Configuración de CORS
- Include del router de autenticación en `/api/v1`
- Include del router del wall en `/api/v1`
- Montaje de archivos estáticos para `/uploads`
- Handler global de excepciones
- Endpoint de salud (`/health`)

### Arquitectura Modular (app/modules/)

El backend sigue una **arquitectura modular monolith**. Cada módulo tiene su propia estructura interna:

```
module/
├── __init__.py
├── models.py        # Modelos ORM de SQLAlchemy
├── schemas.py       # Schemas Pydantic (request/response)
├── crud.py         # Operaciones de base de datos
├── router.py       # Rutas/endpoints FastAPI
└── deps.py         # Dependencies de FastAPI (para auth)
```

### Módulos Implementados

#### Auth Module (COMPLETO)
- **models.py**: User model con campos: id (UUID), email, hashed_password, full_name, role, is_active, created_at, avatar_url
- **schemas.py**: UserCreate, UserLogin, UserResponse, UserUpdateMe, TokenResponse
- **crud.py**: get_user_by_email, get_user_by_id, create_user, update_user, delete_user, deactivate_user
- **router.py**: 6 endpoints + 1 dependencia get_current_user
- **deps.py**: Dependency para extraer usuario actual del JWT

#### Wall Module (COMPLETO)
- **models.py**: WallPost (UUID, author_id, content, type, media_url, media_type, is_edited, created_at, updated_at) y Comment (UUID, post_id, author_id, content, is_edited, created_at, updated_at)
- **schemas.py**: PostCreate, PostUpdate, PostResponse, CommentCreate, CommentUpdate, CommentResponse
- **crud.py**: get_posts, get_post, create_post, update_post, delete_post, create_comment, get_comment, update_comment, delete_comment
- **router.py**: 10 endpoints + WebSocket /ws/wall con ConnectionManager para broadcast en tiempo real
- **Dependencias**: Solamente get_current_user (no requiere deps.py separado, reutiliza auth.deps)

### Módulos Stub (Solo __init__.py)
- `agenda/` - Vacío, preparado para implementación de calendario/citas
- `billing/` - Vacío, preparado para sistema de facturación
- `products/` - Vacío, preparado para CRUD de productos

### Endpoints API

**Base URL**: `/api/v1`

#### Auth Endpoints
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Registrar nuevo usuario |
| POST | `/auth/login` | No | Login, retorna JWT con user data |
| GET | `/auth/me` | Sí | Obtener usuario actual |
| PATCH | `/auth/me` | Sí | Actualizar perfil del usuario |
| DELETE | `/auth/me?permanent=true/false` | Sí | Desactivar o eliminar cuenta |
| POST | `/auth/me/avatar` | Sí | Subir imagen de avatar (max 2MB, jpg/png/gif/webp) |

#### Wall Endpoints
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/wall` | Sí | Listar posts (paginación: skip, limit) |
| POST | `/wall` | Sí | Crear post (con broadcast WebSocket) |
| PATCH | `/wall/{post_id}` | Sí | Editar post (autor o admin) |
| DELETE | `/wall/{post_id}` | Sí | Eliminar post (autor o admin) |
| POST | `/wall/{post_id}/comments` | Sí | Crear comentario |
| PATCH | `/wall/{post_id}/comments/{comment_id}` | Sí | Editar comentario |
| DELETE | `/wall/{post_id}/comments/{comment_id}` | Sí | Eliminar comentario |
| GET | `/wall/users/search?q=` | Sí | Buscar usuarios para menciones |
| POST | `/wall/upload` | Sí | Subir archivo multimedia |
| WS | `/wall/ws/wall` | Sí | WebSocket para eventos en tiempo real |

#### Other Endpoints
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check con ping a DB |
| GET | `/uploads/{path}` | No | Servir archivos subidos (estático) |

### Flujo de Autenticación

1. **Registro** (`POST /auth/register`):
   - Recibe: `{email, password, full_name, role}`
   - Valida email único
   - Hashea password con bcrypt
   - Crea usuario en DB
   - Retorna: `{id, email, full_name, role, ...}`

2. **Login** (`POST /auth/login`):
   - Recibe: `{email, password}`
   - Busca usuario por email
   - Verifica password con bcrypt
   - Genera JWT con payload: `{sub: user_id, email, role}`
   - Retorna: `{access_token, token_type: "bearer", user: {...}}`

3. **Get Current User** (`GET /auth/me`):
   - Extrae token del header `Authorization: Bearer <token>`
   - Decodifica JWT con SECRET_KEY
   - Busca usuario en DB
   - Retorna datos del usuario

### Gestión de Avatares

- Endpoint: `POST /api/v1/auth/me/avatar`
- Acepta: `multipart/form-data` con campo `file`
- Tipos permitidos: image/jpeg, image/png, image/gif, image/webp
- Tamaño máximo: 2MB
- Guarda en: `uploads/avatars/{user_id}/{uuid}.{ext}`
- Serve estático: `GET /uploads/avatars/{user_id}/{filename}`

### WebSocket - Wall en Tiempo Real

El módulo wall implementa un sistema de eventos en tiempo real via WebSocket:

**ConnectionManager**: Clase que maneja conexiones WebSocket y broadcast
- `connect(websocket)`: Acepta conexión y la agrega al pool
- `disconnect(websocket)`: Remueve conexión del pool
- `broadcast(message)`: Envía mensaje JSON a todos los clientes conectados

**Eventos broadcast**:
- `new_post`: Nuevo post creado
- `post_updated`: Post editado
- `post_deleted`: Post eliminado
- `new_comment`: Nuevo comentario
- `comment_updated`: Comentario editado
- `comment_deleted`: Comentario eliminado

**Frontend Hook** (`useWallSockets.js`):
- Hook personalizado que conecta al WebSocket
- Recibe callbacks para cada tipo de evento
- Reconexión automática al perder conexión

### Manejo de Errores

El archivo `app/core/exceptions.py` define:
- `CredentialsException` - Para token inválido (401)
- `UserAlreadyExistsException` - Para email duplicado (409)
- `UserNotFoundException` - Para usuario no encontrado (404)
- `UserInactiveException` - Para usuario desactivado (403)
- `BadRequestException` - Para peticiones inválidas (400)
- `ConflictException` - Para conflictos de datos (409)
- `UnauthorizedException` - Para autenticación fallida (401)

Todos tienen handlers en `main.py` que retornan respuestas JSON consistentes.

### Tests

El módulo de tests usa:
- `pytest` + `pytest-asyncio` para tests async
- `httpx.AsyncClient` como client de test
- `aiosqlite` para base de datos en memoria (tests no tocan DB real)
- Fixture `db_session` en `conftest.py` para aislamiento

---

## Frontend - Análisis Detallado

### Stack Tecnológico

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | React | 18.2 |
| Bundler | Vite | 5.0 |
| Router | React Router DOM | 6.20 |
| State Management | Zustand | 4.4 |
| Persistencia | zustand/middleware/persist | - |
| Charts | Chart.js | 4.5 |
| Charts Wrapper | react-chartjs-2 | 5.3 |
| Iconos | Lucide React | 0.300 |
| Image Crop | react-easy-crop | 5.5.7 |
| Real-time | Native WebSocket | - |
| Styling | Plain CSS | - |

### Dependencias (package.json)

```json
{
  "chart.js": "^4.5.1",
  "lucide-react": "^0.300.0",
  "react": "^18.2.0",
  "react-chartjs-2": "^5.3.1",
  "react-dom": "^18.2.0",
  "react-easy-crop": "^5.5.7",
  "react-router-dom": "^6.20.0",
  "zustand": "^4.4.7"
}
```

### Cliente API (src/utils/apiClient.js)

Proporciona una capa de abstracción sobre `fetch` con:
- Base URL configurable (`VITE_API_URL` o fallback localhost)
- Bearer token authentication (automático en todas las requests)
- Auto-logout en respuestas 401 (limpia sesión y redirige)
- Soporte para FormData (file uploads)
- Headers JSON por defecto

**Métodos**:
- `get(endpoint)` - GET request
- `post(endpoint, data)` - POST JSON
- `patch(endpoint, data)` - PATCH JSON
- `delete(endpoint)` - DELETE request
- `requestFormData(endpoint, formData)` - POST multipart/form-data
- `setToken(token)` - Establecer JWT manualmente
- `clearToken()` - Limpiar token (logout)

### Store de Estado (Zustand - src/store/useStore.js)

```javascript
{
  // Theme
  theme: 'light' | 'dark',
  toggleTheme: fn,

  // Layout
  sidebarCollapsed: boolean,

  // Auth
  currentUser: null | {id, email, full_name, role, avatar, avatar_url, token},
  isAuthenticated: boolean,

  // Actions
  login: fn,
  logout: fn,
  setCurrentUser: fn
}
```

Persistencia: Usa middleware `persist` para guardar en localStorage.

### Rutas de la Aplicación (src/App.jsx)

| Path | Component | Auth | Roles |
|------|-----------|------|-------|
| `/` | Landing | No | - |
| `/login` | Login | No | - |
| `/register` | Register | No | - |
| `/unauthorized` | Unauthorized | No | - |
| `/dashboard` | Dashboard | Sí | Todos |
| `/products` | Products | Sí | Todos |
| `/services` | Services | Sí | Todos |
| `/billing` | Billing | Sí | ADMIN, SELLER |
| `/agenda` | Agenda | Sí | Todos |
| `/wall` | Wall | Sí | Todos |
| `/statistics` | Statistics | Sí | ADMIN |
| `/market` | Market | Sí | ADMIN |
| `/profile` | Profile | Sí | Todos |

### Control de Acceso por Roles

- **ADMIN**: Acceso completo a todos los módulos
- **SELLER**: Puede gestionar productos/servicios, facturación. No acceso a statistics/market
- **CLIENT**: Solo lectura de productos/servicios, puede ver wall y agendar citas

### Componentes UI

#### Table.jsx
- Búsqueda
- Ordenamiento por columnas
- Paginación
- Estado vacío personalizable

#### Modal.jsx
- Portal-based rendering
- Cierre con tecla Escape
- Acciones configurables (footer buttons)
- Tamaños: sm, md, lg

#### Toast.jsx
- Sistema de notificaciones global (mediante Context)
- Tipos: success, error, warning, info
- Auto-dismiss configurable
- Stack de toasts

#### ImageCropperModal.jsx
- Recorte de imagen con zoom y rotación
- Usa `react-easy-crop`
- Ideal para avatares de perfil

### Componentes de Layout

#### DashboardLayout.jsx
- Wrapper para rutas protegidas
- Incluye Sidebar, Header
- Contenido scrollable

#### LandingNav.jsx / LandingFooter.jsx
- Navegación pública para landing page
- Botones de Login/Register

#### ProtectedRoute.jsx
- Verifica autenticación
- Verifica roles autorizados
- Redirect a `/unauthorized` si no tiene acceso

#### Sidebar.jsx
- Navegación lateral fija
- Links a todos los módulos
- Indicador de módulo activo
- Collapse toggle

#### Header.jsx
- Barra superior
- Toggle de tema (light/dark)
- Menú de usuario (profile, logout)
- Toggle sidebar en mobile

### Módulos de Página - Detalles

#### Landing.jsx (COMPLETO)
- Hero section con animación canvas (particles.js)
- Grid de features
- Modelo de impacto social
- Filosofía de la empresa
- Footer con navegación básica

#### Dashboard.jsx (UI Completa - mock data)
- KPIs visuales (tarjetas con iconos)
- Gráfico de líneas (ventas)
- Gráfico de dona (distribución)
- Feed de actividad (mock)
- Quick actions

#### Products.jsx (UI Completa - mock data)
- Lista de productos con mock data local
- Vistas Grid/Table toggle
- CRUD local (setState) - NO persiste en backend
- Badges de estado (active/inactive/out_of_stock)
- Filtrado por categoría y estado
- Modal de creación/edición

#### Services.jsx (UI Completa - mock data)
- Similar a Products
- Campos adicionales: duración, categoría
- Mismo CRUD local con mock data

#### Billing.jsx (UI Completa - mock data)
- Tabla de facturas (mock)
- Cards de resumen (ingresos, pendientes, etc.)
- Filtrado por estado (mock)
- Sin conexión a backend

#### Agenda.jsx (UI Completa - mock data)
- Vista de calendario (Grid mensual)
- Panel de detalle del día
- Estados de citas (confirmada, pendiente, cancelada)
- Datos completamente mockeados

#### Wall.jsx (COMPLETO - integrado con backend)
- Feed de posts desde API `/api/v1/wall`
- Sistema de comentarios
- Compositor de posts (texto + multimedia)
- Upload de archivos multimedia
- Tipos: donation, testimony, impact
- WebSocket para updates en tiempo real
- Edición y eliminación (autor o admin)
- Menciones de usuarios

#### Statistics.jsx (UI Completa - mock data)
- Gráfico de barras (ingresos por mes)
- Gráfico de dona (distribución por categoría)
- Top productos ranking
- Sugerencias inteligentes (mock AI)
- Filtro de período (mock)

#### Market.jsx (UI Completa - mock data)
- Tabla comparativa de competidores
- Insights de mercado
- Datos completamente mockeados

#### Profile.jsx (COMPLETO - parcialmente via backend)
- Upload de avatar con crop (usa `/auth/me/avatar`)
- Edición de perfil (usa `/auth/me` PATCH)
- Cambio de password (preparado pero no implementado)
- Eliminación de cuenta (usa `/auth/me` DELETE)

### Sistema de Temas

- Light/Dark mode
- Toggle desde Header
- CSS custom properties (variables CSS)
- Persistencia en localStorage (via Zustand persist)
- Cambio dinámico de `data-theme` attribute en `<html>`

---

## Base de Datos

### Motor
PostgreSQL 15 (contenedorizado via Docker en docker-compose.yml del Backend)

### ORM
SQLAlchemy 2.0 con soporte async completo (asyncpg como driver)

### Migraciones
Alembic para versionar cambios de schema

### Schema: Tabla Users

| Columna | Tipo | Constraints |
|---------|------|-------------|
| id | UUID | PRIMARY KEY, server-generated |
| email | VARCHAR(255) | UNIQUE, NOT NULL, indexed |
| hashed_password | VARCHAR(255) | NOT NULL |
| full_name | VARCHAR(150) | NOT NULL |
| role | VARCHAR(20) | NOT NULL, default='client' |
| is_active | BOOLEAN | NOT NULL, default=TRUE |
| created_at | TIMESTAMP WITH TZ | NOT NULL, server default=now() |
| avatar_url | VARCHAR(500) | NULLABLE |

### Schema: Tabla WallPosts

| Columna | Tipo | Constraints |
|---------|------|-------------|
| id | UUID | PRIMARY KEY, server-generated |
| author_id | UUID | FOREIGN KEY -> users.id, NOT NULL |
| content | TEXT | NOT NULL |
| type | VARCHAR(20) | NOT NULL (donation/testimony/impact) |
| media_url | VARCHAR(500) | NULLABLE |
| media_type | VARCHAR(50) | NULLABLE |
| is_edited | BOOLEAN | NOT NULL, default=FALSE |
| created_at | TIMESTAMP WITH TZ | NOT NULL, server default=now() |
| updated_at | TIMESTAMP WITH TZ | NOT NULL, server default=now() |

### Schema: Tabla Comments

| Columna | Tipo | Constraints |
|---------|------|-------------|
| id | UUID | PRIMARY KEY, server-generated |
| post_id | UUID | FOREIGN KEY -> wall_posts.id, NOT NULL |
| author_id | UUID | FOREIGN KEY -> users.id, NOT NULL |
| content | TEXT | NOT NULL |
| is_edited | BOOLEAN | NOT NULL, default=FALSE |
| created_at | TIMESTAMP WITH TZ | NOT NULL, server default=now() |
| updated_at | TIMESTAMP WITH TZ | NOT NULL, server default=now() |

### Migraciones Existentes

1. `9693c1c7cbdc_create_users_table.py` - Crea tabla users
2. `7059b6e65061_add_avatar_url_to_users.py` - Añade columna avatar_url
3. `ad3dea62b861_create_wall_posts_and_comments_tables.py` - Crea wall_posts y comments
4. `880556632e90_add_media_and_edited_fields_to_wall.py` - Añade media_url, media_type, is_edited, updated_at

---

## Arquitectura y Patrones de Diseño

### Backend

**Patrón**: Clean Architecture adaptada a módulo feature

```
Router (endpoint FastAPI)
  → Schemas (validación Pydantic)
    → CRUD (operaciones DB)
      → Models (SQLAlchemy ORM)
        → Session (conexión DB async)
```

**Características**:
- Async completo en todas las operaciones de DB
- Dependency Injection via FastAPI `Depends()`
- Manejo centralizado de excepciones
- Arquitectura modular por feature
- WebSocket con ConnectionManager pattern

### Frontend

**Patrón**: Feature-based folder structure con componentes reutilizables

```
modules/{Feature}/
  → {Feature}.jsx (página/componente principal)
  → {Feature}Sockets.js (hooks de WebSocket si aplica)

components/
  → layout/ (componentes de estructura)
  → ui/ (componentes UI genéricos)
```

**State Management**: Zustand con:
- Estado global para auth y theme
- Persistencia en localStorage
- Acceso simple desde cualquier componente
- Middleware de persistência configurado

---

## Seguridad y Autenticación

### Backend

1. **Password Hashing**: bcrypt con salt automático
2. **JWT Tokens**:
   - Algoritmo: HS256
   - Payload: `{sub: user_id, email: email, role: role}`
   - Expiración: 30 minutos (configurable via ACCESS_TOKEN_EXPIRE_MINUTES)
3. **OAuth2PasswordBearer**: Esquema de autenticación para Swagger UI
4. **Validación de Usuarios Inactivos**: usuarios con `is_active=false` reciben 403
5. **CORS**: Orígenes configurables para permitir solo Frontend en desarrollo
6. **Validación de Archivos**: Tipos MIME y tamaño máximo para uploads

### Frontend

1. **Token Storage**: Guardado en Zustand store (persisted en localStorage)
2. **Auto-logout**: Detecta respuestas 401 y limpia sesión automáticamente
3. **Protected Routes**: Componente `ProtectedRoute` verifica auth y roles
4. **API Client**: Incluye token automáticamente en todas las requests
5. **FormData para uploads**: Envío correcto de archivos binarios

---

## Configuración y Despliegue

### Docker Compose (Backend/docker-compose.yml)

```yaml
services:
  db:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    volumes: postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: servinow_user
      POSTGRES_PASSWORD: servinow_secret_password
      POSTGRES_DB: servinow_db
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U servinow_user"]
      interval: 5s
      timeout: 5s
      retries: 5

  web:
    build: .
    ports: ["8000:8000"]
    env_file: .env
    volumes: [".:/app"]
    depends_on: condition: service_healthy
```

### Dockerfile

Build multi-stage:
1. **Stage 1 (dependencies)**: Instala dependencias en image python:3.11-slim
2. **Stage 2 (application)**: Copia solo dependencias necesarias y código

### Desarrollo Local

1. **Backend**:
   - `cd Backend && source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
   - O usar Docker: `cd Backend && docker-compose up --build`
   - Migraciones: `alembic upgrade head`

2. **Frontend**:
   - `cd Frontend && npm install && npm run dev` (corre en http://localhost:5173)
   - O pre-build: `npm run build` (genera dist/)

---

## Funcionalidades Implementadas

### ✅ Módulo de Autenticación (COMPLETO)
- Registro de usuarios
- Login con JWT
- Ver perfil actual
- Actualización de perfil (full_name, email, avatar_url)
- Eliminación de cuenta (soft delete y hard delete)
- Upload de avatar con validación de tipo y tamaño

### ✅ Módulo Wall (COMPLETO)
- CRUD completo de posts
- CRUD completo de comentarios
- Tipos de post: donation, testimony, impact
- Multimedia upload (imágenes y documentos)
- Sistema WebSocket para tiempo real
- Búsqueda de usuarios para menciones
- Indicador de post/comment editado
- Permisos por rol (autor o admin puede editar/eliminar)

### ✅ Landing Page (COMPLETO)
- Animación de partículas con Canvas
- Sección hero con eslogan
- Grid de features
- Modelo de impacto social
- Filosofía de la empresa
- Footer

### ✅ Dashboard (UI Completa)
- KPIs visuales
- Gráfico de líneas (ventas)
- Gráfico de dona (distribución)
- Feed de actividad
- Quick actions

### ⚠️ Gestión de Productos (UI Completa, API Stub)
- Lista de productos
- Vistas Grid/Table
- Badges de estado
- Filtrado por estado y categoría
- CRUD local (no persiste en backend)
- Datos: mockData.products

### ⚠️ Gestión de Servicios (UI Completa, API Stub)
- Lista de servicios
- Campos de duración y categoría
- Similar a productos (mismo CRUD local)

### ⚠️ Facturación (UI Completa, Datos Mock)
- Tabla de facturas
- Cards de resumen
- Filtrado por estado
- Sin conexión a backend real

### ⚠️ Agenda (UI Completa, Datos Mock)
- Vista de calendario
- Panel de detalle del día
- Estados de citas
- Sin conexión a backend real

### ⚠️ Estadísticas (UI Completa, Datos Mock)
- Gráfico de barras (ingresos por mes)
- Gráfico de dona (categorías)
- Top productos ranking
- Sugerencias inteligentes (mock)
- Sin conexión a backend real

### ⚠️ Market (UI Completa, Datos Mock)
- Tabla comparativa de competidores
- Insights de mercado
- Sin conexión a backend real

### ✅ Perfil de Usuario (COMPLETO)
- Upload de avatar con crop (integra con backend)
- Edición de nombre y email
- Eliminación de cuenta (integra con backend)

### ✅ Sistema de Temas
- Light/Dark mode
- Toggle desde Header
- CSS variables para theming
- Persistencia en localStorage

---

## Estado Actual y Métricas

### Completitud por Módulo

```
Backend API:
  ✅ auth     - 100% (6 endpoints + deps)
  ✅ wall     - 100% (10 endpoints + WebSocket)
  ⚠️ agenda   - 0% (stub vacío)
  ⚠️ billing  - 0% (stub vacío)
  ⚠️ products - 0% (stub vacío)

Frontend UI:
  ✅ Landing    - 100%
  ✅ Auth       - 100%
  ✅ Dashboard  - 100% (mock)
  ✅ Wall       - 100% (conectado a API)
  ✅ Products   - 100% (mock)
  ✅ Services   - 100% (mock)
  ✅ Billing    - 100% (mock)
  ✅ Agenda     - 100% (mock)
  ✅ Statistics - 100% (mock)
  ✅ Market     - 100% (mock)
  ✅ Profile    - 100%

Overall Project Progress: ~45-50%
  - Backend completo: 2/5 módulos = 40%
  - Frontend completo: 11/11 módulos = 100% (pero datos mock en 6)
```

### Archivos por Tecnología

| Tecnología | Backend | Frontend |
|------------|---------|----------|
| Python (.py) | ~25 | 0 |
| JavaScript (.jsx) | 0 | ~30 |
| CSS (.css) | 0 | ~15 |
| Config | requirements.txt, docker-compose.yml, etc. | package.json, vite.config.js |

### Líneas de Código Aproximadas

| Componente | Líneas | Notas |
|------------|--------|-------|
| Backend auth module | ~400 | Completo |
| Backend wall module | ~600 | Completo + WebSocket |
| Backend core | ~200 | Config, security, exceptions |
| Frontend modules | ~2500 | 11 módulos React |
| Frontend components | ~1000 | Layout + UI components |
| CSS | ~3000 | 15 archivos |
| **Total** | ~7700 | - |

---

## Código Legacy

### Versión Vanilla JS (Frontend/js/)

El directorio `Frontend/js/` contiene una versión legacy del frontend escrita en JavaScript vanilla (sin React). Esta fue probablemente la primera implementación antes de la migración a React.

**Componentes**:
- `chart.js` - Wrapper para Chart.js
- `modal.js` - Sistema de modales
- `navbar.js` - Navegación superior
- `sidebar.js` - Navegación lateral
- `table.js` - Tabla genérica
- `toast.js` - Sistema de notificaciones

**Utilidades**:
- `helpers.js` - Funciones helper
- `mockData.js` - Datos de prueba
- `storage.js` - Wrapper para localStorage

**Archivos de estilos**: Los mismos CSS pero sin la estructura de componentes React.

Esta versión legacy está desactivada y no se mantiene. El proyecto actual usa React + Vite.

---

## Mejores Prácticas y Observaciones

### ✅ Backend - Mejores Prácticas

- Uso extensivo de schemas Pydantic para validación de entrada/salida
- Async completo en toda la capa de base de datos (SQLAlchemy 2.0 async)
- Migraciones de base de datos con Alembic
- Separation of concerns clara (modules: models, schemas, crud, router)
- Manejo centralizado de excepciones con tipos custom
- Tests unitarios con fixtures aislados (SQLite in-memory)
- Seguridad: bcrypt para passwords, JWT con expiración
- Validación de archivos en upload (tipo MIME y tamaño)
- WebSocket con ConnectionManager pattern

### ⚠️ Backend - Observaciones

1. **Módulos stub**: agenda, billing, products están vacíos y deben implementarse
2. **No hay tests de integración**: Solo test de health check
3. **No hay rate limiting**: Vulnerable a ataques de fuerza bruta en /auth/login
4. **No hay logging centralizado**: Difícil auditoría y debugging
5. **No hay validación de schemas en todos los endpoints**: Algunos podrían fallar silenciosamente

### ✅ Frontend - Mejores Prácticas

- Componentes funcionalmente separados por responsabilidad
- Estado centralizado con Zustand (más simple que Redux)
- API client abstracto que maneja auth y errores automáticamente
- Protected routes con verificación de roles
- CSS custom properties para theming (escalable)
- Code splitting implícito en módulos (lazy loading)
- Custom hooks para lógica reutilizable (useWallSockets)
- Responsive design preparado

### ⚠️ Frontend - Observaciones

1. **Datos mock**: 6 de 11 módulos usan mock data en lugar de API real
2. **No hay gestión de errores global**: Cada componente maneja errores independientemente
3. **No hay loading states consistentes**: Algunos módulos no muestran estados de carga
4. **No hay cache de datos**: Cada fetch va directamente al servidor
5. **Legacy code**: Hay código vanilla JS legacy que debería eliminarse

### 🔧 Recomendaciones de Prioridad

1. **Alta Prioridad**:
   - Implementar módulos stub del backend (products, billing, agenda)
   - Conectar frontend a API real para products/services
   - Agregar tests de integración

2. **Media Prioridad**:
   - Implementar logging centralizado
   - Agregar rate limiting en auth endpoints
   - Mejorar gestión de errores global en frontend
   - Eliminar código legacy (Frontend/js/)

3. **Baja Prioridad**:
   - Cache de datos en frontend
   - Loading states consistentes
   - Internacionalización (i18n)

---

## Resumen de Puertos y URLs

| Servicio | Puerto | URL |
|----------|--------|-----|
| Backend API | 8000 | http://localhost:8000 |
| Backend Docs (Swagger) | 8000 | http://localhost:8000/docs |
| Frontend Dev | 5173 | http://localhost:5173 |
| PostgreSQL | 5432 | localhost:5432 (container: db) |

---

*Documento generado automáticamente para contexto del proyecto Servinow*
*Última actualización: Mayo 2026*
*Versión del documento: 2.0*
