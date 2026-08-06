# DONAPP PROJECT - CONTEXT DOCUMENTATION

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
10. [Código Legacy](#código-legacy)

---

## Resumen Ejecutivo

**DonApp** es una aplicación web full-stack diseñada para gestión empresarial con enfoque en impacto social. El eslogan de la aplicación es: *"Servir es el único negocio donde todos ganan"*.

La aplicación gestiona productos, servicios, facturación, citas/turnos, estadísticas y un muro social para donaciones/testimonios. El proyecto está compuesto por:

- **Backend**: API REST construida con FastAPI (Python 3.11+)
- **Frontend**: Aplicación React 18 con Vite 5
- **Base de Datos**: PostgreSQL 15 con SQLAlchemy 2.0 (async)
- **Contenedores**: Docker + Docker Compose para despliegue

---

## Estructura del Proyecto

```
DonApp/
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
│   │   │   ├── auth/                 # Módulo de autenticación
│   │   │   ├── agenda/               # Módulo de agenda/citas (stub)
│   │   │   ├── billing/              # Módulo de facturación (stub)
│   │   │   ├── products/             # Módulo de productos (stub)
│   │   │   └── wall/                 # Módulo de muro social (stub)
│   │   └── shared/                   # Schemas compartidos
│   ├── alembic/                      # Migraciones de base de datos
│   │   ├── versions/
│   │   │   ├── 9693c1c7cbdc_create_users_table.py
│   │   │   └── 7059b6e65061_add_avatar_url_to_users.py
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── uploads/                      # Archivos subidos por usuarios
│   │   └── avatars/
│   ├── .env                          # Variables de entorno
│   ├── .env.example                  # Template de variables
│   ├── alembic.ini                   # Configuración Alembic
│   ├── docker-compose.yml            # PostgreSQL + servicio web
│   ├── Dockerfile                    # Build multi-stage Python
│   ├── pyproject.toml                # Configuración pytest
│   ├── requirements.txt              # Dependencias Python
│   └── tests/                        # Suite de pruebas
│       ├── conftest.py               # Fixtures (SQLite async para tests)
│       └── test_main.py             # Tests de health check
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
│   │       │   └── Agenda.jsx
│   │       ├── Auth/
│   │       │   ├── Login.jsx
│   │       │   ├── Register.jsx
│   │       │   └── Unauthorized.jsx
│   │       ├── Billing/
│   │       │   └── Billing.jsx
│   │       ├── Dashboard/
│   │       │   └── Dashboard.jsx
│   │       ├── Landing/
│   │       │   └── Landing.jsx
│   │       ├── Market/
│   │       │   └── Market.jsx
│   │       ├── Products/
│   │       │   └── Products.jsx
│   │       ├── Profile/
│   │       │   └── Profile.jsx
│   │       ├── Services/
│   │       │   └── Services.jsx
│   │       ├── Statistics/
│   │       │   └── Statistics.jsx
│   │       └── Wall/
│   │           └── Wall.jsx
│   ├── css/                          # Estilos CSS (plain CSS, pre-Vite)
│   │   ├── animations.css
│   │   ├── base.css
│   │   ├── components.css
│   │   ├── layout.css
│   │   ├── reset.css
│   │   ├── utilities.css
│   │   ├── variables.css
│   │   └── pages/
│   │       ├── agenda.css
│   │       ├── auth.css
│   │       ├── billing.css
│   │       ├── dashboard.css
│   │       ├── landing.css
│   │       ├── products.css
│   │       ├── profile.css
│   │       ├── statistics.css
│   │       └── wall.css
│   ├── js/                           # Versión legacy (vanilla JS)
│   │   ├── app.js
│   │   ├── config.js
│   │   ├── components/
│   │   │   ├── chart.js
│   │   │   ├── modal.js
│   │   │   ├── navbar.js
│   │   │   ├── sidebar.js
│   │   │   ├── table.js
│   │   │   └── toast.js
│   │   └── utils/
│   │       ├── helpers.js
│   │       ├── mockData.js
│   │       └── storage.js
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
├── docker-compose.yml                # En la raíz
└── (otros archivos de raíz del repo)
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
APP_NAME=DonApp API
APP_VERSION=0.1.0
DEBUG=True
```

### Punto de Entrada (app/main.py)

El archivo `main.py` configura la aplicación FastAPI con:
- Configuración de CORS
- Include del router de autenticación en `/api/v1`
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
├── crud.py          # Operaciones de base de datos
├── router.py        # Rutas/endpoints FastAPI
└── deps.py          # Dependencies de FastAPI (para auth)
```

**Módulos implementados:**
- `auth/` - Autenticación completa (registro, login, perfil, avatar)
- `agenda/` - Stub (vacío)
- `billing/` - Stub (vacío)
- `products/` - Stub (vacío)
- `wall/` - Stub (vacío)

### Endpoints API

**Base URL**: `/api/v1`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Registrar nuevo usuario |
| POST | `/auth/login` | No | Login, retorna JWT |
| GET | `/auth/me` | Sí | Obtener usuario actual |
| PATCH | `/auth/me` | Sí | Actualizar perfil del usuario |
| DELETE | `/auth/me?permanent=true/false` | Sí | Desactivar o eliminar cuenta |
| POST | `/auth/me/avatar` | Sí | Subir imagen de avatar |
| GET | `/health` | No | Health check con ping a DB |
| GET | `/uploads/{path}` | No | Servir archivos subidos (estático) |

### Flujo de Autenticación

1. **Registro** (`POST /auth/register`):
   - Recibe: `{email, password, full_name, role}`
   - Valida email único
   - Hashea password con bcrypt
   - Crea usuario en DB
   - Retorna: `{id, email, full_name, role}`

2. **Login** (`POST /auth/login`):
   - Recibe: `{email, password}`
   - Busca usuario por email
   - Verifica password con bcrypt
   - Genera JWT con payload: `{sub: user_id, email, role}`
   - Retorna: `{access_token, token_type: "bearer"}`

3. **Get Current User** (`GET /auth/me`):
   - Extrae token del header `Authorization: Bearer <token>`
   - Decodifica JWT con SECRET_KEY
   - Busca usuario en DB
   - Retorna datos del usuario

### Gestión de Avatares

- Endpoint: `POST /api/v1/auth/me/avatar`
- Acepta: `multipart/form-data` con campo `file`
- Guarda en: `Backend/uploads/avatars/{user_id}_{filename}`
- Serve estático: `GET /api/v1/uploads/avatars/{filename}`

### Manejo de Errores

El archivo `app/core/exceptions.py` define:
- `CredentialsException` - Para token inválido
- `UserAlreadyExistsException` - Para email duplicado
- `UserNotFoundException` - Para usuario no encontrado
- `UserInactiveException` - Para usuario desactivado

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

### Scripts de Build

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint..."
}
```

### Configuración de Vite (vite.config.js)

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

Variable de entorno opcional: `VITE_API_URL=http://localhost:8000/api/v1`

### Cliente API (src/utils/apiClient.js)

Proporciona una capa de abstracción sobre `fetch` con:
- Base URL configurable
- Bearer token authentication (automático)
- Auto-logout en respuestas 401
- Soporte para FormData (file uploads)
- Headers JSON por defecto

**Métodos de autenticación:**
- `register(data)` - POST /auth/register
- `login(email, password)` - POST /auth/login
- `getMe()` - GET /auth/me
- `updateMe(data)` - PATCH /auth/me
- `deleteAccount(permanent)` - DELETE /auth/me
- `uploadAvatar(file)` - POST /auth/me/avatar

### Store de Estado (Zustand - src/store/useStore.js)

```javascript
{
  // Theme
  theme: 'light',
  toggleTheme: fn,

  // Layout
  sidebarCollapsed: false,

  // Auth
  currentUser: null,           // {id, name, email, role, avatar, token}
  isAuthenticated: false,

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
- **SELLER**: Puede gestionar productos/servicios, facturación. No access a statistics/market
- **CLIENT**: Solo lectura de productos/servicios, puede ver wall y agendar citas

### Componentes UI

#### Table.jsx
- Búsqueda
- Ordenamiento
- Paginación
- Estado vacío

#### Modal.jsx
- Portal-based rendering
- Cierre con tecla Escape
- Acciones configurables

#### Toast.jsx
- Sistema de notificaciones global
- Tipos: success, error, warning, info
- Auto-dismiss

#### ImageCropperModal.jsx
- Recorte de imagen con zoom
- Ideal para avatares

### Componentes de Layout

#### DashboardLayout.jsx
- Wrapper para rutas protegidas
- Incluye Sidebar, Header

#### LandingNav.jsx
- Navegación pública
- Botones de Login/Register

#### LandingFooter.jsx
- Footer para páginas públicas

#### ProtectedRoute.jsx
- Verifica autenticación
- Verifica roles autorizados
- Redirect a `/unauthorized` si no tiene acceso

#### Sidebar.jsx
- Navegación lateral
- Links a todos los módulos
- Indicador de módulo activo

#### Header.jsx
- Barra superior
- Toggle de tema
- Menú de usuario

### Módulos de Página

#### Landing.jsx
- Hero section con animación canvas (particles)
- Grid de features
- Modelo de impacto
- Filosofía de la empresa

#### Dashboard.jsx
- KPIs (Key Performance Indicators)
- Gráficos de ventas (Line y Doughnut con Chart.js)
- Feed de actividad
- Acciones rápidas

#### Products.jsx
- Vistas Grid/Table toggle
- CRUD de productos
- Filtrado
- Badges de estado

#### Services.jsx
- Similar a Products
- Campos adicionales: duración, categoría

#### Billing.jsx
- Tabla de facturas
- Filtrado por estado
- Cards de resumen (mock data)

#### Agenda.jsx
- Vista de calendario
- Panel de detalle del día
- Estados de citas

#### Wall.jsx
- Feed social de testimonios
- Reacciones de "thanks"
- Compositor de posts

#### Statistics.jsx
- Gráficos Bar y Doughnut
- Ranking de productos top
- Sugerencias AI (mock)

#### Market.jsx
- Tabla comparativa de competidores
- Insights de mercado

#### Profile.jsx
- Subida de avatar con crop
- Edición de perfil
- Eliminación de cuenta

### Sistema de Temas

Soporte light/dark mode con CSS custom properties (variables CSS):
- Variables en `css/variables.css`
- Toggle en Header
- Cambio dinámico de `data-theme` attribute

---

## Base de Datos

### Motor
PostgreSQL 15 (contenedorizado via Docker)

### ORM
SQLAlchemy 2.0 con soporte async

### Migraciones
Alembic para versionar cambios de schema

### Schema: Tabla Users

| Columna | Tipo | Constraints |
|---------|------|-------------|
| id | UUID | PRIMARY KEY, auto-generated |
| email | VARCHAR(255) | UNIQUE, NOT NULL, indexed |
| hashed_password | VARCHAR(255) | NOT NULL |
| full_name | VARCHAR(150) | NOT NULL |
| role | VARCHAR(20) | NOT NULL, default='client' |
| is_active | BOOLEAN | NOT NULL, default=TRUE |
| created_at | TIMESTAMP WITH TZ | NOT NULL, server default=now() |
| avatar_url | VARCHAR(500) | NULLABLE |

### Roles Posibles

- `admin` - Administrador con acceso total
- `seller` - Vendedor, puede gestionar productos/servicios y facturación
- `client` - Cliente con acceso básico

### Migraciones Existentes

1. `9693c1c7cbdc_create_users_table.py` - Crea tabla users
2. `7059b6e65061_add_avatar_url_to_users.py` - Añade columna avatar_url

---

## Arquitectura y Patrones de Diseño

### Backend

**Patrón**: Clean Architecture adaptada a módulo feature

```
Router (endpoint) 
  → Schemas (validación Pydantic) 
    → CRUD (operaciones DB) 
      → Models (SQLAlchemy ORM) 
        → Session (conexión DB)
```

**Características**:
- Async completo en todas las operaciones de DB
- Dependency Injection via FastAPI `Depends()`
- Manejo centralizado de excepciones
- Arquitectura modular por feature

### Frontend

**Patrón**: Feature-based folder structure con componentes reutilizables

```
modules/{Feature}/
  → {Feature}.jsx (página/componente principal)
  
components/
  → layout/ (componentes de estructura)
  → ui/ (componentes UI genéricos)
```

**State Management**: Zustand con:
- Estado global para auth y theme
- Persistencia en localStorage
- Acceso simple desde cualquier componente

---

## Seguridad y Autenticación

### Backend

1. **Password Hashing**: bcrypt con salt automático
2. **JWT Tokens**:
   - Algoritmo: HS256
   - Payload: `{sub: user_id, email: email, role: role}`
   - Expiración: 30 minutos (configurable)
3. **OAuth2PasswordBearer**: Esquema de autenticación para Swagger UI
4. **Validación de Usuarios Inactivos**: usuarios con `is_active=false` reciben 403
5. **CORS**: Orígenes configurables para permitir solo Frontend en desarrollo

### Frontend

1. **Token Storage**: Guardado en Zustand store (persisted en localStorage)
2. **Auto-logout**: Detecta respuestas 401 y limpia sesión
3. **Protected Routes**: Componente `ProtectedRoute` verifica auth y roles
4. **API Client**: Incluye token automáticamente en todas las requests

---

## Configuración y Despliegue

### Docker Compose

```yaml
services:
  db:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    volumes: postgres_data:/var/lib/postgresql/data
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
    depends_on: db (healthy)
```

### Dockerfile

Build multi-stage:
1. Stage 1: Instala dependencias
2. Stage 2: Copia solo lo necesario (clean image)

### Variables de Entorno Obligatorias

**Backend**:
- `DATABASE_URL` - Connection string de PostgreSQL
- `SECRET_KEY` - Para firmar JWT
- `ALGORITHM` - HS256
- `ACCESS_TOKEN_EXPIRE_MINUTES` - 30
- `CORS_ORIGINS` - Array JSON de orígenes permitidos

**Frontend**:
- `VITE_API_URL` - URL del backend (opcional, fallback a localhost)

### Desarrollo Local

1. **Backend**: 
   - `cd Backend && uvicorn app.main:app --reload`
   - O usar Docker: `docker-compose up`

2. **Frontend**:
   - `cd Frontend && npm install && npm run dev`

---

## Funcionalidades Implementadas

### Módulo de Autenticación (Completo)
- Registro de usuarios
- Login con JWT
- Ver perfil actual
- Actualización de perfil
- Eliminación de cuenta (soft y hard)
- Upload de avatar

### Landing Page (Completo)
- Animación de partículas con Canvas
- Sección hero
- Grid de features
- Modelo de impacto
- Filosofía de la empresa

### Dashboard (Completo)
- KPIs visuales
- Gráfico de líneas (ventas)
- Gráfico de dona (distribución)
- Feed de actividad
- Quick actions

### Gestión de Productos (UI completa, API stub)
- Lista de productos
- Vistas Grid/Table
- Badges de estado
- Filtrado por estado

### Gestión de Servicios (UI completa, API stub)
- Lista de servicios
- Campos de duración y categoría
- Similar a productos

### Facturación (UI completa con datos mock)
- Tabla de facturas
- Cards de resumen
- Filtrado por estado

### Agenda (UI completa con datos mock)
- Vista de calendario
- Panel de detalle
- Estados de citas

### Muro Social/Wall (UI completa con datos mock)
- Feed de testimonios
- Sistema de "thanks"
- Compositor de posts

### Estadísticas (UI completa con datos mock)
- Gráfico de barras
- Gráfico de dona
- Top productos ranking
- Sugerencias AI

### Market (UI completa con datos mock)
- Tabla comparativa
- Insights de mercado

### Perfil de Usuario (Completo)
- Upload de avatar con crop
- Edición de nombre y email
- Cambio de password (preparado)
- Eliminación de cuenta

### Sistema de Temas
- Light/Dark mode
- Toggle desde Header
- CSS variables para theming

---

## Código Legacy

### Versión Vanilla JS (Frontend/js/)

El directorio `Frontend/js/` contiene una versión legacy del frontend escrita en JavaScript vanilla (sin React). Incluye:

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

Esta versión fue probablemente la implementación inicial antes de migrar a React.

---

## Resumen de Puertos y URLs

| Servicio | Puerto | URL |
|----------|--------|-----|
| Backend API | 8000 | http://localhost:8000 |
| Backend Docs | 8000 | http://localhost:8000/docs (Swagger) |
| Frontend Dev | 5173 | http://localhost:5173 |
| PostgreSQL | 5432 | localhost:5432 |

---

## Mejores Prácticas Observadas

### Backend
- ✅ Uso de schemas Pydantic para validación
- ✅ Async en toda la capa de DB
- ✅ Migraciones con Alembic
- ✅ Separation of concerns (modules)
- ✅ Manejo centralizado de errores
- ✅ Tests con fixtures aislados

### Frontend
- ✅ Componentes funcionalmente separados
- ✅ Estado centralizado con Zustand
- ✅ API client abstracto
- ✅ Protected routes con verificación de roles
- ✅ CSS variables para theming
- ✅ Lazy loading preparado (code splitting implícito en módulos)

### Seguridad
- ✅ Passwords hasheados con bcrypt
- ✅ JWT con expiración
- ✅ Validación de usuarios inactivos
- ✅ CORS configurado
- ✅ No exposición de secrets en código

---

*Documento generado automáticamente para contexto del proyecto DonApp*
*Fecha: Mayo 2026*