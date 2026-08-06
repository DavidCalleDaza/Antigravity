# DONAPP CONTEXT V4 - Estado Actual del Proyecto

**Fecha de generación:** 12 de Mayo de 2026
**Versión anterior:** DONAPP_CONTEXT V3.md (11 de Mayo de 2026)
**Proyecto:** DonApp - Plataforma de gestión empresarial con impacto social
**Slogan:** *"Servir es el único negocio donde todos ganan"*

---

## 1. TIPO DE PROYECTO

**Aplicación web full-stack (SPA)** diseñada para gestión empresarial con foco en impacto social.

| Capa | Tecnología |
|------|-------------|
| Backend | FastAPI (Python) REST API |
| Frontend | React 18 SPA con Vite |
| Base de datos | PostgreSQL 15 |
| ORM | SQLAlchemy 2.0 (async) |

---

## 2. ESTRUCTURA DE DIRECTORIOS

```
DonApp/
├── Backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # Entry point con lifespan, CORS, routers
│   │   ├── api/
│   │   │   └── uploads.py             # Endpoints de upload de archivos
│   │   ├── core/
│   │   │   ├── config.py              # Pydantic Settings
│   │   │   ├── exceptions.py          # Custom HTTPExceptions + handlers
│   │   │   └── security.py            # JWT, bcrypt, dependencies
│   │   ├── db/
│   │   │   ├── base.py               # Model registry para Alembic
│   │   │   ├── base_class.py         # DeclarativeBase
│   │   │   └── session.py            # AsyncSessionMaker, get_db dependency
│   │   ├── modules/
│   │   │   ├── auth/                  # COMPLETO - 100%
│   │   │   │   ├── deps.py           # Dependencies (get_current_user)
│   │   │   │   ├── models.py         # SQLAlchemy model
│   │   │   │   ├── router.py         # /auth endpoints
│   │   │   │   ├── schemas.py        # Pydantic schemas
│   │   │   │   └── crud.py           # CRUD operations
│   │   │   ├── wall/                  # COMPLETO - 100%
│   │   │   │   ├── models.py         # Post, Comment models
│   │   │   │   ├── router.py         # /wall endpoints + WebSocket
│   │   │   │   ├── schemas.py        # PostCreate, PostResponse, Comment schemas
│   │   │   │   └── crud.py           # Post/Comment CRUD
│   │   │   ├── products/              # COMPLETO - 100%
│   │   │   │   ├── models.py
│   │   │   │   ├── router.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── crud.py
│   │   │   ├── services/              # COMPLETO - 100%
│   │   │   │   ├── models.py
│   │   │   │   ├── router.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── crud.py
│   │   │   ├── agenda/                # STUB - 0%
│   │   │   └── billing/              # STUB - 0%
│   │   └── shared/
│   │       └── schemas.py            # Shared Pydantic schemas
│   ├── alembic/
│   │   ├── env.py
│   │   ├── README
│   │   └── versions/                 # 5 migraciones
│   │       ├── 9693c1c7cbdc_create_users_table.py
│   │       ├── 7059b6e65061_add_avatar_url_to_users.py
│   │       ├── ad3dea62b861_create_wall_posts_and_comments_tables.py
│   │       ├── 880556632e90_add_media_and_edited_fields_to_wall.py
│   │       └── a7b3c5d8e21f_create_products_and_services_tables.py
│   ├── scripts/
│   │   └── init_db.py               # Inicialización de BD
│   ├── uploads/                      # Archivos subidos por usuarios
│   ├── tests/
│   │   ├── conftest.py              # Fixtures pytest
│   │   └── test_main.py             # Health check tests
│   ├── .env
│   ├── .env.example
│   ├── alembic.ini
│   ├── docker-compose.yml            # Servicios: db, web
│   ├── Dockerfile                    # Multi-stage build
│   ├── pyproject.toml               # Poetry config
│   ├── requirements.txt
│   └── init_db.py                   # Script alternativo init BD
│
├── Frontend/
│   ├── src/
│   │   ├── main.jsx                 # Entry point React
│   │   ├── App.jsx                  # Routes + ProtectedRoute
│   │   ├── config/
│   │   │   └── appConfig.js        # Roles, categorías, tipos
│   │   ├── store/
│   │   │   └── useStore.js         # Zustand store c/ persist
│   │   ├── hooks/
│   │   │   ├── useCustomCursor.js
│   │   │   ├── useDrawerPush.js
│   │   │   └── useFileUpload.js
│   │   ├── utils/
│   │   │   ├── api.js              # Helpers GET, POST, PATCH, DELETE
│   │   │   ├── apiClient.js        # Fetch wrapper c/ auth
│   │   │   ├── helpers.js          # formatDate, formatCurrency
│   │   │   └── mockData.js
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   └── CustomCursor.jsx
│   │   │   ├── layout/
│   │   │   │   ├── DashboardLayout.jsx
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── LandingFooter.jsx
│   │   │   │   ├── LandingNav.jsx
│   │   │   │   ├── ProtectedRoute.jsx
│   │   │   │   └── Sidebar.jsx
│   │   │   └── ui/
│   │   │       ├── AstronautLogo.jsx
│   │   │       ├── Drawer.jsx
│   │   │       ├── ImageCropperModal.jsx
│   │   │       ├── ItemCardSkeleton.jsx
│   │   │       ├── LiquidDrawer.jsx
│   │   │       ├── MediaCard.jsx
│   │   │       ├── MediaUploader.jsx
│   │   │       ├── Modal.jsx
│   │   │       ├── ProductCard.jsx
│   │   │       ├── ServiceCard.jsx
│   │   │       ├── DonAppLogo.jsx
│   │   │       ├── Table.jsx
│   │   │       └── Toast.jsx
│   │   └── modules/
│   │       ├── Agenda/
│   │       ├── Auth/
│   │       ├── Billing/
│   │       ├── Dashboard/
│   │       ├── Landing/
│   │       ├── Market/
│   │       ├── Products/
│   │       ├── Profile/
│   │       ├── Services/
│   │       ├── Statistics/
│   │       └── Wall/
│   ├── css/
│   │   ├── pages/
│   │   ├── animations.css
│   │   ├── base.css
│   │   ├── components.css
│   │   ├── layout.css
│   │   ├── reset.css
│   │   ├── utilities.css
│   │   └── variables.css
│   ├── public/
│   ├── dist/                        # Production build
│   ├── node_modules/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── DONAPP_CONTEXT V1.md
├── DONAPP_CONTEXT V2.md
├── DONAPP_CONTEXT V3.md
└── .gitignore
```

---

## 3. STACK TECNOLÓGICO

### Backend

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | FastAPI | 0.110+ |
| Server | Uvicorn | 0.27+ |
| Base de datos | PostgreSQL | 15 |
| ORM | SQLAlchemy | 2.0+ (async) |
| Driver DB | asyncpg | 0.29+ |
| Migraciones | Alembic | 1.13+ |
| Validación | Pydantic | 2.5+ |
| Settings | pydantic-settings | 2.1+ |
| Hashing | bcrypt | 4.0+ |
| JWT | python-jose | 3.3+ |
| Testing | pytest | 8.0+ |
| Testing | pytest-asyncio | 0.23+ |
| HTTP Client | httpx | 0.27+ |
| Testing DB | aiosqlite | 0.20+ |
| Lenguaje | Python | 3.11+ |

**Dependencias clave (requirements.txt):**
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

### Frontend

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | React | 18.2 |
| Bundler | Vite | 5.0 |
| Router | React Router DOM | 6.20 |
| State | Zustand | 4.4.7 |
| HTTP Client | Fetch API (native) | - |
| Charts | Chart.js + react-chartjs-2 | 4.5 / 5.3 |
| Íconos | Lucide React | 0.300 |
| Image Crop | react-easy-crop | 5.5.7 |
| Estilos | Plain CSS | - |
| Linting | ESLint | 8.53 |

**Dependencias clave (package.json):**
```json
{
  "dependencies": {
    "chart.js": "^4.5.1",
    "lucide-react": "^0.300.0",
    "react": "^18.2.0",
    "react-chartjs-2": "^5.3.1",
    "react-dom": "^18.2.0",
    "react-easy-crop": "^5.5.7",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^8.53.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.4",
    "vite": "^5.0.0"
  }
}
```

---

## 4. ESTADO DE MÓDULOS

### Estado General: ~55-60% de progreso

| Módulo | Backend | Frontend | Fuente de datos |
|--------|---------|----------|-----------------|
| Auth | 100% | 100% | API real |
| Wall | 100% | 100% | API real |
| Products | 100% | 100% | API real |
| Services | 100% | 100% | API real |
| Dashboard | N/A | 100% | Mock |
| Billing | 0% (stub) | ~70% | Parcialmente mock |
| Agenda | 0% (stub) | ~70% | Parcialmente mock |
| Statistics | N/A | ~50% | Mock con charts |
| Market | N/A | ~50% | Mock |
| Profile | 100% | 100% | API real |

### Detalle de módulos backend

#### Auth Module (COMPLETO)
- Registro con email/password
- Login con JWT (access_token)
- Perfil con GET/PATCH
- Eliminación de cuenta
- Upload de avatar (max 2MB, formatos: jpg, png, webp, gif)
- Validación de magic bytes para uploads
- Rutas: `/api/v1/auth/`

#### Wall Module (COMPLETO)
- CRUD posts completo
- CRUD comments anidados
- Tipos de post: General, Anuncio, Evento, Recomendación, Otro
- Media URLs para posts y comments
- Búsqueda de usuarios por email/nombre
- WebSocket real-time (`/wall/ws/wall`) para updates en vivo
- Rutas: `/api/v1/wall/`

#### Products Module (COMPLETO)
- CRUD completo de productos
- Campos: name, description, category, price, stock, status, image_url, video_url
- Filtros por category y status
- Rutas: `/api/v1/products/`

#### Services Module (COMPLETO)
- CRUD completo de servicios
- Campos: name, description, category, price, duration, status, image_url, video_url
- Filtros por category y status
- Rutas: `/api/v1/services/`

#### Uploads Module (COMPLETO)
- Upload de media (images/videos)
- Validación de magic bytes
- Servido estático de archivos
- Rutas: `/api/v1/uploads/`

#### Agenda Module (STUB)
- Módulo vacío, preparado para implementación
- Destinado a calendario/citas/gestión de horarios

#### Billing Module (STUB)
- Módulo vacío, preparado para implementación
- Destinado a facturación/facturas/pagos

---

## 5. BASE DE DATOS

### Motor: PostgreSQL 15

### Tablas

#### users
| Columna | Tipo | Constraints |
|---------|------|-------------|
| id | UUID | PK, default=uuid4 |
| email | VARCHAR(255) | UNIQUE, NOT NULL, indexed |
| hashed_password | VARCHAR(255) | NOT NULL |
| full_name | VARCHAR(150) | NOT NULL |
| role | VARCHAR(20) | NOT NULL, default='client' |
| is_active | BOOLEAN | NOT NULL, default=TRUE |
| created_at | TIMESTAMP | NOT NULL, server_default=now() |
| avatar_url | VARCHAR(500) | NULLABLE |

**Índices:** email (unique)

#### posts (Wall)
| Columna | Tipo | Constraints |
|---------|------|-------------|
| id | UUID | PK, auto-generated |
| author_id | UUID | FK -> users.id, ON DELETE CASCADE |
| content | TEXT | NOT NULL |
| type | VARCHAR(50) | NOT NULL, default='General' |
| media_url | VARCHAR(255) | NULLABLE |
| media_type | VARCHAR(50) | NULLABLE |
| is_edited | BOOLEAN | NOT NULL, default=FALSE |
| created_at | TIMESTAMP | NOT NULL, server_default=now() |
| updated_at | TIMESTAMP | NOT NULL |

**Índices:** author_id

#### comments
| Columna | Tipo | Constraints |
|---------|------|-------------|
| id | UUID | PK, auto-generated |
| post_id | UUID | FK -> posts.id, ON DELETE CASCADE |
| author_id | UUID | FK -> users.id, ON DELETE CASCADE |
| content | TEXT | NOT NULL |
| media_url | VARCHAR(255) | NULLABLE |
| media_type | VARCHAR(50) | NULLABLE |
| is_edited | BOOLEAN | NOT NULL, default=FALSE |
| created_at | TIMESTAMP | NOT NULL, server_default=now() |
| updated_at | TIMESTAMP | NOT NULL |

**Índices:** post_id, author_id

#### products
| Columna | Tipo | Constraints |
|---------|------|-------------|
| id | UUID | PK, auto-generated |
| name | VARCHAR(150) | NOT NULL |
| description | TEXT | NULLABLE |
| category | VARCHAR(50) | NOT NULL, default='General' |
| price | NUMERIC(10,2) | NOT NULL |
| stock | INTEGER | default=0 |
| status | VARCHAR(20) | NOT NULL, default='active' |
| image_url | VARCHAR(255) | NULLABLE |
| video_url | VARCHAR(255) | NULLABLE |
| created_at | TIMESTAMP | NOT NULL, server_default=now() |
| updated_at | TIMESTAMP | NULLABLE |

**Índices:** category, status

#### services
| Columna | Tipo | Constraints |
|---------|------|-------------|
| id | UUID | PK, auto-generated |
| name | VARCHAR(150) | NOT NULL |
| description | TEXT | NULLABLE |
| category | VARCHAR(50) | NOT NULL, default='General' |
| price | NUMERIC(10,2) | NOT NULL, default=0 |
| duration | VARCHAR(50) | NULLABLE |
| status | VARCHAR(20) | NOT NULL, default='active' |
| image_url | VARCHAR(255) | NULLABLE |
| video_url | VARCHAR(255) | NULLABLE |
| created_at | TIMESTAMP | NOT NULL, server_default=now() |
| updated_at | TIMESTAMP | NULLABLE |

**Índices:** category, status

### Migraciones Alembic (5 total)

1. `9693c1c7cbdc_create_users_table.py` - Tabla users
2. `7059b6e65061_add_avatar_url_to_users.py` - Columna avatar_url
3. `ad3dea62b861_create_wall_posts_and_comments_tables.py` - Tablas posts y comments
4. `880556632e90_add_media_and_edited_fields_to_wall.py` - media_url, media_type, is_edited
5. `a7b3c5d8e21f_create_products_and_services_tables.py` - Tablas products y services

---

## 6. API ENDPOINTS

**Base URL:** `/api/v1`

### Health
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check con estado de BD |

### Authentication (`/api/v1/auth`)
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Registrar usuario |
| POST | `/auth/login` | No | Login, retorna JWT |
| GET | `/auth/me` | Yes | Obtener usuario actual |
| PATCH | `/auth/me` | Yes | Actualizar perfil |
| DELETE | `/auth/me` | Yes | Desactivar o eliminar cuenta |
| POST | `/auth/me/avatar` | Yes | Upload avatar (max 2MB) |

### Wall (`/api/v1/wall`)
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/wall/` | Yes | Listar posts (paginado) |
| POST | `/wall/` | Yes | Crear post |
| PATCH | `/wall/{post_id}` | Yes | Editar post |
| DELETE | `/wall/{post_id}` | Yes | Eliminar post |
| POST | `/wall/{post_id}/comments` | Yes | Crear comment |
| PATCH | `/wall/{post_id}/comments/{comment_id}` | Yes | Editar comment |
| DELETE | `/wall/{post_id}/comments/{comment_id}` | Yes | Eliminar comment |
| GET | `/wall/users/search` | Yes | Buscar usuarios |
| POST | `/wall/upload` | Yes | Subir media |
| WS | `/wall/ws/wall` | Yes | WebSocket real-time |

### Products (`/api/v1/products`)
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/products/` | Yes | Listar productos (filtrable) |
| POST | `/products/` | Yes | Crear producto |
| GET | `/products/{id}` | Yes | Obtener producto |
| PATCH | `/products/{id}` | Yes | Actualizar producto |
| DELETE | `/products/{id}` | Yes | Eliminar producto |

**Query params para GET /products:**
- `skip`: offset para paginación
- `limit`: límite de resultados
- `category`: filtrar por categoría
- `status`: filtrar por status (active/inactive)

### Services (`/api/v1/services`)
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/services/` | Yes | Listar servicios |
| POST | `/services/` | Yes | Crear servicio |
| GET | `/services/{id}` | Yes | Obtener servicio |
| PATCH | `/services/{id}` | Yes | Actualizar servicio |
| DELETE | `/services/{id}` | Yes | Eliminar servicio |

### Uploads (`/api/v1/uploads`)
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/uploads/media` | Yes | Upload image/video |
| GET | `/uploads/{path}` | No | Servir archivos subidos |
| DELETE | `/uploads/media/{filename}` | Yes | Eliminar archivo |

---

## 7. SEGURIDAD

### JWT
- Algoritmo: HS256
- Expiración: 30 minutos (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- Header: `Authorization: Bearer <token>`
- Secret key configurable via `SECRET_KEY`

### Password Hashing
- Algoritmo: bcrypt
- Funciones: `security.hash_password()` y `security.verify_password()`

### Rutas Protegidas
- Dependency `get_current_user` en todas las rutas que requieren auth
- Verifica token JWT y retorna usuario actual
- Auto-logout en frontend cuando respuesta es 401

### Validación
- Pydantic schemas para request/response validation
- Validación de tipos en todos los endpoints
- Magic byte validation para uploads

### CORS
- Orígenes configurables via `CORS_ORIGINS`
- Default: `["http://localhost:5173", "http://localhost:3000"]`

---

## 8. FRONTEND ARQUITECTURA

### State Management (Zustand)
```javascript
// useStore.js - Persistencia en localStorage
{
  user: { id, email, full_name, role, avatar_url },
  token: string,
  isAuthenticated: boolean,
  theme: 'light' | 'dark',
  // Actions: login, logout, setUser, updateUser
}
```

### API Client (Fetch)
```javascript
// apiClient.js
- Base URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
- Wrapper around fetch with automatic Authorization header
- Auto-logout: Detecta 401 y limpia store
```

### Hooks Personalizados
- `useCustomCursor`: Cursor personalizado animado
- `useDrawerPush`: Gestión de drawers
- `useFileUpload`: Upload de archivos con preview

### Rutas (React Router DOM v6)
```
/                   -> Landing
/login              -> Login
/register           -> Register
/unauthorized       -> No autorizado
/dashboard          -> Dashboard (protegido)
/wall               -> Wall (protegido)
/products           -> Products (protegido)
/services           -> Services (protegido)
/billing            -> Billing (protegido)
/agenda             -> Agenda (protegido)
/statistics         -> Statistics (protegido)
/market             -> Market (protegido)
/profile            -> Profile (protegido)
```

### Components

#### Layout Components
| Componente | Propósito |
|------------|------------|
| `DashboardLayout` | Layout principal con sidebar y header |
| `Header` | Barra de navegación superior |
| `Sidebar` | Menú de navegación colapsable |
| `LandingNav` | Navegación de landing page |
| `LandingFooter` | Footer de landing page |
| `ProtectedRoute` | Guard de autenticación |

#### UI Components
| Componente | Propósito |
|------------|------------|
| `LiquidDrawer` | Drawer animado |
| `Drawer` | Componente drawer básico |
| `Modal` | Diálogo modal reutilizable |
| `Toast` | Notificaciones |
| `Table` | Tabla de datos con ordenamiento |
| `MediaCard` | Card para productos/servicios con media |
| `MediaUploader` | Upload de archivos con preview |
| `ImageCropperModal` | Cropping de imágenes |
| `ProductCard` | Card de producto |
| `ServiceCard` | Card de servicio |
| `ItemCardSkeleton` | Skeleton de carga |
| `CustomCursor` | Cursor personalizado |
| `AstronautLogo` | Logo animado |
| `DonAppLogo` | Logo de marca |
| `Drawer` | Drawer básico |
| `Modal` | Modal reutilizable |

---

## 9. CONFIGURACIÓN

### Backend (.env)
```bash
# Database
POSTGRES_USER=servinow_user
POSTGRES_PASSWORD=servinow_secret_password
POSTGRES_DB=servinow_db
POSTGRES_HOST=db
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/servinow_db

# Security
SECRET_KEY=change-me-to-a-very-long-random-string-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# Application
APP_NAME=DonApp API
APP_VERSION=0.1.0
DEBUG=True
```

### Frontend (appConfig.js)
```javascript
export const ROLES = {
  admin: 'admin',
  professional: 'professional',
  client: 'client'
}

export const POST_TYPES = {
  general: 'General',
  announcement: 'Anuncio',
  event: 'Evento',
  recommendation: 'Recomendación',
  other: 'Otro'
}

export const CATEGORIES = {
  products: ['General', 'Alimentos', 'Bebidas', ...],
  services: ['General', 'Consultoría', 'Educación', ...]
}
```

### Vite Config
- Puerto dev: 5173
- Puerto preview: 4173
- Plugins: @vitejs/plugin-react

---

## 10. DOCKER DEPLOYMENT

### docker-compose.yml (Backend/)
```yaml
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: servinow_user
      POSTGRES_PASSWORD: servinow_secret_password
      POSTGRES_DB: servinow_db
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U servinow_user"]
    volumes:
      - postgres_data:/var/lib/postgresql/data

  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://servinow_user:servinow_secret_password@db:5432/servinow_db
      SECRET_KEY: change-me-to-a-very-long-random-string-in-production
      ALGORITHM: HS256
      ACCESS_TOKEN_EXPIRE_MINUTES: 30
      CORS_ORIGINS: '["http://localhost:5173","http://localhost:3000"]'
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads

volumes:
  postgres_data:
```

### Dockerfile (Multi-stage)
1. **base**: Python 3.11-slim
2. **dependencies**: Instala pip packages desde requirements.txt
3. **application**: Copia código fuente, expone puerto 8000, corre uvicorn con --reload

---

## 11. ESQUEMAS PYDANTIC (Backend)

### Auth Schemas
```python
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1, max_length=150)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    avatar_url: str | None

class UserUpdate(BaseModel):
    full_name: str | None
    role: str | None
    is_active: bool | None
```

### Wall Schemas
```python
class PostCreate(BaseModel):
    content: str
    type: str = 'General'

class PostResponse(BaseModel):
    id: UUID
    author_id: UUID
    content: str
    type: str
    media_url: str | None
    media_type: str | None
    is_edited: bool
    created_at: datetime
    updated_at: datetime
    author: UserResponse

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: UUID
    post_id: UUID
    author_id: UUID
    content: str
    media_url: str | None
    media_type: str | None
    is_edited: bool
    created_at: datetime
    updated_at: datetime
    author: UserResponse
```

### Products/Services Schemas
```python
class ProductBase(BaseModel):
    name: str
    description: str | None
    category: str = 'General'
    price: float
    stock: int = 0
    status: str = 'active'
    image_url: str | None
    video_url: str | None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: str | None
    description: str | None
    category: str | None
    price: float | None
    stock: int | None
    status: str | None
    image_url: str | None
    video_url: str | None

class ProductResponse(ProductBase):
    id: UUID
    created_at: datetime
    updated_at: datetime | None

class ServiceBase(BaseModel):
    name: str
    description: str | None
    category: str = 'General'
    price: float = 0
    duration: str | None
    status: str = 'active'
    image_url: str | None
    video_url: str | None

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: str | None
    description: str | None
    category: str | None
    price: float | None
    duration: str | None
    status: str | None
    image_url: str | None
    video_url: str | None

class ServiceResponse(ServiceBase):
    id: UUID
    created_at: datetime
    updated_at: datetime | None
```

---

## 12. TESTING

### Backend Tests

**conftest.py fixtures:**
- `setup_database`: Crea/dropea tablas por test
- `db_session`: Acceso directo a BD
- `client`: httpx.AsyncClient con ASGI transport
- `override_get_db`: Usa BD de test en lugar de real

**test_main.py:**
- Tests de health check endpoint
- Valida response schema y status codes

### Frontend Tests
- No hay test files configurados actualmente

---

## 13. GAPS CONOCIDAS Y PRÓXIMOS PASOS

### Módulos incompletos (Backend)
- **Agenda**: Stub vacío, necesita implementación de calendario/citas/horarios
- **Billing**: Stub vacío, necesita implementación de facturas/pagos

### Módulos con datos mock (Frontend)
- **Dashboard**: KPIs, gráficos, activity feed (mock)
- **Statistics**: Charts (mock)
- **Market**: Mock
- **Billing**: Tabla de invoices + summary cards (mock)
- **Agenda**: Calendar view (mock)

### Mejoras sugeridas
1. Implementar backend para Agenda y Billing
2. Conectar módulos mock a API real
3. Agregar rate limiting en endpoints de auth
4. Agregar logging centralizado
5. Implementar CI/CD pipeline
6. Agregar tests unitarios/integración en frontend
7. Documentar API con OpenAPI/Swagger (ya disponible con FastAPI)
8. Implementar sistema de permisos/roles más granular
9. Agregar paginación a endpoints de lista
10. Implementar refresh tokens para JWT

---

## 14. COMANDOS DE DESARROLLO

```bash
# Backend
cd Backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd Frontend
npm run dev

# Migraciones
cd Backend
alembic upgrade head

# Docker (desde Backend)
docker-compose up -d

# Docker rebuild
docker-compose up -d --build

# Run tests
cd Backend
pytest

# Lint (Frontend)
cd Frontend
npm run lint
```

---

## 15. ESTRUCTURA DE ARCHIVOS CLAVE

### Backend
```
Backend/app/main.py                  - Entry point, lifespan, CORS, routers
Backend/app/core/config.py          - Settings (Database, JWT, App)
Backend/app/core/security.py        - hash_password, verify_password, get_current_user
Backend/app/core/exceptions.py      - Custom exceptions + handlers
Backend/app/db/session.py            - AsyncSessionMaker, get_db dependency
Backend/app/modules/auth/router.py   - /auth endpoints
Backend/app/modules/wall/router.py   - /wall + WebSocket
Backend/app/modules/products/router.py
Backend/app/modules/services/router.py
Backend/app/api/uploads.py          - Upload endpoints
```

### Frontend
```
Frontend/src/App.jsx                - Routes, ProtectedRoute
Frontend/src/store/useStore.js       - Zustand store with persist
Frontend/src/utils/apiClient.js      - Fetch wrapper with auth
Frontend/src/utils/api.js            - GET, POST, PATCH, DELETE helpers
Frontend/src/config/appConfig.js     - ROLES, POST_TYPES, CATEGORIES
Frontend/src/components/layout/DashboardLayout.jsx
Frontend/src/components/ui/Modal.jsx
Frontend/src/components/ui/Toast.jsx
```

---

## 16. RESUMEN EJECUTIVO

**DonApp** es una plataforma de gestión empresarial full-stack con las siguientes características:

- **Backend**: FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL 15
- **Frontend**: React 18 + Vite + Zustand + Plain CSS
- **Arquitectura**: Modular con módulos auto-contenidos (auth, wall, products, services)
- **Auth**: JWT con bcrypt password hashing
- **Real-time**: WebSocket para wall social
- **Deployment**: Docker + Docker Compose

**Estado de progreso**: ~55-60%
- Módulos completos: Auth, Wall, Products, Services, Profile (backend + frontend)
- Módulos stubs: Agenda, Billing (solo frontend con mock)
- Módulos mock: Dashboard, Statistics, Market (frontend)

**Próximos pasos recomendados**:
1. Implementar Agenda backend (calendario/citas)
2. Implementar Billing backend (facturas/pagos)
3. Conectar módulos mock a APIs reales
4. Agregar tests

---

**Nota:** Este documento refleja el estado del proyecto al 12 de Mayo de 2026.

(End of file)