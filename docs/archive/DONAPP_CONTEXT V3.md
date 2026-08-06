# DONAPP CONTEXT V3 - Estado Actual del Proyecto

**Fecha de generación:** 11 de Mayo de 2026
**Versión anterior:** DONAPP_CONTEXT V2.md
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
│   │   ├── main.py                    # Entry point con CORS, mounts
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic Settings (database, jwt, app)
│   │   │   ├── exceptions.py         # Custom HTTPExceptions
│   │   │   └── security.py          # JWT decode, bcrypt hash/verify, get_current_user
│   │   ├── db/
│   │   │   ├── base.py              # Model registry para Alembic (meta.reflect)
│   │   │   ├── base_class.py        # DeclarativeBase
│   │   │   └── session.py           # AsyncSessionMaker, get_db, dependency
│   │   ├── modules/
│   │   │   ├── auth/                # COMPLETO - 100%
│   │   │   │   ├── router.py        # /auth endpoints
│   │   │   │   ├── schema.py       # UserCreate, UserResponse, UserUpdate
│   │   │   │   ├── service.py      # CRUD operations
│   │   │   │   └── __init__.py
│   │   │   ├── wall/                # COMPLETO - 100%
│   │   │   │   ├── router.py        # /wall endpoints + WebSocket
│   │   │   │   ├── schema.py       # PostCreate, PostResponse, Comment schemas
│   │   │   │   ├── service.py      # Post/Comment CRUD
│   │   │   │   ├── ws_manager.py   # WebSocket connection manager
│   │   │   │   └── __init__.py
│   │   │   ├── products/            # IMPLEMENTADO - 100%
│   │   │   │   ├── router.py
│   │   │   │   ├── schema.py
│   │   │   │   ├── service.py
│   │   │   │   └── __init__.py
│   │   │   ├── services/            # IMPLEMENTADO - 100%
│   │   │   │   ├── router.py
│   │   │   │   ├── schema.py
│   │   │   │   ├── service.py
│   │   │   │   └── __init__.py
│   │   │   ├── agenda/              # STUB - 0%
│   │   │   │   └── __init__.py
│   │   │   └── billing/             # STUB - 0%
│   │   │       └── __init__.py
│   │   ├── shared/
│   │   │   └── schemas/
│   │   │       └── pagination.py   # PageResponse, PaginationParams
│   │   └── api/
│   │       └── route_upload.py     # /uploads/{path} static file serving
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/               # 5 migraciones
│   │       ├── 9693c1c7cbdc_create_users_table.py
│   │       ├── 7059b6e65061_add_avatar_url_to_users.py
│   │       ├── ad3dea62b861_create_wall_posts_and_comments_tables.py
│   │       ├── 880556632e90_add_media_and_edited_fields_to_wall.py
│   │       └── a7b3c5d8e21f_create_products_and_services_tables.py
│   ├── uploads/                    # Archivos subidos por usuarios
│   ├── tests/                       # Test suite pytest
│   ├── scripts/                     # Utilidades
│   ├── .env                        # Variables de entorno
│   ├── .env.example
│   ├── alembic.ini
│   ├── docker-compose.yml           # Servicios: db (postgres), web (fastapi)
│   ├── Dockerfile                   # Multi-stage build
│   ├── pyproject.toml              # Config pytest
│   └── requirements.txt
│
├── Frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                  # Routes + Context Providers
│   │   ├── config/
│   │   │   └── appConfig.js        # Roles, categorías, tipos de post
│   │   ├── store/
│   │   │   └── useStore.js         # Zustand store c/ localStorage persistence
│   │   ├── utils/
│   │   │   ├── apiClient.js        # Axios instance c/ auth interceptor
│   │   │   ├── api.js              # GET, POST, PATCH, DELETE helpers
│   │   │   ├── helpers.js         # formatDate, formatCurrency, etc.
│   │   │   ├── mockData.js        # Datos mock para desarrollo
│   │   │   └── useWallSockets.js  # Hook WebSocket para wall
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   └── Layout.jsx
│   │   │   ├── ui/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Dropdown.jsx
│   │   │   │   ├── CustomCursor.jsx
│   │   │   │   ├── Loading.jsx
│   │   │   │   ├── NoResults.jsx
│   │   │   │   └── ImageCrop.jsx
│   │   │   └── common/
│   │   │       └── PrivateRouter.jsx
│   │   ├── modules/
│   │   │   ├── Landing/
│   │   │   │   └── Landing.jsx     # Landing público c/ partículas
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   ├── Dashboard/
│   │   │   │   └── Dashboard.jsx   # KPIs, gráficos, activity feed
│   │   │   ├── Products/
│   │   │   │   ├── Products.jsx
│   │   │   │   ├── ProductGrid.jsx
│   │   │   │   ├── ProductTable.jsx
│   │   │   │   ├── ProductCard.jsx
│   │   │   │   └── ProductForm.jsx
│   │   │   ├── Services/
│   │   │   │   ├── Services.jsx
│   │   │   │   ├── ServiceGrid.jsx
│   │   │   │   ├── ServiceTable.jsx
│   │   │   │   └── ServiceForm.jsx
│   │   │   ├── Billing/
│   │   │   │   ├── Billing.jsx      # Mock - invoices table + summary cards
│   │   │   ├── Agenda/
│   │   │   │   └── Agenda.jsx      # Mock - calendar view
│   │   │   ├── Wall/
│   │   │   │   ├── Wall.jsx         # API - posts, comments, real-time WS
│   │   │   │   ├── CreatePost.jsx
│   │   │   │   ├── PostList.jsx
│   │   │   │   └── CommentList.jsx
│   │   │   ├── Statistics/
│   │   │   │   └── Statistics.jsx   # Mock - charts
│   │   │   ├── Market/
│   │   │   │   └── Market.jsx      # Mock - competitor comparison
│   │   │   └── Profile/
│   │   │       └── Profile.jsx     # API - avatar upload, user data
│   │   └── hooks/
│   ├── css/                         # Plain CSS stylesheets
│   ├── js/                          # Legacy vanilla JS (deprecated)
│   ├── assets/                      # Static assets
│   ├── dist/                        # Production build
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── public/
│
├── DONAPP_CONTEXT V1.md
└── DONAPP_CONTEXT V2.md
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
| Lenguaje | Python | 3.11+ |

**Dependencias clave (requirements.txt):**
```
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
sqlalchemy>=2.0.0
asyncpg>=0.29.0
alembic>=1.13.0
pydantic>=2.5.0
pydantic-settings>=2.1.0
bcrypt>=4.0.0
python-jose[cryptography]>=3.3.0
python-multipart>=0.0.6
aiofiles>=23.0.0
```

### Frontend

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | React | 18.2 |
| Bundler | Vite | 5.0 |
| Router | React Router DOM | 6.20 |
| State | Zustand | 4.4 |
| HTTP Client | Axios | 1.6 |
| Charts | Chart.js + react-chartjs-2 | 4.5 / 5.3 |
| Íconos | Lucide React | 0.300 |
| Image Crop | react-easy-crop | 5.5.7 |
| Estilos | Plain CSS | - |

**Dependencias clave (package.json):**
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "zustand": "^4.4.0",
  "axios": "^1.6.0",
  "chart.js": "^4.5.0",
  "react-chartjs-2": "^5.3.0",
  "lucide-react": "^0.300.0",
  "react-easy-crop": "^5.5.7"
}
```

---

## 4. ESTADO DE MÓDULOS

### Estado General: ~45-50% de progreso

| Módulo | Backend | Frontend | Fuente de datos |
|--------|---------|----------|-----------------|
| Auth | 100% | 100% | API real |
| Wall | 100% | 100% | API real |
| Products | 100% | 100% | API real |
| Services | 100% | 100% | API real |
| Dashboard | N/A | 100% | Mock |
| Billing | 0% (stub) | 100% | Mock |
| Agenda | 0% (stub) | 100% | Mock |
| Statistics | N/A | 100% | Mock |
| Market | N/A | 100% | Mock |
| Profile | 100% | 100% | API real |

### Detalle de módulos backend

#### Auth Module (COMPLETO)
- Registro con email/password
- Login con JWT (access_token + refresh_token concept)
- Perfil con get/patch
- Eliminación lógica (is_active=false) o permanente
- Upload de avatar (max 2MB, formatos: jpg, png, webp, gif)
- Rutas: `/api/v1/auth/`

#### Wall Module (COMPLETO)
- CRUD posts completo
- CRUD comments anidados
- Tipos de post: General, Anuncio, Evento, Recomendación, Otro
- Media URLs para posts y comments
- Búsqueda de usuarios por email/nombre
- WebSocket real-time (`/wall/ws/wall`) para updates en vivo
- Rutas: `/api/v1/wall/`

#### Products Module (IMPLEMENTADO)
- CRUD completo de productos
- Campos: name, description, category, price, stock, status, image_url, video_url
- Filtros por category y status
- Rutas: `/api/v1/products/`

#### Services Module (IMPLEMENTADO)
- CRUD completo de servicios
- Campos: name, description, category, price, duration, status, image_url, video_url
- Filtros por category y status
- Rutas: `/api/v1/services/`

#### Agenda Module (STUB)
- Módulo vacío, preparado para implementación
- Destinado a calendario/citas

#### Billing Module (STUB)
- Módulo vacío, preparado para implementación
- Destinado a facturación/facturas

---

## 5. BASE DE DATOS

### Motor: PostgreSQL 15

### Tablas

#### users
| Columna | Tipo | Constraints |
|---------|------|-------------|
| id | UUID | PK, auto-generated |
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
| author_id | UUID | FK -> users.id |
| content | TEXT | NOT NULL |
| type | VARCHAR(50) | NOT NULL, default='General' |
| media_url | VARCHAR(255) | NULLABLE |
| media_type | VARCHAR(50) | NULLABLE |
| is_edited | BOOLEAN | NOT NULL, default=FALSE |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

**Índices:** author_id

#### comments
| Columna | Tipo | Constraints |
|---------|------|-------------|
| id | UUID | PK, auto-generated |
| post_id | UUID | FK -> posts.id, CASCADE |
| author_id | UUID | FK -> users.id |
| content | TEXT | NOT NULL |
| media_url | VARCHAR(255) | NULLABLE |
| media_type | VARCHAR(50) | NULLABLE |
| is_edited | BOOLEAN | NOT NULL, default=FALSE |
| created_at | TIMESTAMP | NOT NULL |
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
| created_at | TIMESTAMP | NOT NULL |
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
| created_at | TIMESTAMP | NOT NULL |
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
| GET | `/health` | No | Health check |

### Authentication (`/api/v1/auth`)
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Registrar usuario |
| POST | `/auth/login` | No | Login, retorna JWT |
| GET | `/auth/me` | Yes | Obtener usuario actual |
| PATCH | `/auth/me` | Yes | Actualizar perfil |
| DELETE | `/auth/me?permanent=true/false` | Yes | Desactivar o eliminar |
| POST | `/auth/me/avatar` | Yes | Upload avatar (max 2MB) |

### Wall (`/api/v1/wall`)
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/wall` | Yes | Listar posts (paginado) |
| POST | `/wall` | Yes | Crear post |
| PATCH | `/wall/{post_id}` | Yes | Editar post |
| DELETE | `/wall/{post_id}` | Yes | Eliminar post |
| POST | `/wall/{post_id}/comments` | Yes | Crear comment |
| PATCH | `/wall/{post_id}/comments/{comment_id}` | Yes | Editar comment |
| DELETE | `/wall/{post_id}/comments/{comment_id}` | Yes | Eliminar comment |
| GET | `/wall/users/search?q=` | Yes | Buscar usuarios |
| POST | `/wall/upload` | Yes | Subir media |
| WS | `/wall/ws/wall` | Yes | WebSocket real-time |

### Products (`/api/v1/products`)
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/products` | Yes | Listar productos (filtrable) |
| POST | `/products` | Yes | Crear producto |
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
| GET | `/services` | Yes | Listar servicios |
| POST | `/services` | Yes | Crear servicio |
| GET | `/services/{id}` | Yes | Obtener servicio |
| PATCH | `/services/{id}` | Yes | Actualizar servicio |
| DELETE | `/services/{id}` | Yes | Eliminar servicio |

### Uploads
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/uploads/{path}` | No | Servir archivos subidos |

---

## 7. SEGURIDAD

### JWT
- Algoritmo: HS256
- Expiración: 30 minutos (configurable via `JWT_EXPIRATION_MINUTES`)
- Header: `Authorization: Bearer <token>`

### Password Hashing
- Algoritmo: bcrypt
- Función: `security.hash_password()` y `security.verify_password()`

### Rutas Protegidas
- Dependency `get_current_user` en todas las rutas que requieren auth
- Verifica token JWT y retorna usuario actual
- Auto-logout en frontend cuando respuesta es 401

### Validación
- Pydantic schemas para request/response validation
- Validación de tipos en todos los endpoints

---

## 8. FRONTEND ARQUITECTURA

### State Management (Zustand)
```javascript
// useStore.js - Persistencia en localStorage
{
  user: { id, email, full_name, role, avatar_url },
  token: string,
  isAuthenticated: boolean,
  theme: 'light' | 'dark'
}
```

### API Client (Axios)
```javascript
// apiClient.js
- Base URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
- Interceptor: Agrega Authorization header automáticamente
- Auto-logout: Detecta 401 y limpia store
```

### Hooks Personalizados
- `useWallSockets`: Gestiona conexión WebSocket para wall real-time

### Rutas (React Router DOM v6)
```
/                   -> Landing
/login              -> Login
/register           -> Register
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
- **Layout**: Header, Sidebar, Footer, Layout
- **UI**: Button, Input, Modal, Card, Dropdown, CustomCursor, Loading, NoResults, ImageCrop
- **Common**: PrivateRouter

---

## 9. CONFIGURACIÓN

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/donapp
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=30
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=2097152
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
- Proxy configurado para API: `/api` -> `http://localhost:8000/api/v1`
- Puerto dev: 5173

---

## 10. DOCKER DEPLOYMENT

### docker-compose.yml (Backend/)
```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: donapp
      POSTGRES_PASSWORD: donapp123
      POSTGRES_DB: donapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://donapp:donapp123@db:5432/donapp
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads

volumes:
  postgres_data:
```

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
class ProductCreate(BaseModel):
    name: str
    description: str | None
    category: str = 'General'
    price: float
    stock: int = 0
    status: str = 'active'
    image_url: str | None
    video_url: str | None

class ProductResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    category: str
    price: float
    stock: int
    status: str
    image_url: str | None
    video_url: str | None
    created_at: datetime
    updated_at: datetime | None

class ServiceCreate(BaseModel):
    name: str
    description: str | None
    category: str = 'General'
    price: float = 0
    duration: str | None
    status: str = 'active'
    image_url: str | None
    video_url: str | None

class ServiceResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    category: str
    price: float
    duration: str | None
    status: str
    image_url: str | None
    video_url: str | None
    created_at: datetime
    updated_at: datetime | None
```

---

## 12. GAPS CONOCIDAS Y PRÓXIMOS PASOS

### Módulos incompletos (Backend)
- **Agenda**: Stub vacío, necesita implementación de calendario/citas
- **Billing**: Stub vacío, necesita implementación de facturas

### Módulos con datos mock (Frontend)
- Dashboard
- Billing
- Agenda
- Statistics
- Market

### Mejoras sugeridas
1. Implementar backend para Agenda y Billing
2. Conectar módulos mock a API real
3. Agregar rate limiting en endpoints de auth
4. Agregar logging centralizado
5. Implementar CI/CD pipeline
6. Eliminar código legacy vanilla JS en `/js`
7. Agregar tests unitarios/integración
8. Documentar API con OpenAPI/Swagger (ya viene con FastAPI)

---

## 13. COMANDOS DE DESARROLLO

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

# Docker
cd Backend
docker-compose up -d
```

---

## 14. ESTRUCTURA DE ARCHIVOS CLAVE

### Backend
```
Backend/app/main.py              - Entry point, CORS, mounts, exception handlers
Backend/app/core/config.py       - Settings (Database, JWT, App)
Backend/app/core/security.py     - hash_password, verify_password, get_current_user
Backend/app/db/session.py        - AsyncSessionMaker, get_db dependency
Backend/app/modules/auth/router.py   - /auth endpoints
Backend/app/modules/wall/router.py   - /wall + WebSocket
Backend/app/modules/products/router.py
Backend/app/modules/services/router.py
```

### Frontend
```
Frontend/src/App.jsx                 - Routes, context providers
Frontend/src/store/useStore.js       - Zustand store
Frontend/src/utils/apiClient.js      - Axios instance
Frontend/src/config/appConfig.js     - Configuración de roles, categorías
Frontend/src/modules/Wall/Wall.jsx   - Componente principal del wall
Frontend/src/modules/Products/Products.jsx
Frontend/src/modules/Auth/Login.jsx
```

---

**Nota:** Este documento refleja el estado del proyecto al 11 de Mayo de 2026. Los módulos Products y Services fueron implementados recientemente (10 de Mayo de 2026).