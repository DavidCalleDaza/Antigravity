# DONAPP CONTEXT V7

> Última actualización: Junio 2026
> Estado del proyecto: MVP Avanzado / Integración Completa de Facturación (~7.5/10)

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
**DonApp** es una plataforma de gestión para SMEs (PyMEs) colombianos con un componente social integrado. El tagline: *"Servir es el único negocio donde todos ganan"*.
En su versión V7, el proyecto ha completado de forma integral el **Módulo de Facturación Electrónica**, adaptado a los lineamientos vigentes de la DIAN (Colombia).

### Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Frontend** | React + Vite | 18.2.0 / 5.0.0 |
| **Gestión de Paquetes**| PNPM (Monorepo Workspace) | Varios |
| **Estado** | Zustand | 4.4.7 |
| **Routing** | React Router DOM | 6.20.0 |
| **Charts** | Chart.js + react-chartjs-2 | 4.5.1 / 5.3.1 |
| **Icons** | Lucide React | 0.300.0 |
| **Backend** | FastAPI + SQLAlchemy | 2.0+ (async) |
| **Auth** | JWT (HS256) | - |
| **Generación PDF** | ReportLab | 4.x+ |
| **Firma & XML** | Lxml + Cryptography | - |
| **DB** | PostgreSQL (PostgreSQL dialect local/WSL) | - |

### Estructura de Directorios

```
DonApp/
├── Frontend/
│   ├── src/
│   │   ├── App.jsx                    # Router + ProtectedRoute
│   │   ├── config/appConfig.js        # Roles, categorías, configuración global
│   │   ├── store/useStore.js          # Zustand store
│   │   ├── hooks/                     # useDrawerPush, useFileUpload, useCustomCursor
│   │   ├── utils/
│   │   │   ├── apiClient.js           # Cliente API principal (Incluye endpoint de facturación)
│   │   │   ├── api.js                 # Cliente legacy (CÓDIGO MUERTO)
│   │   │   ├── helpers.js             # Utilidades
│   │   │   └── mockData.js            # Datos mock residuales
│   │   ├── components/
│   │   │   ├── common/                # CustomCursor
│   │   │   ├── layout/                # MainLayout, Sidebar, Header, BottomNavbar
│   │   │   └── ui/                    # Modal, Toast, Drawer, Table, Cards, etc.
│   │   └── modules/                   # Pages (Dashboard, Products, Services, Billing, etc.)
│   └── css/
│       ├── variables.css              # Design tokens
│       ├── components.css             # Estilos sin organizar
│       ├── layout.css                 # Layout styles
│       ├── pages/                     # Page-specific styles (billing.css, InvoiceModal.css)
│       └── base.css, utilities.css, animations.css
│
└── Backend/
    ├── app/
    │   ├── main.py                    # FastAPI factory, CORS, routers
    │   ├── core/
    │   │   ├── config.py              # Pydantic settings (Configuración DIAN)
    │   │   ├── security.py           # JWT + bcrypt
    │   │   └── exceptions.py
    │   ├── db/
    │   │   ├── base.py                # Registry para Alembic (Incluye nuevos modelos de Billing)
    │   │   ├── base_class.py          # DeclarativeBase
    │   │   └── session.py             # AsyncSessionMaker
    │   ├── modules/
    │   │   ├── auth/                  # ✅ Completo
    │   │   ├── wall/                  # ✅ Completo
    │   │   ├── products/              # ✅ Completo
    │   │   ├── services/             # ✅ Completo
    │   │   ├── social/                # ⚠️ Parcial (accounts, posts, publish)
    │   │   ├── agenda/                # ❌ STUB (vacío - solo init)
    │   │   └── billing/              # ✅ Completo (Facturación Electrónica DIAN y PDF)
    │   ├── api/
    │   │   └── uploads.py
    │   └── shared/
    │       └── schemas.py
    └── alembic/
```

---

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Routing

```javascript
// Route structure (App.jsx)
Public routes:
  /                   -> Landing
  /login              -> Login
  /register           -> Register
  /unauthorized       -> Unauthorized

Protected routes (wrapped in MainLayout):
  /dashboard          -> Dashboard
  /products           -> Products
  /services           -> Services
  /billing            -> Billing (ADMIN, SELLER) -> ✅ CONECTADO AL BACKEND
  /agenda             -> Agenda
  /wall               -> Wall
  /statistics         -> Statistics (ADMIN)
  /market             -> Market (ADMIN)
  /profile            -> Profile
```

**Novedad Importante:** El módulo de **Billing** ya no es un mock. Está plenamente integrado con endpoints HTTP del backend para gestionar clientes, facturas, notas de crédito, descarga de PDF reglamentario y comunicación con el entorno de pruebas de la DIAN.

### 2.2 API Layer

**Clientes exportados (`apiClient.js`):**
```javascript
export const authClient      // Auth operations
export const productClient   // Product CRUD
export const serviceClient   // Service CRUD
export const socialClient    // Social posting
export const billingClient   // ✅ Cliente completo de facturación (Invoices, Customers, Credit Notes, PDF, DIAN API)
```

**Clientes Faltantes:**
- No hay `agendaClient`
- No hay `statisticsClient` ni `marketClient` (siguen bajo lógica simulada)

### 2.3 Authentication Flow

```
1. Login -> /auth/login (email + password)
2. Backend returns JWT (expires: 30 min)
3. Token stored in Zustand (localStorage persist)
4. apiClient lee token vía useStore.getState().currentUser?.token
5. Ante error 401 -> logout() + redirección a /login
```

---

## 3. INVENTARIO DE MÓDULOS

### 3.1 Matriz de Estado (Actualizada V7)

| Módulo | Frontend | Backend | Integración | Líneas |
|--------|----------|---------|-------------|--------|
| Landing | ✅ Completo | N/A | Mock drawers | 592 |
| Login | ✅ Completo | ✅ | API real | 132 |
| Register | ✅ Completo | ✅ | API real | ~150 |
| Dashboard | ⚠️ Mock | ❌ | **Sin backend** | 232 |
| Products | ✅ Completo | ✅ | API real | 525 |
| Services | ✅ Completo | ✅ | API real | 376 |
| Billing | ✅ Completo | ✅ | **API Real + DIAN** | ~3500 |
| Agenda | ⚠️ Mock | ❌ | **Sin backend** | 154 |
| Wall | ✅ Completo | ✅ | API + WebSocket | 591 |
| Statistics | ⚠️ Mock | ❌ | **Sin backend** | 163 |
| Market | ⚠️ Mock | ❌ | **Sin backend** | 91 |
| Profile | ✅ Completo | ✅ | API real (Ajustes de redes sociales) | 364 |

### 3.2 El Módulo de Facturación (Billing) en Detalle

La gran adición en esta etapa del proyecto es el módulo de facturación robusto que cumple la norma de la DIAN:

1. **Gestión de Clientes (Customers):** Creación y modificación de receptores de factura con NIT/cédula, tipo de persona, régimen tributario y dirección.
2. **Ciclo de Facturación (Invoices):**
   - Creación de facturas con múltiples ítems.
   - Cálculo automático de impuestos (IVA, retenciones), subtotales y totales.
   - Estados de factura: Borrador (Draft), Pendiente (Pending), Pagada (Paid), Vencida (Overdue) y Cancelada (Cancelled).
3. **Integración DIAN (`dian_service.py`):**
   - Generación de archivos XML reglamentarios en formato UBL 2.1.
   - Cálculo automático del código único de factura electrónica (**CUFE**) y datos requeridos para el código QR.
   - Envío directo (simulado/real mediante SOAP) al webservice DIAN y almacenamiento de logs de eventos.
4. **Exportación PDF (`pdf_service.py`):**
   - Generación dinámica de la factura de venta en formato PDF profesional utilizando ReportLab.
   - Inclusión automática de tabla de ítems, totales, detalles de pago y el código QR oficial.
5. **Notas de Crédito (Credit Notes):** Soporte para anular o corregir facturas ya procesadas.

---

## 4. SISTEMA DE DISEÑO

### 4.1 Identidad Bipolar

El brand identity cambia entre temas:

| Modo | Primary Color | Personalidad |
|------|---------------|--------------|
| **Dark** | Dorado `#d4af37` | "Royal Velvet" |
| **Light** | Verde Menta `#3EB489` | "Fresh Mint" |

**Color Palette:**
- **Dark Mode (default):** Fondos oscuros (`#0a080c`, `#12101a`), bordes sutiles y acentos dorados (`#d4af37`).
- **Light Mode:** Fondos limpios y acentos color menta (`#3EB489`).

---

## 5. GESTIÓN DE ESTADO

Mantiene el uso de **Zustand** persistido en localStorage para `theme`, `sidebarCollapsed`, `currentUser` y la sesión del usuario.
El módulo de Facturación realiza fetch asíncrono directo contra el backend y almacena estados locales para filtrado de datos (por tipo, fecha o búsqueda global por cliente/número de factura).

---

## 6. MODELO DE NEGOCIO

### 6.1 Descripción
- **Social Marketplace:** Los negocios pueden listar productos/servicios y publicar contenido social.
- **Inclusión y Comunidad:** Enfoque en economía circular y visibilización de PyMEs locales.
- **Facturación Integrada:** Ofrece la capacidad a las pequeñas empresas de facturar electrónicamente de forma nativa sin contratar proveedores adicionales costosos.

---

## 7. SEGURIDAD

### 7.1 Estado de Seguridad
- Se mantiene el uso de JWT (HS256) para proteger rutas en FastAPI.
- **Configuración de Variables:** Se configuraron variables de entorno `.env` en el Backend para proteger secretos de firma XML y datos sensibles del envío DIAN.

---

## 8. DEUDA TÉCNICA

- **Duplicidad Frontend:** Gran similitud entre la estructura de `Products.jsx` y `Services.jsx`.
- **CSS global gigante:** `components.css` cuenta con más de 1000 líneas que requieren ordenarse en hojas individuales o usar metodologías como CSS Modules.
- **WebSocket Reconnections:** El hook `useWallSockets.js` no cuenta con política automática de re-intento si el servidor backend se cae.

---

## 9. GAPS DE BACKEND

### 9.1 Agenda
- La carpeta `Backend/app/modules/agenda/` sigue vacía a excepción de su archivo `__init__.py`. Las citas y agendas en el Frontend siguen simuladas.

---

## 10. ROADMAP PRIORIZADO

### Prioridad 1: Funcionalidad Core
1. **Completar backend de Agenda:** Crear los modelos, routers y controladores CRUD para citas.
2. **Conectar Dashboard y Estadísticas:** Reemplazar los datos estáticos de `mockData.js` con queries reales que involucren las facturas pagadas (Billing) e inventario (Products/Services).

### Prioridad 2: Refactorización y UX
1. **Modularizar estilos:** Dividir `components.css` para evitar colisiones de selectores.
2. **Paginación en Tablas:** Implementar control de páginas en las tablas del histórico de facturación y listado de productos/servicios para optimizar cargas.

---

*Documento generado: Junio 2026*
*Versión: V7*
*Próxima actualización recomendada: Al iniciar desarrollo del módulo Agenda.*
