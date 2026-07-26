# SERVINOW CONTEXT V8

> Última actualización: Julio 2026
> Estado del proyecto: MVP Avanzado / Integración Completa de Facturación y Redes Sociales (~8.5/10)

---

## TABLA DE CONTENIDOS

1. [Visión General del Proyecto](#1-visión-general-del-proyecto)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Inventario de Módulos](#3-inventario-de-módulos)
4. [Sistema de Diseño](#4-sistema-de-diseño)
5. [Gestión de Estado](#5-gestión-de-estado)
6. [Modelo de Negocio](#6-modelo-de-negocio)
7. [Seguridad](#7-seguridad)
8. [Deuda Técnica](#8-deuda-técnica)
9. [Gaps de Backend](#9-gaps-de-backend)
10. [Roadmap Priorizado](#10-roadmap-priorizado)

---

## 1. VISIÓN GENERAL DEL PROYECTO

### Descripción
**ServiNow** es una plataforma de gestión para PyMEs (SMEs) colombianas con un componente social integrado. Su tagline es: *"Servir es el único negocio donde todos ganan"*.

En la versión **V8**, el proyecto ha logrado la **unificación total** de sus dos grandes ramas de desarrollo:
1. **Facturación Electrónica V2:** Plena integración con el webservice DIAN (UBL 2.1, CUFE, códigos QR), generación de PDF (ReportLab), notas crédito y envío automático de facturas por correo electrónico (plantillas Jinja2).
2. **Módulo de Redes Sociales Completo (OAuth):** Flujo completo de autorización (OAuth 2.0) y publicación automática para plataformas como Facebook, Instagram y TikTok, con generación dinámica de imágenes de compartición.
3. **Módulo de Categorías Unificado:** Relaciones relacionales reales en bases de datos con el nuevo modelo `Category` jerárquico para productos y servicios en lugar de strings planos.

### Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Frontend** | React + Vite | 18.3.1 / 5.4.21 |
| **Gestión de Paquetes**| PNPM (Monorepo Workspace) | 9.x / Workspace |
| **Estado** | Zustand | 4.5.7 |
| **Routing** | React Router DOM | 6.30.4 |
| **Charts** | Chart.js + react-chartjs-2 | 4.5.1 / 5.3.1 |
| **Icons** | Lucide React | 0.300.0 |
| **Backend** | FastAPI + SQLAlchemy (Async) | 0.110.0 / 2.0+ |
| **Auth** | JWT (HS256) | - |
| **Generación PDF** | ReportLab | 4.5.1 |
| **Firma & XML** | Lxml + SignXML + Cryptography | 5.4.0 / 4.5.1 / 48.0.0 |
| **Motores de Plantilla**| Jinja2 (Email Templates) | 3.1.6 |
| **DB** | PostgreSQL (asyncpg driver) | - |

### Estructura de Directorios

```
Servinow/
├── Frontend/
│   ├── src/
│   │   ├── App.jsx                    # Router + ProtectedRoute
│   │   ├── config/appConfig.js        # Roles (ADMIN, SELLER, CLIENT), config global
│   │   ├── store/useStore.js          # Zustand store
│   │   ├── hooks/                     # useDrawerPush, useFileUpload, useCustomCursor, usePaymentMeans
│   │   ├── utils/
│   │   │   ├── apiClient.js           # Cliente API unificado (auth, product, service, social, billing, category)
│   │   │   ├── api.js                 # Cliente legacy
│   │   │   ├── helpers.js             # Utilidades de formato
│   │   │   └── mockData.js            # Datos mock residuales
│   │   ├── components/
│   │   │   ├── common/                # CustomCursor
│   │   │   ├── layout/                # MainLayout, Sidebar, Header, BottomNavbar
│   │   │   ├── ui/                    # Modal, Toast, Drawer, Table (soporta pie de totales), etc.
│   │   │   └── ShareModal.jsx         # Modal de redes sociales con cliente de publicación API
│   │   └── modules/                   # Pages (Dashboard, Products, Services, Billing, etc.)
│   └── css/
│       ├── variables.css              # Design tokens (Modo royal/gold y menta)
│       ├── components.css             # Estilos generales
│       ├── layout.css                 # Estilos estructurales
│       └── pages/                     # Estilos específicos (billing.css, InvoiceModal.css, CustomerModal.css, InvoiceDetail.css)
│
└── Backend/
    ├── app/
    │   ├── main.py                    # FastAPI app, CORS, Ngrok, routers
    │   ├── core/
    │   │   ├── config.py              # Pydantic settings (DIAN, SMTP, Social OAuth configs)
    │   │   ├── security.py            # JWT + bcrypt
    │   │   └── exceptions.py          # Manejadores de excepciones
    │   ├── db/
    │   │   ├── base.py                # Catálogo unificado de SQLAlchemy (Alembic registry)
    │   │   ├── base_class.py          # DeclarativeBase
    │   │   └── session.py             # AsyncSessionMaker
    │   ├── modules/
    │   │   ├── auth/                  # ✅ Completo (Modelos de usuarios)
    │   │   ├── wall/                  # ✅ Completo (Post, Comment, WebSockets)
    │   │   ├── products/              # ✅ Completo (CRUD con category_id y user_id)
    │   │   ├── services/              # ✅ Completo (CRUD con category_id, user_id y ServiceCategory)
    │   │   ├── social/                # ✅ Completo (OAuth, callback y publicaciones en background)
    │   │   ├── agenda/                # ❌ STUB (vacío - solo init)
    │   │   └── billing/               # ✅ Completo (Clientes, Invoices, Credit Notes, PDF, DIAN API, Email Templates)
    │   ├── api/
    │   │   └── uploads.py             # Rutas de carga de archivos y cleanup
    │   └── shared/
    │       └── schemas.py             # Esquemas compartidos (HealthCheck)
    ├── alembic/                       # Migraciones
    ├── init_db.py                     # Script de inicialización de base de datos
    └── requirements.txt               # Dependencias de Python
```

---

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Routing

```javascript
// Estructura de rutas (App.jsx)
Rutas Públicas:
  /                   -> Landing Page
  /login              -> Login
  /register           -> Register
  /unauthorized       -> Unauthorized

Rutas Protegidas (envueltas en MainLayout):
  /dashboard          -> Dashboard (Lógica con mocks)
  /products           -> Products (ADMIN, SELLER) -> ✅ CONECTADO AL BACKEND
  /services           -> Services (ADMIN, SELLER) -> ✅ CONECTADO AL BACKEND
  /billing            -> Billing (ADMIN, SELLER)  -> ✅ CONECTADO AL BACKEND
  /agenda             -> Agenda (Citas de clientes, Mocks)
  /wall               -> Wall (Muro social general) -> ✅ CONECTADO AL BACKEND
  /statistics         -> Statistics (ADMIN)
  /market             -> Market (ADMIN)
  /profile            -> Profile (Ajustes de perfil y conexión de redes sociales) -> ✅ CONECTADO AL BACKEND
```

### 2.2 API Layer (`apiClient.js`)

Se ha consolidado un único cliente HTTP asíncrono para gestionar todas las interacciones con el backend.
- **`authClient`:** Maneja registro, login, obtención de perfil y carga de avatares.
- **`productClient`:** CRUD de productos, soporta filtrado por `category_id` y por `user_id` (del creador).
- **`serviceClient`:** CRUD de servicios, soporta filtrado por `category_id` y por `user_id`. Incluye categorías heredadas.
- **`socialClient`:** Gestión de cuentas conectadas (`listAccounts`, `deleteAccount`), generación de URL OAuth de autorización (`getAuthorizeUrl`) y publicación directa (`publish`).
- **`categoryClient`:** Listado de categorías de la base de datos según el tipo de entidad (`product` o `service`).
- **`billingClient`:** Gestión completa de facturación:
  - Listado y creación de clientes (`customers`).
  - Listado, detalle y creación de facturas (`invoices`).
  - Transmisión electrónica a la DIAN (`sendToDian`, `getDianStatus`).
  - Descarga autenticada de PDF (`downloadInvoicePDF`) y envío por email (`sendInvoiceEmail`).
  - Emisión de notas de crédito (`createCreditNote`).
  - Totales e importes acumulados (`getSummary`) y estadísticas de venta (`getTopSelling`).

---

## 3. INVENTARIO DE MÓDULOS

### 3.1 Estado de Implementación (Actualizada V8)

| Módulo | Frontend | Backend | Integración | Detalle Técnico / Comentarios |
|--------|----------|---------|-------------|-------------------------------|
| **Landing** | ✅ Completo | N/A | Mock | Página principal corporativa de la marca. |
| **Login** | ✅ Completo | ✅ | API real | Validación mediante tokens JWT. |
| **Register** | ✅ Completo | ✅ | API real | Registro de usuarios nuevos. |
| **Dashboard** | ⚠️ Parcial | ❌ | Mock | Requiere conectar a endpoints del backend. |
| **Products** | ✅ Completo | ✅ | API real | CRUD completo asociado a `category_id` y `user_id`. |
| **Services** | ✅ Completo | ✅ | API real | CRUD completo asociado a `category_id` y `user_id`. |
| **Billing** | ✅ Completo | ✅ | API real | Facturación Electrónica DIAN, PDFs, Notas Crédito y Emails. |
| **Agenda** | ⚠️ Parcial | ❌ | Mock | Citas de servicios aún simuladas. |
| **Wall** | ✅ Completo | ✅ | API real | Red interna utilizando WebSockets para publicaciones rápidas. |
| **Statistics**| ⚠️ Parcial | ❌ | Mock | Estadísticas de uso y ventas. |
| **Profile** | ✅ Completo | ✅ | API real | Configuración y enlace OAuth de redes sociales. |

### 3.2 Los Módulos Clave en Detalle

#### A. Facturación Electrónica V2
Es el core empresarial de ServiNow.
- **Validación DIAN:** Generación automática de XML estructurado bajo el estándar UBL 2.1, firmado digitalmente, con cálculo de código **CUFE** y generación de código **QR** reglamentario.
- **PDF Profesional:** Plantillas estructuradas dinámicas utilizando ReportLab, que integran todos los datos tributarios, tabla de conceptos e información de resolución de pruebas de la DIAN.
- **Notificación por Email:** Plantillas en HTML (utilizando Jinja2) que le permiten al vendedor despachar la factura en formato PDF directamente al correo electrónico del cliente desde la interfaz de usuario.
- **Notas de Crédito:** Permiten realizar ajustes, devoluciones o la anulación de facturas ya emitidas bajo la numeración reglamentaria.

#### B. Redes Sociales & OAuth
Permite automatizar la promoción de los productos y servicios del inventario.
- **OAuth 2.0:** Flujos integrados para que los usuarios autoricen a ServiNow a publicar en sus cuentas de Facebook, Instagram y TikTok.
- **Background workers:** Publicaciones gestionadas en segundo plano a través de APIs de Meta y TikTok.
- **Generación de Imagen:** Utilidad canvas en el Frontend (`generateShareImage.js`) que compila la foto, el nombre y el precio del ítem para generar una tarjeta de redes sociales lista para publicar.

#### C. Categorías Jerárquicas Unificadas
- Un único catálogo relacional mediante la tabla `categories`.
- Soporta anidamiento jerárquico de categorías de productos y servicios (propiedad `depth`).
- El frontend realiza consultas específicas de categoría según el contexto.

---

## 4. SISTEMA DE DISEÑO

### 4.1 Identidad Visual Bipolar
ServiNow cuenta con una interfaz premium que se adapta según el modo visual seleccionado:

| Tema | Acento Primary | Enfoque de Interfaz |
|------|----------------|---------------------|
| **Dark (Royal Velvet)** | Dorado `#d4af37` | Premium, moderno, minimalista con sombras profundas y vidrio (Glassmorphism). |
| **Light (Fresh Mint)** | Verde Menta `#3EB489` | Limpio, fresco, alta legibilidad para entornos de oficina diurnos. |

Los archivos CSS han sido estructurados para separar el diseño base, layouts y hojas individuales por módulo dentro del directorio `css/pages/`.

---

## 5. GESTIÓN DE ESTADO

Se implementa **Zustand** para persistir datos clave del cliente en `localStorage`:
- `currentUser` (Nombre, rol, avatar y JWT).
- `theme` (`light` / `dark`).
- `sidebarCollapsed` (Estado visual de navegación).

Toda la lógica de datos volátiles de negocio (como el filtro de facturas, clientes en memoria, temporizadores de carga, y descarga de binarios de facturación) se maneja directamente con estados reactivos locales de React.

---

## 6. MODELO DE NEGOCIO

1. **Social Selling:** Fusión de un sistema de administración comercial (ERP compactado) con canales de distribución orgánica de contenido en redes sociales.
2. **Cumplimiento Tributario Nativo:** Las PyMEs pueden formalizarse tributariamente y facturar electrónicamente de forma nativa sin tener que recurrir a intermediarios complejos.
3. **Circularidad y Redes:** Visibilización de inventarios locales a través del Módulo Wall y Market.

---

## 7. SEGURIDAD

- **JWT en FastAPI:** Rutas privadas del backend protegidas por cabeceras de autorización `Bearer`.
- **Protección de Credenciales:** La configuración secreta (Credenciales DIAN, App IDs de Meta, Client Secrets de TikTok, claves SMTP) se lee estrictamente de variables de entorno `.env` locales del sistema y están declaradas en `.gitignore` para evitar filtraciones en repositorios.
- **Ngrok Header:** Implementación de middleware en FastAPI para inyectar cabeceras que omitan las advertencias del navegador en conexiones proxy de desarrollo.

---

## 8. DEUDA TÉCNICA

- **Módulo Agenda:** Sigue sin un modelo y base de datos dedicados en el backend.
- **Estructura CSS:** Aunque se ha progresado separando estilos de páginas, `components.css` sigue concentrando un volumen de selectores generales que podría simplificarse.
- **Mocks residuales:** Vistas secundarias como Dashboard, Estadísticas e inventario del Market persisten con datos simulados que deben conectarse a los modelos de facturas reales en base de datos.

---

## 9. GAPS DE BACKEND

- **Módulo de Citas (Agenda):** La carpeta `/agenda` en el backend requiere una estructura real de base de datos y endpoints CRUD.

---

## 10. ROADMAP PRIORIZADO

### Corto Plazo (Prioridad 1)
1. **Desarrollar Backend del Módulo Agenda:** Crear la tabla `appointments` en base de datos, configurar el router en FastAPI y conectar la vista del calendario en el Frontend.
2. **Conectar Dashboard y Estadísticas a la base de datos:** Escribir consultas SQL agregadas en el backend que calculen los ingresos reales, productos/servicios destacados e historial de actividad basándose en los registros reales de facturas y existencias.

### Mediano Plazo (Prioridad 2)
1. **Optimización de Lockfile:** Asegurar compatibilidad estricta de versiones de node en todas las plataformas de despliegue.
2. **Modularización Final de Estilos:** Reducir selectores globales duplicados en CSS para simplificar la personalización de marca blanca.

---

*Documento generado: Julio 2026*
*Versión: V8*
*Próxima actualización recomendada: Tras implementar el backend del módulo de Agenda.*
