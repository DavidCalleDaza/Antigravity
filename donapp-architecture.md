---
name: donapp-architecture
description: Arquitectura, stack técnico y convenciones de código de DonApp (FastAPI + PostgreSQL en backend, React + Vite + Zustand en frontend). Consulta esta skill SIEMPRE que vayas a crear o modificar código en DonApp, decidir dónde ubicar un archivo nuevo, elegir un patrón de estado o de estilos, evaluar si un módulo tiene backend real o es mock, o tocar el modelo de datos multi-tenant. Úsala también antes de proponer librerías nuevas (Tailwind, MUI, etc.) o refactors de estado — hay decisiones ya tomadas que no se deben revertir sin justificación explícita.
---

# Arquitectura de DonApp

Estado del proyecto: MVP avanzado, UI/UX pulida (~9.0/10). Última actualización de contexto: julio 2026 (V9).

## Stack

**Backend**
- FastAPI 0.110.0 (async) + SQLAlchemy 2.0+ (`Mapped`/`DeclarativeBase`)
- PostgreSQL vía driver `asyncpg` — todo controlador y módulo usa `AsyncSessionMaker`, nunca sesiones síncronas
- Migraciones: Alembic
- Facturación DIAN: `lxml 5.4.0`, `signxml 4.5.1`, `cryptography 48.0.0`
- PDFs: `reportlab 4.5.1` — Emails: `Jinja2 3.1.6`

**Frontend**
- React 18.3.1 + Vite 5.4.21, gestor de paquetes `pnpm` (monorepo workspace)
- Estado: Zustand 4.5.7, **siempre con selectores granulares** (ver antipatrón abajo)
- Router: React Router DOM 6.30.4
- Charts: Chart.js 4.5.1 + react-chartjs-2 — Iconos: Lucide React
- **CSS plano artesanal** (`variables.css`, `layout.css`, `components.css` + CSS por módulo). No hay Tailwind ni librería de componentes (MUI/Chakra) — decisión tomada, no la reintroduzcas sin que el usuario lo pida explícitamente.

## Routing (`App.jsx`)

Públicas: `/`, `/login`, `/register`, `/unauthorized`.
Protegidas (dentro de `MainLayout`): `/dashboard`, `/products`, `/services`, `/categories`, `/billing`, `/agenda`, `/wall`, `/statistics`, `/market`, `/profile`.

## API Layer (`apiClient.js`)

Todas las llamadas HTTP pasan por clientes centralizados: `authClient`, `productClient`, `serviceClient`, `socialClient`, `categoryClient`, `billingClient`. **No escribas `fetch`/`axios` directo dentro de componentes** — es un antipatrón ya corregido una vez, no lo repitas.

## Modelo multi-tenant

No existe una entidad `Business`/`Negocio` explícita. El tenant es implícito: el `user_id` del propietario actúa como owner directo de sus recursos.

- `Product.user_id` y `Service.user_id` → FK a `users.id`
- `SocialAccount.user_id` → FK a `users.id`
- Relación: `User (propietario)` 1—N `Products / Services / SocialAccounts / Invoices`

Si en algún momento se solicita agregar una capa de `Business` real, es un cambio de arquitectura mayor (migración de datos existentes) — señala esto explícitamente antes de implementarlo.

## Roles

Campo `role` en `users` (`Backend/app/modules/auth/models.py`):
- `admin`: acceso total
- `seller`: gestiona inventario, factura, publica en el muro, gestiona clientes
- `client`: consumidor final (vistas públicas / agenda)

El backend valida identidad vía `get_current_user`, pero la distinción fuerte de permisos de CRUD ocurre en frontend (`canManage = userRole === ADMIN || userRole === SELLER`). Si se toca autorización sensible, no asumas que el frontend es la única barrera.

## Estado de módulos (V9)

| Módulo | Frontend | Backend | Notas |
|---|---|---|---|
| Auth | ✅ | ✅ | JWT |
| Products | ✅ | ✅ | Anchos fijos, lista por defecto |
| Services | ✅ | ✅ | Mismo diseño que Products |
| Categories | ✅ | ✅ | Filtro por tipo de entidad |
| Billing | ✅ | ✅ | DIAN, PDFs, notas crédito, email |
| Social/OAuth | ✅ | ✅ | Ver skill `donapp-social-oauth` |
| Wall | ✅ | ✅ | WebSockets |
| Profile | ✅ | ✅ | Incluye conexión de redes |
| Dashboard | ⚠️ parcial | ❌ | Mock, sin queries agregadas reales |
| Statistics | ⚠️ parcial | ❌ | Mock |
| Agenda | ⚠️ parcial | ❌ | Sin tabla `appointments`, backend vacío/STUB |
| Market | — | ❌ | Mock |

**Antes de dar por hecho que un módulo tiene backend real, verifica esta tabla** — Dashboard, Statistics, Agenda y Market siguen simulados pese a que la UI ya luce terminada.

## Decisiones arquitectónicas ya tomadas (no reabrir sin pedirlo explícitamente)

- **Auth**: JWT (HS256), sin refresh token. El frontend confía en la sesión hasta que expira el JWT único.
- **Storage de archivos**: disco local vía `api/uploads.py`, no S3.
- **CSS**: plano, sin Tailwind/librerías de componentes.
- **Backend**: 100% async (`asyncpg` + `AsyncSessionMaker`) en todo controlador nuevo.

Pendiente explícito: encapsular estilos `.modal-body` que aún viven en CSS global (ver antipatrón de CSS abajo).

## Convenciones de código

- **Backend**: modular, cada feature en `app/modules/<nombre>/` con `models.py`, `schemas.py`, `crud.py`, `router.py`.
- **Frontend**: `src/modules/<nombre>` para vistas complejas, `src/components/ui/` para componentes compartidos.
- **Schemas Pydantic**: `<Modelo>Base`, `<Modelo>Create`, `<Modelo>Update`, `<Modelo>Response` (con `from_attributes = True`).
- **Zustand**: stores persistidos con `middleware persist`.
- **Tablas**: usar `<colgroup>` con anchos fijos en px (patrón ya establecido en `Table.jsx`) — no dejar que el navegador distribuya columnas automáticamente.

## Antipatrones ya identificados — no los repitas

1. **Selectores Zustand completos**: `const { setSidebarCollapsed } = useStore()` suscribe al componente a *todo* el store y puede causar loops infinitos de render. Usa siempre selectores granulares:
   ```javascript
   const setSidebarCollapsed = useStore(state => state.setSidebarCollapsed);
   ```
2. **CSS global sin encapsular**: reglas como las de `InvoiceModal.css` ya rompieron modales no relacionados (ej. el modal de logout) al sobreescribir `.modal-body` con `!important`. Cualquier regla de modal nueva debe ir encapsulada bajo la clase raíz del módulo (ej. `.invoice-modal-container .modal-body`), nunca global.
3. **Fetch/axios sueltos en componentes**: todo pasa por `apiClient.js`.

## Patrones de UI/UX establecidos (V9)

- **Push Drawer**: los paneles laterales derechos empujan `.app-main` en vez de superponerse con overlay oscuro (desktop no usa `backdrop-filter`).
- **Sidebar auto-colapsable**: se contrae a modo ícono cuando se abre un drawer derecho; botón hamburguesa siempre visible para control manual.
