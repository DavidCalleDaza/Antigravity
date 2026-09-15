---
name: donapp-architecture
description: Arquitectura, stack técnico y convenciones de código de DonApp (FastAPI + PostgreSQL en backend, React + Vite + Zustand en frontend). Consulta esta skill SIEMPRE que vayas a crear o modificar código en DonApp, decidir dónde ubicar un archivo nuevo, elegir un patrón de estado o de estilos, evaluar si un módulo tiene backend real o es mock, o tocar el modelo de datos multi-tenant. Úsala también antes de proponer librerías nuevas (Tailwind, MUI, etc.) o refactors de estado — hay decisiones ya tomadas que no se deben revertir sin justificación explícita.
---

# Arquitectura de DonApp

Estado del proyecto: MVP avanzado, UI/UX pulida (~9.3/10). Última actualización de contexto: septiembre 2026 (V12).

## Stack

**Backend**
- FastAPI 0.110.0 (async) + SQLAlchemy 2.0+ (`Mapped`/`DeclarativeBase`)
- PostgreSQL vía driver `asyncpg` — todo controlador y módulo usa `AsyncSessionMaker`, nunca sesiones síncronas
- Migraciones: Alembic (38 revisiones)
- Tareas en segundo plano: Celery + Redis
- Facturación DIAN: `lxml 5.4.0`, `signxml 4.5.1`, `cryptography 48.0.0`, `reportlab 4.5.1`
- Emails: `Jinja2 3.1.6`
- IA: Google GenAI SDK (Cascada Gemini + Veo)

**Frontend**
- React 18.3.1 + Vite 5.4.21, gestor de paquetes `pnpm` (monorepo workspace)
- Estado: Zustand 4.5.7, **siempre con selectores granulares** (ver antipatrón abajo)
- Router: React Router DOM 6.30.4
- Charts: Chart.js 4.5.1 + react-chartjs-2 — Iconos: Lucide React
- **CSS plano artesanal** (`variables.css`, `layout.css`, `components.css` + CSS por módulo). No hay Tailwind ni librería de componentes (MUI/Chakra) — decisión tomada, no la reintroduzcas sin que el usuario lo pida explícitamente.

## Routing (`App.jsx`)

Públicas: `/`, `/login`, `/register`, `/forgot-password`, `/unauthorized`, `/auth/callback`, `/verify/:cufe`, `/confirmar-mencion/:token`.
Protegidas (dentro de `MainLayout`): `/categories`, `/products`, `/services`, `/customers`, `/billing`, `/agenda`, `/wall`, `/statistics`, `/market`, `/profile`.
Administración Staff: `/admin/users`, `/admin/social`, `/admin/tokens`.

## API Layer (`apiClient.js`)

Todas las llamadas HTTP pasan por clientes centralizados: `authClient`, `productClient`, `serviceClient`, `socialClient`, `categoryClient`, `billingClient`, `agendaClient`, `adminClient`. **No escribas `fetch`/`axios` directo dentro de componentes** — es un antipatrón ya corregido una vez, no lo repitas.

## Modelo multi-tenant

No existe una entidad `Business`/`Negocio` explícita. El tenant es implícito: el `user_id` del propietario actúa como owner directo de sus recursos.

- `Product.user_id` y `Service.user_id` → FK a `users.id`
- `SocialAccount.user_id` y `SocialPost.user_id` → FK a `users.id`
- Relación: `User (propietario)` 1—N `Products / Services / SocialAccounts / Invoices / Appointments`

Si en algún momento se solicita agregar una capa de `Business` real, es un cambio de arquitectura mayor (migración de datos existentes) — señala esto explícitamente antes de implementarlo.

## Roles

Campo `role` en `users` (`Backend/app/modules/auth/models.py`):
- `admin`: acceso total
- `seller`: gestiona inventario, factura, publica en el muro, gestiona clientes y agenda
- `client`: consumidor final (vistas públicas / agendamiento de citas)
- `is_staff`: bandera booleana para acceso a rutas administrativas (`/admin/*`)

El backend valida identidad vía `get_current_user` y `get_current_staff_user`, pero la distinción fuerte de permisos de CRUD ocurre en frontend (`canManage = userRole === ADMIN || userRole === SELLER`). Si se toca autorización sensible, no asumas que el frontend es la única barrera.

## Estado de módulos (V12)

| Módulo | Frontend | Backend | Notas |
|---|---|---|---|
| Auth & Google OAuth | ✅ | ✅ | JWT HS256, Google PKCE, recuperación password |
| Products | ✅ | ✅ | Anchos fijos, galerías JSONB, importación Excel |
| Services | ✅ | ✅ | Tarifas, duración, galerías JSONB |
| Categories | ✅ | ✅ | Árbol jerárquico y filtro de entidad |
| Billing & DIAN | ✅ | ✅ | CUFE, XML, QR, PDFs, notas crédito, email |
| Verificación CUFE | ✅ | ✅ | Ruta pública `/verify/:cufe` |
| Social / OAuth | ✅ | ✅ | Meta Graph v20 + TikTok API + Cifrado Fernet |
| Wall & Mentions | ✅ | ✅ | WebSockets live + confirmación pública de mención |
| Agenda & Citas | ✅ | ✅ | Templates semanales, Overrides y booking real |
| WhatsApp Bot | ✅ | ✅ | Webhook HMAC-SHA256, NLU Gemini intents, OTP |
| AI Generation | ✅ | ✅ | Cascada Gemini, Veo en Celery, control de tokens |
| Admin Panels | ✅ | ✅ | Users, Social Accounts y Tokens/Pricing |
| Global Search | ✅ | ✅ | Endpoint `/api/v1/search` unificado |
| Profile | ✅ | ✅ | Incluye conexión de redes y datos personales |
| Statistics | ✅ | ✅ | Conectado a agregaciones reales de billingClient |
| Market | ⚠️ parcial | ❌ | Mock en frontend (pendiente motor de scraping/API) |

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
