# DONAPP_CONTEXT V5
## Plataforma de Gestión Empresarial con Impacto Social

**Fecha de generación:** 13 de Mayo de 2026
**Versión:** 5.0
**Estado del proyecto:** ~65% completado
**Slogan:** *"Servir es el único negocio donde todos ganan"*

---

## TABLA DE CONTENIDOS

1. [Visión General del Proyecto](#1-visión-general-del-proyecto)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Modelo de Datos](#4-modelo-de-datos)
5. [API Endpoints](#5-api-endpoints)
6. [Épicas de Negocio](#6-épicas-de-negocio)
7. [Historias de Usuario](#7-historias-de-usuario)
8. [Criterios de Aceptación](#8-criterios-de-aceptación)
9. [Casos de Prueba](#9-casos-de-prueba)
10. [Matriz de Trazabilidad](#10-matriz-de-trazabilidad)
11. [Estado de Implementación](#11-estado-de-implementación)
12. [Riesgos y Dependencias](#12-riesgos-y-dependencias)

---

## 1. VISIÓN GENERAL DEL PROYECTO

### 1.1 ¿Qué es DonApp?

**DonApp** es una aplicación web full-stack (SPA) diseñada para la **gestión empresarial con enfoque de impacto social**. Está orientada a pequeñas y medianas empresas en Colombia, permitiéndoles:

- **Gestionar productos y servicios** - Inventario, precios, categorías
- **Facturación** - Control de ingresos, gastos, facturas
- **Agenda y citas** - Gestión de calendarios y horarios
- **Muro social de impacto** - Compartir historias de donaciones y testimonios
- **Estadísticas y análisis de mercado** - Reportes de ventas, competencia
- **Publicación en redes sociales** - Compartir productos/servicios en Facebook, Instagram, TikTok

### 1.2 Propuesta de Valor

La plataforma se diferencia al combinar herramientas de gestión empresarial con una **filosofía de impacto social**. Las empresas pueden donate productos/servicios a sus comunidades, con este impacto registrado y mostrado en un feed social ("Wall").

### 1.3 Industrias Objetivo

| Industria | Descripción |
|-----------|-------------|
| **Retail/Pymes** | Gestión de inventario y ventas |
| **Emprendimiento social** | Empresas con foco social y donaciones |
| **Servicios profesionales** | Barberías, consultorios, instructores Yoga |

---

## 2. STACK TECNOLÓGICO

### 2.1 Backend

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | FastAPI (Python) | 0.110+ |
| Servidor | Uvicorn | 0.27+ |
| Base de datos | PostgreSQL | 15 |
| ORM | SQLAlchemy (async) | 2.0+ |
| Driver | asyncpg | 0.29+ |
| Migraciones | Alembic | 1.13+ |
| Validación | Pydantic | 2.5+ |
| Configuración | pydantic-settings | 2.1+ |
| Hashing | bcrypt | 4.0+ |
| JWT | python-jose | 3.3+ |
| Testing | pytest + pytest-asyncio | 8.0+ / 0.23+ |
| Cliente HTTP | httpx | 0.27+ |
| Lenguaje | Python | 3.11+ |

### 2.2 Frontend

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | React | 18.2 |
| Bundler | Vite | 5.0 |
| Router | React Router DOM | 6.20 |
| Estado | Zustand | 4.4.7 |
| HTTP Client | Fetch API (native) | - |
| Gráficos | Chart.js + react-chartjs-2 | 4.5 / 5.3 |
| Iconos | Lucide React | 0.300 |
| Recorte de imagen | react-easy-crop | 5.5.7 |
| Estilos | Plain CSS | - |
| Linting | ESLint | 8.53 |

### 2.3 Infraestructura

| Componente | Tecnología |
|------------|------------|
| Contenedores | Docker + Docker Compose |
| Base de datos | PostgreSQL 15 (Alpine) |

---

## 3. ARQUITECTURA DEL SISTEMA

### 3.1 Estructura de Directorios

```
DonApp/
├── Backend/
│   ├── app/
│   │   ├── main.py                    # Punto de entrada, CORS, routers
│   │   ├── api/
│   │   │   └── uploads.py             # Upload de medios
│   │   ├── core/
│   │   │   ├── config.py              # Configuración Pydantic
│   │   │   ├── exceptions.py          # Excepciones HTTP personalizadas
│   │   │   └── security.py            # JWT + bcrypt
│   │   ├── db/
│   │   │   ├── base.py                # Registro de modelos (Alembic)
│   │   │   ├── base_class.py          # DeclarativeBase
│   │   │   └── session.py             # AsyncSessionMaker
│   │   ├── modules/
│   │   │   ├── auth/                  # ✓ COMPLETO (100%)
│   │   │   ├── wall/                  # ✓ COMPLETO (100%)
│   │   │   ├── products/              # ✓ COMPLETO (100%)
│   │   │   ├── services/              # ✓ COMPLETO (100%)
│   │   │   ├── social/               # ◐ PARCIAL (accounts + posts)
│   │   │   ├── agenda/                # ○ STUB (vacío)
│   │   │   └── billing/              # ○ STUB (vacío)
│   │   └── shared/
│   ├── alembic/versions/              # 5 migraciones
│   ├── scripts/
│   ├── uploads/                       # Archivos subidos por usuarios
│   ├── tests/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── requirements.txt
│
├── Frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── config/appConfig.js
│   │   ├── store/useStore.js
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   └── modules/
│   │       ├── Agenda/               # ◐ Mock data
│   │       ├── Auth/                 # ✓ API real
│   │       ├── Billing/              # ◐ Mock data
│   │       ├── Dashboard/            # ◐ Mock data
│   │       ├── Landing/
│   │       ├── Market/               # ◐ Mock data
│   │       ├── Products/             # ✓ API real
│   │       ├── Profile/              # ✓ API real
│   │       ├── Services/             # ✓ API real
│   │       ├── Statistics/           # ◐ Mock data
│   │       └── Wall/                 # ✓ API real + WebSocket
│   └── css/
└── DONAPP_CONTEXT V*.md
```

### 3.2 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │  Wall   │  │Products │  │Services │  │Profile  │  │Dashboard│ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └───┬────┘ │
│       │            │           │           │            │       │
│  ┌────┴────────────┴───────────┴───────────┴────────────┴────┐ │
│  │                    Zustand Store                           │ │
│  │              (apiClient.js - Fetch API)                    │ │
│  └────────────────────────┬──────────────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTP/REST + WebSocket
                              │ JWT Auth
┌─────────────────────────────┼───────────────────────────────────┐
│                        BACKEND (FastAPI)                        │
│  ┌────────┴────────┐  ┌─────┴──────┐  ┌──────────┐  ┌────────┐ │
│  │  /auth routes  │  │ /wall路由   │  │ /products│  │ /social │ │
│  └────────┬───────┘  └──────┬─────┘  └─────┬─────┘  └────────┘ │
│           │                 │              │                  │
│  ┌────────┴─────────────────┴──────────────┴────────────────┐ │
│  │                    CRUD Operations                         │ │
│  │                 (SQLAlchemy Async)                        │ │
│  └────────────────────────┬──────────────────────────────────┘ │
└───────────────────────────┼────────────────────────────────────┘
                            │
┌───────────────────────────┼────────────────────────────────────┐
│                    POSTGRESQL 15                                 │
│   ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌──────────────────┐  │
│   │  users   │  │  posts  │  │ products │  │ social_accounts  │  │
│   │ comments │  │services │  │social_post│  │                  │  │
│   └──────────┘  └─────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. MODELO DE DATOS

### 4.1 Diagrama Entidad-Relación

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      users       │       │      posts       │       │     comments     │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK, UUID)    │──┐    │ id (PK, UUID)    │       │ id (PK, UUID)    │
│ email            │  │    │ author_id (FK) ──┼───┐   │ post_id (FK)     │──┐
│ hashed_password  │  │    │ content          │   │   │ author_id (FK)   │  │
│ full_name        │  └───►│ type             │   │   │ content          │  │
│ role             │       │ media_url        │   │   │ media_url        │  │
│ is_active        │       │ media_type       │   │   │ media_type       │  │
│ created_at       │       │ is_edited        │   │   │ is_edited        │  │
│ avatar_url       │       │ created_at       │   │   │ created_at       │  │
└──────────────────┘       │ updated_at       │   │   │ updated_at       │  │
                          └──────────────────┘   │   └──────────────────┘  │
                                                 │          ▲             │
                                                 └──────────┼─────────────┘
                                                            │
┌──────────────────┐       ┌──────────────────┐            │
│    products      │       │    services      │            │
├──────────────────┤       ├──────────────────┤            │
│ id (PK, UUID)    │       │ id (PK, UUID)    │            │
│ name             │       │ name             │            │
│ description      │       │ description      │            │
│ category         │       │ category         │            │
│ price            │       │ price            │            │
│ stock            │       │ duration         │            │
│ status           │       │ status           │            │
│ image_url        │       │ image_url        │            │
│ video_url        │       │ video_url        │            │
│ created_at       │       │ created_at       │            │
│ updated_at       │       │ updated_at       │            │
└──────────────────┘       └──────────────────┘            │
                                                            │
┌──────────────────┐       ┌──────────────────┐            │
│  social_accounts │       │   social_posts  │            │
├──────────────────┤       ├──────────────────┤            │
│ id (PK, UUID)    │──────►│ id (PK, UUID)    │            │
│ user_id (FK)     │       │ user_id (FK)     │            │
│ platform         │       │ product_id (FK) ◄─┼────────────┘
│ platform_user_id │       │ service_id (FK)  │            │
│ platform_username│       │ platform         │            │
│ access_token     │       │ status           │            │
│ refresh_token    │       │ caption          │            │
│ expires_at       │       │ media_url        │            │
│ created_at       │       │ platform_post_id │            │
└──────────────────┘       │ error_message    │            │
                          │ published_at      │            │
                          │ created_at        │            │
                          └──────────────────┘            │
```

### 4.2 Detalle de Tablas

#### users
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, default=uuid4 |
| email | VARCHAR(255) | UNIQUE, NOT NULL, indexed |
| hashed_password | VARCHAR(255) | NOT NULL |
| full_name | VARCHAR(150) | NOT NULL |
| role | VARCHAR(20) | NOT NULL, default='client' |
| is_active | BOOLEAN | NOT NULL, default=TRUE |
| created_at | TIMESTAMP | NOT NULL, server_default=now() |
| avatar_url | VARCHAR(500) | NULLABLE |

#### posts (Wall)
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, auto-generated |
| author_id | UUID | FK -> users.id, ON DELETE CASCADE |
| content | TEXT | NOT NULL |
| type | VARCHAR(50) | NOT NULL, default='General' |
| media_url | VARCHAR(255) | NULLABLE |
| media_type | VARCHAR(50) | NULLABLE |
| is_edited | BOOLEAN | NOT NULL, default=FALSE |
| created_at | TIMESTAMP | NOT NULL, server_default=now() |
| updated_at | TIMESTAMP | NOT NULL |

#### comments
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, auto-generated |
| post_id | UUID | FK -> posts.id, ON DELETE CASCADE |
| author_id | UUID | FK -> users.id, ON DELETE CASCADE |
| content | TEXT | NOT NULL |
| media_url | VARCHAR(255) | NULLABLE |
| media_type | VARCHAR(50) | NULLABLE |
| is_edited | BOOLEAN | NOT NULL, default=FALSE |
| created_at | TIMESTAMP | NOT NULL, server_default=now() |
| updated_at | TIMESTAMP | NOT NULL |

#### products
| Columna | Tipo | Restricciones |
|---------|------|---------------|
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

#### services
| Columna | Tipo | Restricciones |
|---------|------|---------------|
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

#### social_accounts
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, auto-generated |
| user_id | UUID | FK -> users.id, ON DELETE CASCADE |
| platform | VARCHAR(20) | NOT NULL (tiktok, instagram, facebook) |
| platform_user_id | VARCHAR(255) | NULLABLE |
| platform_username | VARCHAR(255) | NULLABLE |
| access_token | TEXT | NOT NULL |
| refresh_token | TEXT | NULLABLE |
| expires_at | TIMESTAMP | NULLABLE |
| created_at | TIMESTAMP | NOT NULL, server_default=now() |

#### social_posts
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, auto-generated |
| user_id | UUID | FK -> users.id, ON DELETE CASCADE |
| product_id | UUID | FK -> products.id, ON DELETE SET NULL |
| service_id | UUID | FK -> services.id, ON DELETE SET NULL |
| platform | VARCHAR(20) | NOT NULL |
| status | VARCHAR(20) | default='pending' |
| caption | TEXT | NULLABLE |
| media_url | VARCHAR(500) | NULLABLE |
| platform_post_id | VARCHAR(255) | NULLABLE |
| error_message | TEXT | NULLABLE |
| published_at | TIMESTAMP | NULLABLE |
| created_at | TIMESTAMP | NOT NULL, server_default=now() |

---

## 5. API ENDPOINTS

**Base URL:** `/api/v1`

### 5.1 Health
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check con estado de conexión DB |

### 5.2 Autenticación (`/api/v1/auth`)
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Registro de usuario (email, password, full_name, role) |
| POST | `/auth/login` | No | Login con respuesta JWT |
| GET | `/auth/me` | Yes | Obtener perfil del usuario actual |
| PATCH | `/auth/me` | Yes | Actualizar perfil (full_name, email, avatar_url) |
| DELETE | `/auth/me?permanent=true\|false` | Yes | Desactivar o eliminar cuenta permanentemente |
| POST | `/auth/me/avatar` | Yes | Subir avatar (image, max 2MB, jpg/png/gif/webp) |

### 5.3 Wall (`/api/v1/wall`)
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/wall/` | Yes | Listar posts (paginado: skip, limit) |
| POST | `/wall/` | Yes | Crear post (content, type, media_url, media_type) |
| PATCH | `/wall/{post_id}` | Yes | Editar post (content, type) |
| DELETE | `/wall/{post_id}` | Yes | Eliminar post |
| POST | `/wall/{post_id}/comments` | Yes | Crear comentario (content) |
| PATCH | `/wall/{post_id}/comments/{comment_id}` | Yes | Editar comentario |
| DELETE | `/wall/{post_id}/comments/{comment_id}` | Yes | Eliminar comentario |
| GET | `/wall/users/search?q=` | Yes | Buscar usuarios por nombre (para menciones) |
| POST | `/wall/upload` | Yes | Subir media para posts del wall |
| WS | `/wall/ws/wall` | Yes | WebSocket para actualizaciones en tiempo real |

### 5.4 Productos (`/api/v1/products`)
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/products/` | Yes | Listar productos (filtro: category, status; paginar: skip, limit) |
| POST | `/products/` | Yes | Crear producto |
| GET | `/products/{product_id}` | Yes | Obtener un producto |
| PATCH | `/products/{product_id}` | Yes | Actualizar producto |
| DELETE | `/products/{product_id}` | Yes | Eliminar producto (con limpieza de archivos) |

### 5.5 Servicios (`/api/v1/services`)
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/services/` | Yes | Listar servicios (filtro: category, status; paginar: skip, limit) |
| POST | `/services/` | Yes | Crear servicio |
| GET | `/services/{service_id}` | Yes | Obtener un servicio |
| PATCH | `/services/{service_id}` | Yes | Actualizar servicio |
| DELETE | `/services/{service_id}` | Yes | Eliminar servicio (con limpieza de archivos) |

### 5.6 Social (`/api/v1/social`)
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/social/accounts` | Yes | Listar cuentas sociales conectadas |
| POST | `/social/publish` | Yes | Crear post en redes sociales |
| GET | `/social/posts` | Yes | Obtener historial de posts sociales |

### 5.7 Uploads (`/api/v1/uploads`)
| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/uploads/media` | Yes | Subir imagen (5MB max) o video (20MB max) |
| GET | `/uploads/{path}` | No | Servir archivos estáticos |
| DELETE | `/uploads/media/{filename}` | Yes | Eliminar archivo subido |

---

## 6. ÉPICAS DE NEGOCIO

### ÉPICA 1: Autenticación y Gestión de Usuarios
**Código:** EP-001
**Prioridad:** Alta (Crítica)
**Descripción:** Sistema central de identidad de usuario con registro, inicio de sesión y gestión de perfil.
**Valor para el usuario:** Los usuarios necesitan acceso seguro y confiable a la plataforma con gestión de identidad personal.
**Notas técnicas:** Autenticación basada en JWT con expiry de 30 minutos. Hashing de contraseñas con bcrypt. Soft-delete y hard-delete disponibles.

### ÉPICA 2: Catálogo de Productos
**Código:** EP-002
**Prioridad:** Alta
**Descripción:** Sistema completo de gestión de inventario para productos.
**Valor para el usuario:** Los negocios pueden gestionar su oferta de productos con precios, stock y medios visuales.
**Notas técnicas:** Operaciones CRUD con filtrado por categoría y estado. Soporte multimedia. Limpieza de archivos en eliminación.

### ÉPICA 3: Catálogo de Servicios
**Código:** EP-003
**Prioridad:** Alta
**Descripción:** Gestión de ofertas de servicios con seguimiento de duración.
**Valor para el usuario:** Negocios de servicios (peluquerías, consultorios) pueden exhibir y gestionar sus servicios.
**Notas técnicas:** Estructura similar a productos. Campo adicional `duration`. Integración con agenda (planificada).

### ÉPICA 4: Muro Social (Feed de Impacto)
**Código:** EP-004
**Prioridad:** Alta
**Descripción:** Feed social en tiempo real para compartir historias de impacto, donaciones y testimonios.
**Valor para el usuario:** Los negocios pueden compartir su impacto social, construyendo confianza comunitaria y visibilidad.
**Notas técnicas:** WebSocket para actualizaciones en tiempo real. Tipos de post: General, Donation, Testimony, Impact. Sistema de comentarios anidados.

### ÉPICA 5: Integración con Redes Sociales
**Código:** EP-005
**Prioridad:** Media
**Descripción:** Publicación de productos/servicios en plataformas de redes sociales (Facebook, Instagram, TikTok).
**Valor para el usuario:** Los negocios pueden comercializar sus ofertas en múltiples plataformas sociales desde un solo lugar.
**Notas técnicas:** Conexión de cuentas OAuth (planeado para implementación completa). Programación de posts y tracking de estado.

### ÉPICA 6: Dashboard y Analítica
**Código:** EP-006
**Prioridad:** Media
**Descripción:** Dashboard de inteligencia de negocios con KPIs, gráficos y seguimiento de actividad.
**Valor para el usuario:** Los propietarios pueden evaluar rápidamente el rendimiento y tomar decisiones basadas en datos.
**Notas técnicas:** Actualmente usa datos mock. Chart.js para visualizaciones. Tarjetas KPI con indicadores de tendencia.

### ÉPICA 7: Facturación y Cuentas por Cobrar
**Código:** EP-007
**Prioridad:** Alta
**Descripción:** Gestión de facturas y seguimiento financiero.
**Valor para el usuario:** Los negocios pueden rastrear ingresos, gastos y generar facturas.
**Notas técnicas:** Datos mock actualmente. Estados de factura: paid, pending, overdue, cancelled. Funcionalidad de exportación planeada.

### ÉPICA 8: Agenda y Citas
**Código:** EP-008
**Prioridad:** Alta
**Descripción:** Gestión de citas y franjas horarias basada en calendario.
**Valor para el usuario:** Los negocios de servicios pueden gestionar citas de clientes y disponibilidad.
**Notas técnicas:** Datos mock para citas. Cuadrícula de calendario con navegación por mes.Slots de estado: free, pending, busy, blocked.

### ÉPICA 9: Estadísticas e Informes
**Código:** EP-009
**Prioridad:** Media
**Descripción:** Analítica avanzada con gráficos y conocimientos inteligentes.
**Valor para el usuario:** Los administradores pueden analizar patrones de ventas, productos principales y obtener sugerencias impulsadas por IA.
**Notas técnicas:** Datos mock para gráficos. Gráficos de barras para ingresos/productos. Tarjetas de "sugerencias IA" estáticas.

### ÉPICA 10: Análisis de Mercado
**Código:** EP-010
**Prioridad:** Baja
**Descripción:** Investigación de competencia e inteligencia de mercado.
**Valor para el usuario:** Los negocios pueden comparar precios y encontrar oportunidades de mercado.
**Notas técnicas:** Datos de competencia mock. Visualización de distancia/clasificación. Tarjetas de insight estáticas.

### ÉPICA 11: Perfil y Configuración
**Código:** EP-011
**Prioridad:** Media
**Descripción:** Gestión de perfil de usuario y conexiones de redes sociales.
**Valor para el usuario:** Los usuarios pueden gestionar su información personal y conectar cuentas sociales.
**Notas técnicas:** API real para datos de perfil. Subida de avatar con recorte. Pestaña de configuración social.

---

## 7. HISTORIAS DE USUARIO

### ÉPICA 1: Autenticación y Gestión de Usuarios

| ID | Historia de Usuario | Prioridad |
|----|---------------------|-----------|
| US-001 | **Como** nuevo usuario, **quiero** registrarme con email y contraseña **para** acceder a la plataforma y gestionar mi negocio. | Alta |
| US-002 | **Como** usuario registrado, **quiero** iniciar sesión con mis credenciales **para** acceder a mi cuenta de forma segura. | Alta |
| US-003 | **Como** usuario autenticado, **quiero** ver mi perfil **para** verificar mi información personal. | Alta |
| US-004 | **Como** usuario autenticado, **quiero** actualizar mi nombre y email **para** mantener mi información actualizada. | Alta |
| US-005 | **Como** usuario autenticado, **quiero** subir una foto de perfil **para** personalizar mi cuenta. | Media |
| US-006 | **Como** usuario que desea abandonar la plataforma, **quiero** desactivar mi cuenta **para** que mis datos sean invisibles sin perderlos. | Media |
| US-007 | **Como** usuario que desea eliminar su cuenta, **quiero** eliminar permanentemente mi cuenta **para** remover todos mis datos del sistema. | Baja |

### ÉPICA 2: Catálogo de Productos

| ID | Historia de Usuario | Prioridad |
|----|---------------------|-----------|
| US-010 | **Como** administrador/vendedor, **quiero** crear productos con nombre, categoría, precio y stock **para** gestionar mi inventario. | Alta |
| US-011 | **Como** administrador/vendedor, **quiero** ver todos mis productos en una lista **para** encontrar rápidamente lo que busco. | Alta |
| US-012 | **Como** administrador/vendedor, **quiero** filtrar productos por categoría y estado **para** organizar mi inventario. | Media |
| US-013 | **Como** administrador/vendedor, **quiero** editar la información de un producto **para** corregir errores o actualizar detalles. | Alta |
| US-014 | **Como** administrador/vendedor, **quiero** eliminar un producto **para** remover artículos discontinuos. | Alta |
| US-015 | **Como** administrador/vendedor, **quiero** subir imágenes y videos de productos **para** mostrar visualmente mis productos. | Media |
| US-016 | **Como** cliente, **quiero** ver los productos activos con precio y disponibilidad **para** conocer la oferta. | Alta |

### ÉPICA 3: Catálogo de Servicios

| ID | Historia de Usuario | Prioridad |
|----|---------------------|-----------|
| US-020 | **Como** administrador/vendedor, **quiero** crear servicios con nombre, categoría, precio y duración **para** ofrecer mis servicios profesionales. | Alta |
| US-021 | **Como** administrador/vendedor, **quiero** ver todos mis servicios en una lista **para** gestionar mi oferta. | Alta |
| US-022 | **Como** administrador/vendedor, **quiero** filtrar servicios por categoría y estado **para** organizar mis servicios. | Media |
| US-023 | **Como** administrador/vendedor, **quiero** editar la información de un servicio **para** mantenerlo actualizado. | Alta |
| US-024 | **Como** administrador/vendedor, **quiero** eliminar un servicio **para** remover servicios ya no ofrecidos. | Alta |
| US-025 | **Como** administrador/vendedor, **quiero** subir imágenes y videos de servicios **para** promocionar mis servicios visualmente. | Media |
| US-026 | **Como** cliente, **quiero** ver los servicios activos con precio y duración **para** elegir el servicio adecuado. | Alta |

### ÉPICA 4: Muro Social (Feed de Impacto)

| ID | Historia de Usuario | Prioridad |
|----|---------------------|-----------|
| US-030 | **Como** usuario, **quiero** crear publicaciones de texto con tipo (impacto, donación, testimonio) **para** compartir mi impacto social. | Alta |
| US-031 | **Como** usuario, **quiero** adjuntar imágenes o videos a mis publicaciones **para** hacer más visual mi mensaje. | Media |
| US-032 | **Como** usuario, **quiero** ver todas las publicaciones en orden cronológico inverso **para** estar al día con la comunidad. | Alta |
| US-033 | **Como** usuario, **quiero** recibir actualizaciones en tiempo real sin refrescar **para** ver nuevo contenido instantáneamente. | Alta |
| US-034 | **Como** usuario, **quiero** comentar en publicaciones **para** interactuar con la comunidad. | Alta |
| US-035 | **Como** autor de una publicación, **quiero** editar mi contenido **para** corregir errores. | Media |
| US-036 | **Como** autor de una publicación, **quiero** eliminar mi publicación **para** remover contenido que ya no deseo compartir. | Media |
| US-037 | **Como** administrador, **quiero** editar cualquier publicación **para** moderar contenido inapropiado. | Baja |
| US-038 | **Como** usuario, **quiero** buscar otros usuarios para mencionarlos **para** involcrate a otros en mis publicaciones. | Baja |
| US-039 | **Como** usuario, **quiero** editar mis comentarios **para** corregir lo que escribí. | Media |
| US-040 | **Como** usuario, **quiero** eliminar mis comentarios **para** remover lo que escribí. | Media |

### ÉPICA 5: Integración con Redes Sociales

| ID | Historia de Usuario | Prioridad |
|----|---------------------|-----------|
| US-050 | **Como** administrador/vendedor, **quiero** conectar mis cuentas de redes sociales **para** gestionar todas desde un solo lugar. | Media |
| US-051 | **Como** administrador/vendedor, **quiero** ver mis cuentas sociales conectadas **para** conocer qué está vinculado. | Media |
| US-052 | **Como** administrador/vendedor, **quiero** publicar productos en redes sociales **para** dar visibilidad a mi negocio. | Media |
| US-053 | **Como** administrador/vendedor, **quiero** publicar servicios en redes sociales **para** promocionar mis servicios. | Media |
| US-054 | **Como** administrador/vendedor, **quiero** ver el historial de publicaciones **para** hacer seguimiento de lo publicado. | Media |
| US-055 | **Como** administrador/vendedor, **quiero** desconectar una cuenta social **para** revocar acceso cuando lo necesite. | Baja |

### ÉPICA 6: Dashboard y Analítica

| ID | Historia de Usuario | Prioridad |
|----|---------------------|-----------|
| US-060 | **Como** usuario autenticado, **quiero** ver un panel de control con KPIs principales **para** conocer el estado de mi negocio de un vistazo. | Alta |
| US-061 | **Como** administrador/vendedor, **quiero** ver gráfico de tendencia de ventas **para** analizar el rendimiento en el tiempo. | Alta |
| US-062 | **Como** administrador/vendedor, **quiero** ver gráfico de distribución por categoría **para** entender qué categorías generan más ingresos. | Media |
| US-063 | **Como** administrador/vendedor, **quiero** ver un feed de actividad reciente **para** estar al tanto de últimas transacciones. | Media |
| US-064 | **Como** administrador/vendedor, **quiero** acceder a acciones rápidas **para** navegar rápidamente a funciones frecuentes. | Baja |

### ÉPICA 7: Facturación y Cuentas por Cobrar

| ID | Historia de Usuario | Prioridad |
|----|---------------------|-----------|
| US-070 | **Como** administrador/vendedor, **quiero** ver lista de facturas con estados **para** hacer seguimiento de cobros. | Alta |
| US-071 | **Como** administrador/vendedor, **quiero** filtrar facturas por estado **para** encontrar rápidamente facturas pendientes o pagadas. | Media |
| US-072 | **Como** administrador/vendedor, **quiero** ver resumen de ingresos, gastos y balance **para** conocer mi situación financiera. | Alta |
| US-073 | **Como** administrador/vendedor, **quiero** crear nuevas facturas **para** registrar nuevas transacciones. | Alta |
| US-074 | **Como** administrador/vendedor, **quiero** exportar facturas **para** tener registros externos. | Media |

### ÉPICA 8: Agenda y Citas

| ID | Historia de Usuario | Prioridad |
|----|---------------------|-----------|
| US-080 | **Como** administrador/vendedor/cliente, **quiero** ver un calendario mensual **para** visualizar la disponibilidad de citas. | Alta |
| US-081 | **Como** administrador/vendedor, **quiero** ver los detalles del día seleccionado **para** ver todas las citas de ese día. | Alta |
| US-082 | **Como** administrador/vendedor, **quiero** crear nuevas citas **para** agendar clientes. | Alta |
| US-083 | **Como** cliente, **quiero** reservar una cita **para** obtener un horario con el negocio. | Alta |
| US-084 | **Como** administrador/vendedor, **quiero** gestionar franjas horarias (bloquear/disponibilizar) **para** controlar mi agenda. | Alta |

### ÉPICA 9: Estadísticas e Informes

| ID | Historia de Usuario | Prioridad |
|----|---------------------|-----------|
| US-090 | **Como** administrador, **quiero** ver gráfico de ingresos por mes **para** analizar tendencias de revenue. | Alta |
| US-091 | **Como** administrador, **quiero** ver ranking de productos más vendidos **para** conocer qué productos tienen mayor demanda. | Media |
| US-092 | **Como** administrador, **quiero** ver gráfico de productos por categoría **para** entender la distribución de mi catálogo. | Media |
| US-093 | **Como** administrador, **quiero** recibir sugerencias inteligentes **para** obtener recomendaciones de negocio. | Baja |
| US-094 | **Como** administrador, **quiero** filtrar informes por rango de fechas **para** analizar períodos específicos. | Media |

### ÉPICA 10: Análisis de Mercado

| ID | Historia de Usuario | Prioridad |
|----|---------------------|-----------|
| US-100 | **Como** administrador, **quiero** ver lista de competidores con precios y calificaciones **para** analizar el mercado. | Media |
| US-101 | **Como** administrador, **quiero** ver KPIs resumidos del mercado **para** entender el panorama general. | Media |
| US-102 | **Como** administrador, **quiero** comparar mis precios con competidores **para** ajustar mi estrategia de precios. | Media |
| US-103 | **Como** administrador, **quiero** recibir insights de mercado **para** identificar oportunidades. | Baja |

### ÉPICA 11: Perfil y Configuración

| ID | Historia de Usuario | Prioridad |
|----|---------------------|-----------|
| US-110 | **Como** usuario autenticado, **quiero** ver mi información de perfil **para** verificar mis datos. | Alta |
| US-111 | **Como** usuario autenticado, **quiero** editar mi información personal **para** mantenerla actualizada. | Alta |
| US-112 | **Como** usuario autenticado, **quiero** cambiar mi foto de perfil **para** tener una imagen actualizada. | Media |
| US-113 | **Como** usuario autenticado, **quiero** gestionar mis redes sociales conectadas **para** vincular/desvincular cuentas. | Media |
| US-114 | **Como** usuario que deja la plataforma, **quiero** desactivar mi cuenta **para** ocultar mi perfil. | Media |
| US-115 | **Como** usuario que desea irse, **quiero** eliminar mi cuenta permanentemente **para** borrar todos mis datos. | Baja |

---

## 8. CRITERIOS DE ACEPTACIÓN

### MÓDULO: AUTENTICACIÓN

#### US-001: Registro de Usuario

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-001-01 | Estoy en la página de registro | Ingreso email válido, contraseña válida (mín 8 chars) y nombre completo | El sistema crea mi cuenta y me redirige al dashboard |
| CA-001-02 | Estoy en la página de registro | Ingreso un email ya registrado | El sistema muestra error "El email ya está registrado" |
| CA-001-03 | Estoy en la página de registro | Ingreso contraseña menor a 8 caracteres | El sistema muestra error de validación |
| CA-001-04 | Estoy en la página de registro | Dejo campos obligatorios vacíos | El sistema previene el envío y muestra campos requeridos |
| CA-001-05 | Estoy en la página de registro | El registro es exitoso | Recibo un token JWT de 30 minutos de duración |

#### US-002: Inicio de Sesión

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-002-01 | Estoy en la página de login | Ingreso credenciales correctas | El sistema me redirige al dashboard y almacena el JWT |
| CA-002-02 | Estoy en la página de login | Ingreso email válido pero contraseña incorrecta | El sistema muestra error "Credenciales inválidas" |
| CA-002-03 | Estoy en la página de login | Ingreso email no registrado | El sistema muestra error "Credenciales inválidas" |
| CA-002-04 |Estoy en la página de login | Mis credenciales son válidas | El sistema guarda el token en localStorage |
| CA-002-05 |Tengo un token válido | El token expira (30 min) | El sistema me redirige al login mostrando "Sesión expirada" |

#### US-003: Ver Perfil

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-003-01 | Estoy autenticado | Voy a la página de perfil | Se muestra mi nombre, email, rol y avatar |
| CA-003-02 | Estoy autenticado | Solicito /auth/me | El sistema devuelve mis datos completos |

#### US-004: Actualizar Perfil

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-004-01 | Estoy en mi perfil | Actualizo mi nombre | El sistema guarda el cambio y refleja en la UI |
| CA-004-02 | Estoy en mi perfil | Actualizo mi email | El sistema guarda el cambio y refleja en la UI |
| CA-004-03 | Estoy en mi perfil | Cambio a un email ya usado por otro | El sistema muestra error de conflicto |
| CA-004-04 | Estoy en mi perfil | Actualizo mi perfil exitosamente | El cambio se refleja inmediatamente en el header/sidebar |

#### US-005: Subir Avatar

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-005-01 | Estoy en mi perfil | Subo una imagen JPG válida (<2MB) | El sistema procesa, recorta y guarda mi avatar |
| CA-005-02 | Estoy en mi perfil | Subo una imagen PNG válida (<2MB) | El sistema procesa, recorta y guarda mi avatar |
| CA-005-03 | Estoy en mi perfil | Subo un video en lugar de imagen | El sistema rechaza con error "Formato no permitido" |
| CA-005-04 | Estoy en mi perfil | Subo imagen >2MB | El sistema rechaza con error "Tamaño máximo 2MB" |
| CA-005-05 |Estoy en mi perfil | Subo imagen en formato no permitido (ej: bmp) | El sistema rechaza con error "Formato no permitido" |

#### US-006: Desactivar Cuenta

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-006-01 | Estoy en mi perfil | Solicito desactivar cuenta | El sistema pide confirmación con modal |
| CA-006-02 | Confirmo desactivamiento | El sistema marca is_active=false | No puedo iniciar sesión nuevamente |
| CA-006-03 | Desactivas mi cuenta | Otro usuario ve mi perfil | Mi perfil no aparece en búsquedas ni listados |

#### US-007: Eliminar Cuenta Permanente

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-007-01 | Estoy en mi perfil | Solicito eliminación permanente | El sistema pide confirmación doble con texto |
| CA-007-02 | Confirmo con texto exacto | El sistema elimina mi cuenta y todos mis datos | No puedo iniciar sesión y mis datos son removidos |
| CA-007-03 | Eliminé mi cuenta | Intento registrarme con el mismo email | El sistema permite el registro (datos borrados) |

---

### MÓDULO: PRODUCTOS

#### US-010: Crear Producto

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-010-01 | Soy admin/vendedor | Creo producto con todos los campos obligatorios | El producto se crea exitosamente en la base de datos |
| CA-010-02 | Soy admin/vendedor | Creo producto sin nombre | El sistema previene el envío y marca nombre como requerido |
| CA-010-03 | Soy admin/vendedor | Creo producto sin categoría | El sistema asigna "General" por defecto |
| CA-010-04 | Soy admin/vendedor | Creo producto con precio negativo | El sistema previene con error de validación |
| CA-010-05 | Soy cliente | Intento crear producto | El sistema retorna error 403 Forbidden |
| CA-010-06 | Soy admin/vendedor | Creo producto con imagen y video | Ambos archivos se suben y almacenan correctamente |

#### US-011: Listar Productos

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-011-01 | Soy admin/vendedor | Accedo a la página de productos | Se muestra lista de mis productos en formato grid o tabla |
| CA-011-02 | Tengo productos | Visualizo la lista | Cada producto muestra nombre, precio, categoría y estado |
| CA-011-03 | Tengo más de 10 productos | Visualizo la lista | Se aplica paginación de 10 productos por página |

#### US-012: Filtrar Productos

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-012-01 | Estoy en productos | Filtro por categoría "Alimentos" | Solo se muestran productos de esa categoría |
| CA-012-02 | Estoy en productos | Filtro por estado "inactive" | Solo se muestran productos inactivos |
| CA-012-03 | Estoy en productos | Filtro por categoría y estado | Se muestran productos que cumplen ambos criterios |

#### US-013: Editar Producto

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-013-01 | Soy admin/vendedor | Edito nombre de producto | El cambio se refleja inmediatamente en la lista |
| CA-013-02 | Soy admin/vendedor | Edito precio a 0 | El sistema permite (producto gratis) |
| CA-013-03 | Soy cliente | Intento editar cualquier producto | El sistema retorna error 403 |

#### US-014: Eliminar Producto

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-014-01 | Soy admin/vendedor | Elimino un producto | El producto se elimina y no aparece en la lista |
| CA-014-02 | El producto tiene imagen | Elimino el producto | La imagen asociada también se elimina del almacenamiento |
| CA-014-03 | Soy cliente | Intento eliminar producto | El sistema retorna error 403 |

---

### MÓDULO: SERVICIOS

#### US-020: Crear Servicio

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-020-01 | Soy admin/vendedor | Creo servicio con nombre, precio y duración | El servicio se crea exitosamente |
| CA-020-02 | Soy admin/vendedor | Creo servicio sin duración | El campo duración queda vacío (nullable) |
| CA-020-03 | Soy cliente | Intento crear servicio | El sistema retorna error 403 |

#### US-021-026 | Los criterios de listar, filtrar, editar y eliminar servicios son análogos a los de productos (CA-011 a CA-014)

---

### MÓDULO: WALL (MURO SOCIAL)

#### US-030: Crear Publicación

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-030-01 | Estoy autenticado | Creo publicación tipo "Impact" con texto | La publicación aparece en el feed con el tipo especificado |
| CA-030-02 | Estoy autenticado | Creo publicación sin contenido | El sistema previene con error "Contenido requerido" |
| CA-030-03 | Estoy autenticado | Creo publicación con imagen | La imagen se sube y adjunta al post |
| CA-030-04 | Estoy autenticado | Creo publicación tipo "Donation" | El post se categoriza como Donation |

#### US-032: Ver Feed de Publicaciones

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-032-01 | Estoy en el wall | Veo el feed | Las publicaciones aparecen en orden cronológico inverso (más recientes primero) |
| CA-032-02 | Hay publicaciones con comentarios | Veo una publicación | Se muestra el contador de comentarios |
| CA-032-03 | Hay publicaciones con editor | Veo una publicación editada | Se muestra etiqueta "Editado" |

#### US-033: Actualizaciones en Tiempo Real

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-033-01 | Tengo el wall abierto | Otro usuario crea un post | Mi feed se actualiza automáticamente sin refrescar |
| CA-033-02 | Tengo el wall abierto | Alguien comenta en un post | Veo el nuevo comentario instantáneamente |
| CA-033-03 | pierdo conexión WebSocket | Se corta la conexión | El sistema intenta reconectar automáticamente |
| CA-033-04 | Se reconecta | Vuelvo a tener conexión | Recibo los eventos que ocurrieron durante la desconexión |

#### US-034: Comentar en Publicación

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-034-01 | Estoy en un post | Escribo comentario y presiono Enter | El comentario se guarda y aparece en la lista |
| CA-034-02 | Estoy en un post | Dejo el comentario vacío | El sistema previene el envío |
| CA-034-03 | Comento en un post | Otro usuario ve el post | Ve mi comentario en tiempo real |

#### US-035: Editar Publicación

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-035-01 | Soy autor del post | Edito mi publicación | El contenido se actualiza y se muestra etiqueta "Editado" |
| CA-035-02 | No soy autor del post | Intento editar | El sistema retorna error 403 |
| CA-035-03 | Soy admin | Intento editar post de otro | El sistema permite la edición (moderación) |

#### US-036: Eliminar Publicación

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-036-01 | Soy autor del post | Elimino mi publicación | El post se elimina y desaparece del feed |
| CA-036-02 | No soy autor | Intento eliminar | El sistema retorna error 403 |

---

### MÓDULO: BILLING (FACTURACIÓN)

#### US-070: Listar Facturas

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-070-01 | Soy admin/vendedor | Accedo a facturación | Se muestra tabla con facturas (mock data) |
| CA-070-02 | Hay facturas pendientes | Visualizo la lista | Se muestran badges de estado (paid, pending, overdue) |

#### US-072: Ver Resumen Financiero

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-072-01 | Soy admin/vendedor | Veo el dashboard de billing | Se muestran 3 tarjetas: Ingresos, Gastos, Balance |
| CA-072-02 | Los datos son mock | Los valores no reflejan datos reales | Los valores son estáticos para demo |

---

### MÓDULO: AGENDA

#### US-080: Ver Calendario

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-080-01 | Accedo a la agenda | Visualizo el calendario | Se muestra calendario mensual con navegación |
| CA-080-02 | Hay citas ese día | Veo un día con citas | Se muestran indicadores de estado en las celdas |
| CA-080-03 | No hay citas | Veo un día vacío | La celda aparece vacía o con indicador "Libre" |

#### US-082: Crear Cita

| Criterio | Dado | Cuando | Entonces |
|----------|------|---------|----------|
| CA-082-01 | Soy admin/vendedor | Creo una nueva cita | Se muestra toast "Próximamente disponible" (funcionalidad no implementada) |
| CA-082-02 | El módulo no tiene backend | Creo una cita | No se persiste en base de datos |

---

## 9. CASOS DE PRUEBA

### 9.1 Casos de Prueba: Autenticación

| ID CP | Módulo | Título | Pasos | Datos de Entrada | Resultado Esperado | Prioridad |
|-------|--------|--------|-------|------------------|-------------------|-----------|
| CP-AUTH-001 | Auth | Registro exitoso de usuario | 1. Ir a /register 2. Llenar email: test@example.com, password: Test1234, full_name: Test User 3. Click en Registrarse | email: test@example.com, password: Test1234, full_name: Test User | Usuario creado, redirige a /dashboard, token JWT almacenado | Alta |
| CP-AUTH-002 | Auth | Registro con email duplicado | 1. Ir a /register 2. Ingresar email ya registrado 3. Intentar registrarse | email: existente@test.com, password: Test1234 | Error visible: "El email ya está registrado" | Alta |
| CP-AUTH-003 | Auth | Registro con contraseña corta | 1. Ir a /register 2. Ingresar password de 5 caracteres 3. Intentar registrarse | password: abc | Error de validación bajo el campo contraseña | Alta |
| CP-AUTH-004 | Auth | Login exitoso | 1. Ir a /login 2. Ingresar credenciales válidas 3. Click en Login | email: test@example.com, password: Test1234 | Redirige a /dashboard, token en localStorage | Alta |
| CP-AUTH-005 | Auth | Login con contraseña incorrecta | 1. Ir a /login 2. Ingresar password incorrecto 3. Click en Login | email: test@example.com, password: WrongPass | Error: "Credenciales inválidas" | Alta |
| CP-AUTH-006 | Auth | Login con email no registrado | 1. Ir a /login 2. Ingresar email no existente 3. Click en Login | email: nonexistent@test.com, password: Test1234 | Error: "Credenciales inválidas" | Alta |
| CP-AUTH-007 | Auth | Token expira después de 30 min | 1. Login 2. Esperar 30 minutos 3. Hacer cualquier request | Token expirado | Redirige a /login con mensaje "Sesión expirada" | Alta |
| CP-AUTH-008 | Auth | Acceso sin token | 1. Intentar acceder a /dashboard sin login previo | Sin token | Redirige a /login | Alta |
| CP-AUTH-009 | Auth | Subir avatar válido | 1. Ir a /profile 2. Click en cambiar avatar 3. Seleccionar imagen JPG <2MB | archivo: avatar.jpg (1.5MB) | Avatar se muestra en perfil | Media |
| CP-AUTH-010 | Auth | Subir avatar muy grande | 1. Ir a /profile 2. Click en cambiar avatar 3. Seleccionar imagen >2MB | archivo: large_avatar.jpg (3MB) | Error: "Tamaño máximo 2MB" | Media |
| CP-AUTH-011 | Auth | Desactivar cuenta | 1. Ir a /profile 2. Click desactivar cuenta 3. Confirmar en modal | Confirmación | is_active=false, redirige a login | Media |
| CP-AUTH-012 | Auth | Eliminar cuenta permanente | 1. Ir a /profile 2. Click eliminar cuenta 3. Escribir "ELIMINAR" 4. Confirmar | Texto: ELIMINAR | Cuenta y datos eliminados completamente | Baja |

### 9.2 Casos de Prueba: Productos

| ID CP | Módulo | Título | Pasos | Datos de Entrada | Resultado Esperado | Prioridad |
|-------|--------|--------|-------|------------------|-------------------|-----------|
| CP-PROD-001 | Products | Crear producto completo | 1. Ir a /products 2. Click en Nuevo Producto 3. Llenar todos los campos 4. Guardar | name: "Pizza Margarita", category: "Alimentos", price: 25000, stock: 50, status: "active" | Producto creado y visible en lista | Alta |
| CP-PROD-002 | Products | Crear producto solo campos requeridos | 1. Ir a /products 2. Nuevo Producto 3. Llenar solo nombre y precio 4. Guardar | name: "Agua", price: 3000 | Producto creado con category="General", stock=0, status="active" | Alta |
| CP-PROD-003 | Products | Crear producto sin nombre | 1. Nuevo Producto 2. Llenar solo precio 3. Intentar guardar | price: 10000 | Error: "Nombre es requerido" | Alta |
| CP-PROD-004 | Products | Filtrar por categoría | 1. Ir a /products 2. Seleccionar filtro categoría: "Bebidas" | category: "Bebidas" | Solo se muestran productos de categoría Bebidas | Media |
| CP-PROD-005 | Products | Filtrar por estado | 1. Ir a /products 2. Seleccionar filtro estado: "inactive" | status: "inactive" | Solo se muestran productos inactivos | Media |
| CP-PROD-006 | Products | Editar producto | 1. En lista de productos, click en editar de un producto 2. Cambiar nombre 3. Guardar | new name: "Pizza Napolitana" | Nombre actualizado en lista | Alta |
| CP-PROD-007 | Products | Eliminar producto | 1. En lista, click en eliminar de un producto 2. Confirmar | Confirmación | Producto removido de lista | Alta |
| CP-PROD-008 | Products | Cliente no puede crear producto | 1. Login como cliente 2. Ir a /products 3. Intentar crear | Rol: client | Error 403 Forbidden | Alta |
| CP-PROD-009 | Products | Cambiar vista grid/tabla | 1. Ir a /products 2. Toggle vista | Click en botón grid/tabla | Vista cambia manteniendo datos | Baja |
| CP-PROD-010 | Products | Subir imagen a producto | 1. Crear/editar producto 2. Subir imagen 3. Guardar | archivo: producto.jpg | Imagen se guarda y muestra en card | Media |

### 9.3 Casos de Prueba: Servicios

| ID CP | Módulo | Título | Pasos | Datos de Entrada | Resultado Esperado | Prioridad |
|-------|--------|--------|-------|------------------|-------------------|-----------|
| CP-SERV-001 | Services | Crear servicio con duración | 1. Ir a /services 2. Nuevo Servicio 3. Llenar nombre, precio, duración 4. Guardar | name: "Corte de cabello", price: 15000, duration: "45 min" | Servicio creado con duración mostrada | Alta |
| CP-SERV-002 | Services | Crear servicio sin duración | 1. Nuevo Servicio 2. Llenar nombre y precio 3. Dejar duración vacío 4. Guardar | name: "Consulta", price: 50000 | Servicio creado con duración null | Media |
| CP-SERV-003 | Services | Listar servicios activos | 1. Ir a /services | Filtro default: status="active" | Solo servicios activos en lista inicial | Alta |

### 9.4 Casos de Prueba: Wall

| ID CP | Módulo | Título | Pasos | Datos de Entrada | Resultado Esperado | Prioridad |
|-------|--------|--------|-------|------------------|-------------------|-----------|
| CP-WALL-001 | Wall | Crear post de impacto | 1. Ir a /wall 2. Escribir contenido 3. Seleccionar tipo "Impact" 4. Publicar | content: "Hoy donamos 50 comidas", type: "Impact" | Post creado y visible en feed con tipo Impact | Alta |
| CP-WALL-002 | Wall | Crear post sin contenido | 1. Ir a /wall 2. Dejar contenido vacío 3. Intentar publicar | content: "" | Error: "Contenido requerido" | Alta |
| CP-WALL-003 | Wall | Comentar en post | 1. En un post, escribir comentario 2. Presionar Enter | content: "¡Gran impacto!" | Comentario creado y visible | Alta |
| CP-WALL-004 | Wall | Editar propio post | 1. En post propio, click editar 2. Modificar contenido 3. Guardar | new content: "Actualizado" | Contenido actualizado, etiqueta "Editado" visible | Media |
| CP-WALL-005 | Wall | Eliminar propio post | 1. En post propio, click eliminar 2. Confirmar | Confirmación | Post eliminado del feed | Media |
| CP-WALL-006 | Wall | Buscar usuario para mención | 1. En composer, escribir @ 2. Comenzar a escribir nombre | q: "Juan" | Se muestran usuarios que coinciden | Baja |
| CP-WALL-007 | Wall | Actualización en tiempo real | 1. Abrir /wall en dos navegadores 2. En uno crear post | Post en otro navegador | Post aparece automáticamente sin refresh | Alta |
| CP-WALL-008 | Wall | No puedo editar post de otro (no admin) | 1. Post de otro usuario 2. No veo botón editar | post de otro usuario | Botón editar no visible | Alta |
| CP-WALL-009 | Wall | Admin puede editar cualquier post | 1. Login como admin 2. Post de otro usuario 3. Click editar | Admin logueado | Puede editar cualquier post | Alta |
| CP-WALL-010 | Wall | Subir media en post | 1. Crear/editar post 2. Adjuntar imagen 3. Publicar | archivo: imagen.jpg | Media se sube y adjunta al post | Media |

### 9.5 Casos de Prueba: Social

| ID CP | Módulo | Título | Pasos | Datos de Entrada | Resultado Esperado | Prioridad |
|-------|--------|--------|-------|------------------|-------------------|-----------|
| CP-SOC-001 | Social | Listar cuentas conectadas | 1. Ir a /profile 2. Pestaña redes sociales | - | Lista de cuentas sociales conectadas | Media |
| CP-SOC-002 | Social | Publicar en red social | 1. En producto, click compartir 2. Seleccionar plataforma 3. Publicar | platform: "facebook", product_id | Post creado con status="pending" | Media |
| CP-SOC-003 | Social | Ver historial de posts | 1. Ir a configuración social | - | Lista de posts publicados con estados | Media |

### 9.6 Casos de Prueba: Dashboard

| ID CP | Módulo | Título | Pasos | Datos de Entrada | Resultado Esperado | Prioridad |
|-------|--------|--------|-------|------------------|-------------------|-----------|
| CP-DASH-001 | Dashboard | Ver KPIs | 1. Ir a /dashboard | - | Se muestran 4 tarjetas KPI con valores | Alta |
| CP-DASH-002 | Dashboard | Ver gráfico de tendencia | 1. Ir a /dashboard | - | Gráfico de línea con datos de ventas | Media |
| CP-DASH-003 | Dashboard | Ver actividad reciente | 1. Ir a /dashboard | - | Lista de actividades recientes | Media |
| CP-DASH-004 | Dashboard | Acciones rápidas | 1. Ir a /dashboard 2. Click en acción rápida | action: "Ver productos" | Navega a /products | Baja |

### 9.7 Casos de Prueba: Billing

| ID CP | Módulo | Título | Pasos | Datos de Entrada | Resultado Esperado | Prioridad |
|-------|--------|--------|-------|------------------|-------------------|-----------|
| CP-BILL-001 | Billing | Ver lista de facturas | 1. Login como admin/vendedor 2. Ir a /billing | - | Tabla con facturas (mock) | Alta |
| CP-BILL-002 | Billing | Ver resumen financiero | 1. Ir a /billing | - | 3 tarjetas: Ingresos, Gastos, Balance | Alta |
| CP-BILL-003 | Billing | Filtrar por estado | 1. En billing, filtro estado: "pending" | status: "pending" | Solo facturas pending | Media |
| CP-BILL-004 | Billing | Exportar facturas | 1. Click en exportar | - | Toast "Próximamente disponible" | Baja |
| CP-BILL-005 | Billing | Cliente no puede acceder | 1. Login como cliente 2. Ir a /billing | - | Redirige a /unauthorized | Alta |

### 9.8 Casos de Prueba: Agenda

| ID CP | Módulo | Título | Pasos | Datos de Entrada | Resultado Esperado | Prioridad |
|-------|--------|--------|-------|------------------|-------------------|-----------|
| CP-AGEN-001 | Agenda | Ver calendario | 1. Ir a /agenda | - | Calendario mensual visible | Alta |
| CP-AGEN-002 | Agenda | Navegar entre meses | 1. En calendario, click siguiente mes | - | Calendario muestra mes siguiente | Media |
| CP-AGEN-003 | Agenda | Ver detalle de día | 1. Click en un día con citas | - | Panel lateral muestra citas del día | Media |
| CP-AGEN-004 | Agenda | Crear cita | 1. Click en nueva cita 2. Llenar datos 3. Guardar | - | Toast "Próximamente" (no implementado) | Media |

### 9.9 Casos de Prueba: Profile

| ID CP | Módulo | Título | Pasos | Datos de Entrada | Resultado Esperado | Prioridad |
|-------|--------|--------|-------|------------------|-------------------|-----------|
| CP-PROF-001 | Profile | Ver perfil | 1. Click en mi perfil | - | Datos: nombre, email, rol, avatar | Alta |
| CP-PROF-002 | Profile | Editar nombre | 1. Editar campo nombre 2. Guardar | new name: "Juan Pérez" | Nombre actualizado | Alta |
| CP-PROF-003 | Profile | Subir avatar con recorte | 1. Click cambiar avatar 2. Seleccionar imagen 3. Recortar 4. Guardar | archivo: new_avatar.jpg | Nuevo avatar visible | Media |
| CP-PROF-004 | Profile | Ver redes sociales | 1. Ir a perfil 2. Pestaña redes sociales | - | Lista de cuentas conectadas | Media |
| CP-PROF-005 | Profile | Desactivar cuenta | 1. Configuración 2. Desactivar 3. Confirmar | confirmation | is_active=false | Media |

### 9.10 Casos de Prueba: Permissions (RBAC)

| ID CP | Módulo | Título | Pasos | Datos de Entrada | Resultado Esperado | Prioridad |
|-------|--------|--------|-------|------------------|-------------------|-----------|
| CP-RBAC-001 | Permissions | Admin puede acceder a todo | 1. Login como admin 2. Acceder a /statistics, /market, /billing | roles: admin | Acceso permitido a todas las rutas | Alta |
| CP-RBAC-002 | Permissions | Seller puede acceder a productos | 1. Login como seller 2. Ir a /products | roles: seller | Acceso permitido | Alta |
| CP-RBAC-003 | Permissions | Seller NO puede acceder a statistics | 1. Login como seller 2. Ir a /statistics | roles: seller | Redirige a /unauthorized | Alta |
| CP-RBAC-004 | Permissions | Client NO puede acceder a billing | 1. Login como client 2. Ir a /billing | roles: client | Redirige a /unauthorized | Alta |
| CP-RBAC-005 | Permissions | Client NO puede crear productos | 1. Login como client 2. POST /api/v1/products | roles: client | Error 403 Forbidden | Alta |
| CP-RBAC-006 | Permissions | Client puede ver productos | 1. Login como client 2. GET /api/v1/products | roles: client | Lista de productos returned | Alta |

---

## 10. MATRIZ DE TRAZABILIDAD

### 10.1 Épicas vs Historias de Usuario

| Épica | Código | Historias de Usuario |
|-------|--------|---------------------|
| Autenticación y Gestión de Usuarios | EP-001 | US-001, US-002, US-003, US-004, US-005, US-006, US-007 |
| Catálogo de Productos | EP-002 | US-010, US-011, US-012, US-013, US-014, US-015, US-016 |
| Catálogo de Servicios | EP-003 | US-020, US-021, US-022, US-023, US-024, US-025, US-026 |
| Muro Social | EP-004 | US-030, US-031, US-032, US-033, US-034, US-035, US-036, US-037, US-038, US-039, US-040 |
| Integración con Redes Sociales | EP-005 | US-050, US-051, US-052, US-053, US-054, US-055 |
| Dashboard y Analítica | EP-006 | US-060, US-061, US-062, US-063, US-064 |
| Facturación y Cuentas por Cobrar | EP-007 | US-070, US-071, US-072, US-073, US-074 |
| Agenda y Citas | EP-008 | US-080, US-081, US-082, US-083, US-084 |
| Estadísticas e Informes | EP-009 | US-090, US-091, US-092, US-093, US-094 |
| Análisis de Mercado | EP-010 | US-100, US-101, US-102, US-103 |
| Perfil y Configuración | EP-011 | US-110, US-111, US-112, US-113, US-114, US-115 |

### 10.2 Historias de Usuario vs Criterios de Aceptación

| Historia de Usuario | Criterios de Aceptación |
|---------------------|--------------------------|
| US-001 | CA-001-01, CA-001-02, CA-001-03, CA-001-04, CA-001-05 |
| US-002 | CA-002-01, CA-002-02, CA-002-03, CA-002-04, CA-002-05 |
| US-003 | CA-003-01, CA-003-02 |
| US-004 | CA-004-01, CA-004-02, CA-004-03, CA-004-04 |
| US-005 | CA-005-01, CA-005-02, CA-005-03, CA-005-04, CA-005-05 |
| US-006 | CA-006-01, CA-006-02, CA-006-03 |
| US-007 | CA-007-01, CA-007-02, CA-007-03 |
| US-010 | CA-010-01, CA-010-02, CA-010-03, CA-010-04, CA-010-05, CA-010-06 |
| US-011 | CA-011-01, CA-011-02, CA-011-03 |
| US-012 | CA-012-01, CA-012-02, CA-012-03 |
| US-013 | CA-013-01, CA-013-02, CA-013-03 |
| US-014 | CA-014-01, CA-014-02, CA-014-03 |
| US-030 | CA-030-01, CA-030-02, CA-030-03, CA-030-04 |
| US-032 | CA-032-01, CA-032-02, CA-032-03 |
| US-033 | CA-033-01, CA-033-02, CA-033-03, CA-033-04 |
| US-034 | CA-034-01, CA-034-02, CA-034-03 |
| US-035 | CA-035-01, CA-035-02, CA-035-03 |
| US-036 | CA-036-01, CA-036-02 |
| US-070 | CA-070-01, CA-070-02 |
| US-072 | CA-072-01, CA-072-02 |
| US-080 | CA-080-01, CA-080-02, CA-080-03 |
| US-082 | CA-082-01, CA-082-02 |

### 10.3 Criterios de Aceptación vs Casos de Prueba

| Criterio de Aceptación | Casos de Prueba |
|------------------------|-----------------|
| CA-001-01 | CP-AUTH-001 |
| CA-001-02 | CP-AUTH-002 |
| CA-001-03 | CP-AUTH-003 |
| CA-002-01 | CP-AUTH-004 |
| CA-002-02 | CP-AUTH-005 |
| CA-002-03 | CP-AUTH-006 |
| CA-002-05 | CP-AUTH-007 |
| CA-003-01 | CP-AUTH-008 (implied) |
| CA-005-01 | CP-AUTH-009 |
| CA-005-04 | CP-AUTH-010 |
| CA-006-01 | CP-AUTH-011 |
| CA-007-02 | CP-AUTH-012 |
| CA-010-01 | CP-PROD-001 |
| CA-010-02 | CP-PROD-002 |
| CA-010-03 | CP-PROD-002 (implied) |
| CA-010-04 | (validation test) |
| CA-010-05 | CP-PROD-008 |
| CA-011-01 | CP-PROD-001 (implied) |
| CA-012-01 | CP-PROD-004 |
| CA-012-02 | CP-PROD-005 |
| CA-013-01 | CP-PROD-006 |
| CA-014-01 | CP-PROD-007 |
| CA-030-01 | CP-WALL-001 |
| CA-030-02 | CP-WALL-002 |
| CA-030-03 | CP-WALL-010 |
| CA-034-01 | CP-WALL-003 |
| CA-035-01 | CP-WALL-004 |
| CA-036-01 | CP-WALL-005 |
| CA-033-01 | CP-WALL-007 |
| CA-070-01 | CP-BILL-001 |
| CA-072-01 | CP-BILL-002 |
| CA-080-01 | CP-AGEN-001 |
| CA-082-01 | CP-AGEN-004 |

---

## 11. ESTADO DE IMPLEMENTACIÓN

### 11.1 Porcentaje de Completitud

| Módulo | Backend | Frontend | Estado General |
|--------|---------|---------|----------------|
| Auth & User Management | 100% | 100% | ✅ Completo |
| Product Catalog | 100% | 100% | ✅ Completo |
| Service Catalog | 100% | 100% | ✅ Completo |
| Social Wall | 100% | 100% | ✅ Completo (incluye WebSocket) |
| Social Media Integration | 60% | 70% | ⚠️ Parcial |
| Dashboard & Analytics | N/A | 70% | ⚠️ Datos mock |
| Billing & Invoicing | 0% | 70% | ⚠️ Datos mock, sin backend |
| Agenda & Scheduling | 0% | 70% | ⚠️ Datos mock, sin backend |
| Statistics & Reporting | N/A | 60% | ⚠️ Datos mock |
| Market Analysis | N/A | 60% | ⚠️ Datos mock |
| Profile & Settings | 100% | 100% | ✅ Completo |

**Promedio Ponderado de Avance: ~65%**

### 11.2 Endpoints por Estado

| Estado | Count | Porcentaje |
|--------|-------|------------|
| Implementados y funcionando | 35 | 70% |
| Parciales (schema/stub) | 8 | 16% |
| No implementados | 7 | 14% |

---

## 12. RIESGOS Y DEPENDENCIAS

### 12.1 Riesgos Identificados

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|----|--------|--------------|---------|------------|
| RSG-001 | Módulo Billing sin backend implementado | Alta | Alto | Priorizar desarrollo del backend de billing |
| RSG-002 | Módulo Agenda sin backend implementado | Alta | Alto | Priorizar desarrollo del backend de agenda |
| RSG-003 | JWT de 30 min demasiado corto | Media | Medio | Implementar refresh tokens |
| RSG-004 | Datos mock en Dashboard/Statistics confunden | Alta | Medio | Implementar APIs reales progresivamente |
| RSG-005 | Integración social OAuth no completada | Alta | Alto | Planificar OAuth flow para cada plataforma |
| RSG-006 | No hay tests de integración E2E | Alta | Alto | Implementar Playwright/Cypress |
| RSG-007 | Sin paginación en wall (límite por defecto) | Media | Bajo | Implementar paginación completa |
| RSG-008 | No hay validación de roles granular | Media | Medio | Implementar permisos por rol más detallados |
| RSG-009 | Almacenamiento de archivos local (no cloud) | Media | Medio | Planificar migración a S3/cloud storage |
| RSG-010 | Sin email notifications | Media | Bajo | Implementar servicio de email (SendGrid/SES) |

### 12.2 Dependencias Técnicas

| Dependencia | Tipo | Notas |
|-------------|------|-------|
| PostgreSQL 15 | Base de datos | Requerido para el ORM async |
| Python 3.11+ | Runtime | minimum para asyncpg |
| Node 18+ | Frontend build | Requerido para Vite |
| Docker + Docker Compose | Deployment | Para desarrollo y producción |
| JWT (python-jose) | Autenticación | Dependiente de SECRET_KEY configurada |
| WebSocket support | Tiempo real | Uvicorn + fastapi websocket |

### 12.3 Dependencias de Negocio

| Dependencia | Prioridad | Descripción |
|-------------|-----------|-------------|
| OAuth providers (FB, IG, TikTok) | Media | API keys para integración social |
| Pasarela de pagos | Alta | Para billing real (ej: PayU, Wompi) |
| Servicio de email | Baja | Para notificaciones y password reset |
| Storage cloud | Media | Para almacenar imágenes/videos en producción |

---

## ANEXO A: Configuración de Roles

```javascript
// Frontend/src/config/appConfig.js
ROLES: {
  ADMIN: 'admin',    // Administrador - acceso total
  SELLER: 'seller',  // Vendedor - gestión de productos/servicios
  CLIENT: 'client'  // Cliente - vista limitada
}
```

### Permisos por Rol

| Feature | Admin | Seller | Client |
|---------|-------|--------|--------|
| Ver Dashboard | ✓ | ✓ | ✓ |
| Gestionar Productos | ✓ | ✓ | ✗ |
| Gestionar Servicios | ✓ | ✓ | ✗ |
| Ver Wall | ✓ | ✓ | ✓ |
| Crear Posts | ✓ | ✓ | ✓ |
| Ver Billing | ✓ | ✓ | ✗ |
| Ver Agenda | ✓ | ✓ | ✓ |
| Ver Statistics | ✓ | ✗ | ✗ |
| Ver Market | ✓ | ✗ | ✗ |
| Publicar en Social | ✓ | ✓ | ✗ |

---

## ANEXO B: Tipos de Dato por Plataforma

### Post Types (Wall)

| Type | Descripción | Uso |
|------|-------------|-----|
| `General` | Publicación general | Default |
| `Donation` | Donación de productos/servicios | Impacto social |
| `Testimony` | Testimonio de cliente/beneficiario | Historias |
| `Impact` | Reporte de impacto generado | Métricas |

### Product Status

| Status | Descripción |
|--------|-------------|
| `active` | Producto disponible para venta |
| `inactive` | Producto no disponible |
| `out_of_stock` | Sin stock disponible |

### Invoice Status

| Status | Descripción |
|--------|-------------|
| `paid` | Factura pagada |
| `pending` | Pendiente de pago |
| `overdue` | Vencida |
| `cancelled` | Cancelada |

### Agenda Status

| Status | Descripción |
|--------|-------------|
| `free` | Franja horaria libre |
| `pending` | Reserva pendiente |
| `busy` | Ocupado con cita confirmada |
| `blocked` | Bloqueado (no disponible) |

### Social Platforms

| Platform | Disponibilidad |
|----------|----------------|
| `facebook` | OAuth parcial |
| `instagram` | OAuth parcial |
| `tiktok` | OAuth parcial |

---

## ANEXO C: Variables de Entorno

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

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:8000/api/v1
```

---

*Documento generado: 13 de Mayo de 2026*
*Versión del proyecto: 1.0.0*
*Estado: En Desarrollo (~65% completado)*