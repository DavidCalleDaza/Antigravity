# DONAPP CONTEXT V6

> Última actualización: Mayo 2026
> Estado del proyecto: MVP Temprano (~4.5/10)

---

## TABLA DE CONTENIDOS

1. [Visión General del Proyecto](#1-visión-general-del-proyecto)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Inventario de Módulos](#3-inventario-de-módulos)
4. [Sistema de Diseño](#4-sistema-de-diseño)
5. [Gestión de Estado](#6-gestión-de-estado)
6. [Modelo de Negocio](#7-modelo-de-negocio)
7. [Seguridad](#8-seguridad)
8. [Deuda Técnica](#9-deuda-técnica)
9. [Roadmap Priorizado](#10-roadmap-priorizado)

---

## 1. VISIÓN GENERAL DEL PROYECTO

### Descripción
**DonApp** es una plataforma de gestión para SMEs colombianos con un componente social integrado. El tagline: *"Servir es el único negocio donde todos ganan"*.

### Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Frontend** | React + Vite | 18.2.0 / 5.0.0 |
| **Estado** | Zustand | 4.4.7 |
| **Routing** | React Router DOM | 6.20.0 |
| **Charts** | Chart.js + react-chartjs-2 | 4.5.1 / 5.3.1 |
| **Icons** | Lucide React | 0.300.0 |
| **Backend** | FastAPI + SQLAlchemy | - |
| **Auth** | JWT (HS256) | - |
| **DB** | PostgreSQL | - |

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
│   │   │   ├── apiClient.js           # Cliente API principal
│   │   │   ├── api.js                 # Cliente legacy (CÓDIGO MUERTO)
│   │   │   ├── helpers.js             # Utilidades
│   │   │   └── mockData.js            # Datos mock
│   │   ├── components/
│   │   │   ├── common/                # CustomCursor
│   │   │   ├── layout/                # MainLayout, Sidebar, Header, BottomNavbar
│   │   │   └── ui/                    # Modal, Toast, Drawer, Table, Cards, etc.
│   │   └── modules/                   # Pages (Dashboard, Products, Services, etc.)
│   └── css/
│       ├── variables.css              # Design tokens
│       ├── components.css             # 1074 líneas - sin organizar
│       ├── layout.css                 # Layout styles
│       ├── pages/                     # Page-specific styles
│       └── base.css, utilities.css, animations.css
│
└── Backend/
    ├── app/
    │   ├── main.py                    # FastAPI factory, CORS, routers
    │   ├── core/
    │   │   ├── config.py              # Pydantic settings
    │   │   ├── security.py           # JWT + bcrypt
    │   │   └── exceptions.py
    │   ├── db/
    │   │   ├── base.py                # Registry para Alembic
    │   │   ├── base_class.py          # DeclarativeBase
    │   │   └── session.py             # AsyncSessionMaker
    │   ├── modules/
    │   │   ├── auth/                  # ✅ Completo
    │   │   ├── wall/                  # ✅ Completo
    │   │   ├── products/              # ✅ Completo
    │   │   ├── services/             # ✅ Completo
    │   │   ├── social/                # ⚠️ Parcial (accounts, posts, publish)
    │   │   ├── agenda/                # ❌ STUB (vacío)
    │   │   └── billing/              # ❌ STUB (vacío)
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
  /billing            -> Billing (ADMIN, SELLER)
  /agenda             -> Agenda
  /wall               -> Wall
  /statistics         -> Statistics (ADMIN)
  /market             -> Market (ADMIN)
  /profile            -> Profile
```

**Issues:**
- Control de acceso basado en roles incompleto - API no enforcea autorización
- Sin code splitting - todos los módulos bundled juntos
- Dashboard, Statistics, Market, Billing, Agenda usan **mock data** (sin integración API)

### 2.2 API Layer

**Dos clientes API:**
- `utils/apiClient.js` - Cliente principal (con soporte env vars)
- `utils/api.js` - Cliente legacy hardcoded `localhost:8000` (**CÓDIGO MUERTO**)

**Clientes exportados:**
```javascript
export const authClient      // Auth operations
export const productClient   // Product CRUD
export const serviceClient   // Service CRUD
export const socialClient    // Social posting
```

**Falta:**
- No hay agendaClient
- No hay billingClient
- No hay statisticsClient ni marketClient

### 2.3 Authentication Flow

```
1. Login -> /auth/login (email + password)
2. Backend returns JWT (expires: 30 min)
3. Token stored in Zustand (localStorage persist)
4. apiClient reads token via useStore.getState().currentUser?.token
5. On 401 -> logout() + redirect to /login
```

**Issues:**
- Sin mecanismo de refresh token
- "Remember me" checkbox en Login.jsx es no funcional
- SECRET_KEY hardcoded con fallback inseguro en `core/config.py`

---

## 3. INVENTARIO DE MÓDULOS

### 3.1 Matriz de Estado

| Módulo | Frontend | Backend | Integración | Líneas |
|--------|----------|---------|-------------|--------|
| Landing | ✅ Completo | N/A | Mock drawers | 592 |
| Login | ✅ Completo | ✅ | API real | 132 |
| Register | ✅ Completo | ✅ | API real | ~150 |
| Dashboard | ⚠️ Mock | ❌ | **Sin backend** | 232 |
| Products | ✅ Completo | ✅ | API real | 525 |
| Services | ✅ Completo | ✅ | API real | 376 |
| Billing | ⚠️ Mock | ❌ | **Sin backend** | 110 |
| Agenda | ⚠️ Mock | ❌ | **Sin backend** | 154 |
| Wall | ✅ Completo | ✅ | API + WebSocket | 591 |
| Statistics | ⚠️ Mock | ❌ | **Sin backend** | 163 |
| Market | ⚠️ Mock | ❌ | **Sin backend** | 91 |
| Profile | ✅ Completo | ✅ | API real | 364 |

### 3.2 Módulos Incompletos (Stubs)

**Dashboard:**
```javascript
const s = MockData.stats.kpis;  // Todo mock
```

**Billing:**
```javascript
const [invoices] = useState([...MockData.invoices]);  // Static mock
toast.info('Funcionalidad de creación de factura disponible en la versión completa.')
// Sin llamadas API
```

**Agenda:**
```javascript
onClick={() => toast.info('Funcionalidad disponible en versión completa.')}
// Completamente estático
```

**Statistics:**
```javascript
const sales = MockData.stats.salesByMonth;  // Todo mock
```

**Market:**
```javascript
const marketData = MockData.marketData;  // Mock de competidores
```

### 3.3 Backend Stubs

```
Backend/app/modules/
├── agenda/__init__.py     # VACÍO
└── billing/__init__.py    # VACÍO
```

Aún si el frontend se conectara, no hay backend para handling.

---

## 4. SISTEMA DE DISEÑO

### 4.1 Identidad Bipolar (CRÍTICO)

El brand identity **cambia completamente** entre temas:

| Modo | Primary Color | Personalidad |
|------|---------------|--------------|
| **Dark** | Dorado `#d4af37` | "Royal Velvet" |
| **Light** | Verde Menta `#3EB489` | "Fresh Mint" |

**Problema:** No hay source of truth para el color. Colores hardcoded不一致:
- Dashboard.jsx: `#3EB489`
- Statistics.jsx: `#14b8a6`
- variables.css: `#10b981`

### 4.2 Color Palette

**Dark Mode (default):**
```css
--page-bg:       #0a080c
--sidebar-bg:    #12101a
--card-bg:       #1c1924
--border-color:  #2d2838
--gold:          #d4af37
--purple:        #c4a8e0
--cream:         #f5f0f8
--muted:         #a098b0
--success:       #10b981
--danger:        #ef4444
```

**Light Mode:**
```css
--page-bg:       #ffffff
--sidebar-bg:    #f8f9fa
--card-bg:       #ffffff
--border-color:  #e9ecef
--gold:          #3EB489  /* Cambio a Mint Green */
--purple:        #483d8b  /* DarkSlateBlue */
```

### 4.3 Typography

```css
--font-display: 'Outfit', system-ui, sans-serif
--font-body:    'Inter', system-ui, sans-serif
--font-mono:    'JetBrains Mono', monospace
```

### 4.4 Theme Implementation

```javascript
// useStore.js
toggleTheme: () => {
  const nextTheme = get().theme === 'light' ? 'dark' : 'light';
  set({ theme: nextTheme });
  document.documentElement.setAttribute('data-theme', nextTheme);
}
```

**Issues:**
- No detección de `prefers-color-scheme` del sistema
- Transición de tema causa flash en toda la página
- Variables incompletas en light mode (e.g., `form-input-bg` solo en `[data-theme="light"]`)

---

## 5. GESTIÓN DE ESTADO

### 5.1 Zustand Store Structure

```javascript
{
  // Theme
  theme: 'light',
  toggleTheme: () => {...},

  // Layout
  sidebarCollapsed: false,

  // Auth
  currentUser: null,
  isAuthenticated: false,

  // Landing (INAPROPIADO - debería estar en componente local)
  landingDrawers: {
    feature: { isOpen, drawerWidth },
    benefit: { isOpen, drawerWidth }
  }
}
```

**Persisted to localStorage:** `theme`, `sidebarCollapsed`, `currentUser`, `isAuthenticated`

### 5.2 Issues de Estado

| Problema | Impacto |
|----------|---------|
| Estado de landing page en store global | Mezcla de responsabilidades |
| Toast store separado | `useToastStore` creado dentro del componente Toast |
| Sin caching global | Products/Services usan useState local |
| Sin loading/error states centralizados | Cada componente maneja independientemente |
| Sin estado de paginación | Asume datasets pequeños |

---

## 6. MODELO DE NEGOCIO

### 6.1 Descripción

Plataforma de gestión para SMEs colombianos con componente social:
- Tiendas, barberías, consultorios, artesanías, productos orgánicos
- Registro gratuito para negocios
- Productos/servicios pueden donarse a comunidades

### 6.2 Roles de Usuario

| Rol | Descripción |
|-----|-------------|
| **ADMIN** | Acceso completo a todas las features |
| **SELLER** | Gestiona products/services, ve billing, usa agenda |
| **CLIENT** | Ve products/services, hace citas, ve wall |

### 6.3 Monetización

**⚠️ CRÍTICO: No hay modelo de monetización claro**

- Sin suscripciones
- Sin comisiones por transacción
- Sin planes freemium
- Sin publicidad
- "Impacto social" no genera revenue

**Pregunta abierta:** ¿Cómo DonApp genera revenue para sostenerse?

### 6.4 Features

1. Landing page con features y contacto
2. Auth con JWT (registro, login, profile)
3. Catálogo de productos (CRUD con imágenes)
4. Catálogo de servicios (CRUD con duración)
5. Wall (feed social con WebSocket)
6. Billing (invoices - STUB)
7. Agenda (citas - STUB)
8. Statistics (charts - STUB)
9. Market (análisis de competidores - STUB)
10. Social publishing (FB, IG, TikTok - NO IMPLEMENTADO)

---

## 7. SEGURIDAD

### 7.1 Flags Críticos

| Vulnerabilidad | Gravedad | Ubicación |
|----------------|----------|-----------|
| `DEBUG = True` por defecto | 🔴 Alta | `core/config.py` |
| `SECRET_KEY` hardcoded | 🔴 Alta | `core/config.py` |
| Sin rate limiting | 🔴 Alta | `/auth/login` vulnerable |
| Sin sanitización en Wall | 🟡 Media | XSS via post content |
| CORS hardcoded orígenes dev | 🟡 Media | `config.py` |
| Sin CSRF protection | 🟡 Media | Confía solo en CORS |

### 7.2 JWT Configuration

```python
ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
ALGORITHM: str = "HS256"
SECRET_KEY: str = "change-me-to-a-very-long-random-string-in-production"
```

**Issues:**
- Sin refresh token mechanism
- Secret por defecto débil y visible en source
- 30 min expiry sin renovación

### 7.3 Input Validation

**Frontend:**
- HTML5 `required`
- Email type
- Min/max length
- File type (images only, 10MB max)

**Backend:**
- Pydantic schemas

**Faltas:**
- No sanitización XSS en Wall posts
- No rate limiting
- No password strength validation (solo min 8 chars)

---

## 8. DEUDA TÉCNICA

### 8.1 Código Duplicado

| Duplicación | severity | Impacto |
|-------------|----------|---------|
| Products.jsx ≈ Services.jsx | 🔴 Alta | 90% idénticos |
| useFileUpload hook | 🟡 Media | Duplicado en componentes |
| Inline SVG icons | 🟡 Media | Products.jsx tiene PencilIcon, TrashIcon, CartIcon inline |
| CSS-in-JS manual | 🟡 Media | `<style>{...}</style>` en Products.jsx y Services.jsx |

### 8.2 Anti-patrones

```javascript
// DOM directo en vez de useNavigate
window.location.href = '/login';  // apiClient.js línea 45

// Import al final del archivo
import { useStore } from '../store/useStore';  // apiClient.js línea 114

// Inline styles
style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}

// !important en CSS
[data-theme="light"] .auth-form .form-input {
  background: var(--form-input-bg) !important;
}
```

### 8.3 CSS Architecture

```
css/
├── variables.css      (363 líneas - Design tokens OK)
├── base.css          (218 líneas - Typography OK)
├── utilities.css     (215 líneas - Utilities OK)
├── components.css   (1074 líneas - ❌ SIN ORGANIZACIÓN)
├── layout.css
├── animations.css
└── pages/
    └── *.css
```

**Problemas:**
- 1074 líneas en components.css sin comentarios de sección
- Sin metodología (ni BEM, ni CSS modules)
- Especificidad fights (uso de `!important`)

### 8.4 Performance Concerns

1. **Bundle grande** - Sin code splitting, ~1.2MB gzip
2. **Chart.js en todas las páginas** - Aunque no todas lo usan
3. **Lucide import completo** - `import * as LucideIcons from 'lucide-react'` en Sidebar
4. **Sin memoización** - Re-renders pesados posibles en Wall feed
5. **WebSocket sin reconnect** - `useWallSockets` no maneja reconexión

### 8.5 Features Faltantes

- [ ] Search functionality
- [ ] Paginación
- [ ] Refresh token
- [ ] Image optimization
- [ ] Offline/PWA support
- [ ] Internacionalización (todo hardcoded español)
- [ ] Form validation library
- [ ] Error boundary

---

## 9. GAPS DE BACKEND

### 9.1 Módulos Vacíos

```
Backend/app/modules/
├── agenda/__init__.py     # VACÍO - necesita implementación
└── billing/__init__.py    # VACÍO - necesita implementación
```

### 9.2 Social Module Parcial

Solo tiene:
- accounts
- posts
- publish

**No implementado:**
- OAuth para Facebook
- OAuth para Instagram
- OAuth para TikTok
- Posting real a redes sociales

### 9.3 Database Migrations

Cuando se implementen agenda y billing, se necesitarán nuevas migraciones Alembic.

---

## 10. ROADMAP PRIORIZADO

### Prioridad 1: Funcionalidad Core

| # | Task | Impacto | Esfuerzo |
|---|------|---------|----------|
| 1.1 | Completar backend de agenda | 🔴 Alto | Medio |
| 1.2 | Completar backend de billing | 🔴 Alto | Medio |
| 1.3 | Conectar Dashboard a API real | 🔴 Alto | Bajo |
| 1.4 | Conectar Statistics a API real | 🔴 Alto | Bajo |

### Prioridad 2: Deuda Técnica

| # | Task | Impacto | Esfuerzo |
|---|------|---------|----------|
| 2.1 | Eliminar `utils/api.js` (código muerto) | 🟡 Medio | Bajo |
| 2.2 | Crear Form component compartido | 🟡 Medio | Alto |
| 2.3 | Unificar paleta de colores (eliminar hardcoding) | 🟡 Medio | Medio |

### Prioridad 3: UX Crítico

| # | Task | Impacto | Esfuerzo |
|---|------|---------|----------|
| 3.1 | Implementar refresh tokens | 🔴 Alto | Medio |
| 3.2 | Hacer "remember me" funcional | 🟡 Medio | Bajo |
| 3.3 | Agregar search en Products/Services | 🔴 Alto | Medio |
| 3.4 | Implementar paginación | 🔴 Alto | Medio |

### Prioridad 4: Seguridad

| # | Task | Impacto | Esfuerzo |
|---|------|---------|----------|
| 4.1 | Cambiar DEBUG=false en producción | 🔴 Alto | Bajo |
| 4.2 | Usar SECRET_KEY generado dinámicamente | 🔴 Alto | Bajo |
| 4.3 | Implementar rate limiting | 🔴 Alto | Medio |
| 4.4 | Sanitizar XSS en Wall posts | 🟡 Medio | Medio |

### Prioridad 5: Diseño

| # | Task | Impacto | Esfuerzo |
|---|------|---------|----------|
| 5.1 | Unificar identidad de marca (dark/light) | 🟡 Medio | Alto |
| 5.2 | Organizar components.css con secciones | 🟡 Medio | Medio |
| 5.3 | Eliminar `!important` y specificity fights | 🟡 Medio | Medio |

### Prioridad 6: Diferenciadores

| # | Task | Impacto | Esfuerzo |
|---|------|---------|----------|
| 6.1 | OAuth real para Facebook/Instagram/TikTok | 🔴 Alto | Alto |
| 6.2 | Definir modelo de monetización | 🔴 Crítico | - |

### Prioridad 7: Performance

| # | Task | Impacto | Esfuerzo |
|---|------|---------|----------|
| 7.1 | Code splitting (lazy loading) | 🟡 Medio | Medio |
| 7.2 | Tree-shaking de lucide-react | 🟡 Medio | Bajo |
| 7.3 | Implementar Error Boundary | 🟡 Medio | Bajo |

---

## SCORECARD FINAL

| Categoría | Score | Notas |
|----------|-------|-------|
| Arquitectura | 6/10 | Buena separación, integración incompleta |
| Calidad de Código | 4/10 | Alta duplicación, estilos inline, patrones inconsistentes |
| Sistema de Diseño | 7/10 | CSS vars comprehensivo, pero identidad bipolar dark/light |
| Modelo de Negocio | 3/10 | Sin monetización clara, impacto social no monetizable |
| Completitud de Módulos | 5/10 | 5/11 con API real, 6 stubs |
| Seguridad | 4/10 | JWT implementado pero defaults inseguros |
| Frontend-Backend Sync | 5/10 | Múltiples módulos solo mock |
| Reutilización de Código | 3/10 | Alta duplicación Products/Services |

### **OVERALL: ~4.5/10**

Estado: **Proof of Concept / MVP Temprano**

---

## CONTACTOS Y CONFIGURACIÓN

### Roles Defined (`appConfig.js`)
```javascript
ROLES: ['ADMIN', 'SELLER', 'CLIENT']
```

### API Endpoints
- Frontend dev: `http://localhost:5173`
- Backend dev: `http://localhost:8000`

### Categorías de Productos
```javascript
CATEGORIES: ['Alimentos', 'Artesanías', 'Belleza', 'Consultorios', ...]
```

---

*Documento generado: Mayo 2026*
*Versión: V6*
*Próxima actualización recomendada: Después de completar agenda y billing backend*