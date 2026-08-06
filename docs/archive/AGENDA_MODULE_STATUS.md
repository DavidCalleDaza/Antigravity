# Módulo Agenda — Informe de Estado Detallado

> **Fecha:** 15 Julio 2026
> **Estado general:** 80% completo (en working tree, sin committear)

---

## 1. Estado General

El módulo Agenda se encuentra en una fase de implementación muy avanzada. Los archivos del backend (modelos, esquemas, CRUD, router) están creados localmente **pero no han sido commitados** — `git status` los muestra como `??` (untracked). La migración de base de datos también está sin commitear. El frontend ya tenía una interfaz mock desde Julio 2026, pero acaba de ser actualizada para conectar con la API real.

---

## 2. Backend — Archivos nuevos (untracked)

| Archivo | Propósito | Estado |
|---|---|---|
| `Backend/app/modules/agenda/models.py` | 3 modelos ORM: `AvailabilityTemplate`, `AvailabilityOverride`, `Appointment` | Completo |
| `Backend/app/modules/agenda/schemas.py` | Schemas Pydantic: Create/Update/Response para templates, overrides, citas; `AvailableSlot`, `SellerPublicResponse`, `StoreLocationBrief` | Completo |
| `Backend/app/modules/agenda/crud.py` | CRUD asíncrono: operaciones sobre templates, overrides, appointments; cálculo de slots disponibles; consulta de vendedores públicos | Completo |
| `Backend/app/modules/agenda/router.py` | Router FastAPI con ~14 endpoints: templates CRUD, overrides CRUD, appointments CRUD, slots, sellers, store-locations | Completo |
| `Backend/alembic/versions/9b3a4f7c2d5e_add_agenda_and_store_locations.py` | Migración: crea `store_locations`, `availability_templates`, `availability_overrides`, `appointments`; añade `store_location_id` a products y services | Completo |

---

## 3. Backend — Archivos modificados (untracked)

| Archivo | Cambio | Estado |
|---|---|---|
| `Backend/app/modules/agenda/__init__.py` | Docstring actualizada | Completo |
| `Backend/app/db/base.py` | Se añadió `StoreLocation` y los 3 modelos de agenda | Completo |
| `Backend/app/main.py` | Se registró `agenda_router` con prefijo `/api/v1/agenda` | Completo |
| `Backend/app/modules/auth/models.py` | Relaciones `store_locations`, `availability_templates`, `availability_overrides` en `User` | Completo |
| `Backend/app/modules/locations/models.py` | Modelo `StoreLocation` completo | Completo |
| `Backend/app/modules/products/models.py` | `store_location_id` FK + relaciones | Completo |
| `Backend/app/modules/products/crud.py` | Gestión de `store_location_id` | Parcial |
| `Backend/app/modules/products/router.py` | Gestión de `store_location_id` | Parcial |
| `Backend/app/modules/products/schemas.py` | Incluye `store_location_id` | Parcial |
| `Backend/app/modules/services/models.py` | `store_location_id` FK + relaciones | Completo |
| `Backend/app/modules/services/crud.py` | Gestión de `store_location_id` | Parcial |
| `Backend/app/modules/services/router.py` | Gestión de `store_location_id` | Parcial |
| `Backend/app/modules/services/schemas.py` | Incluye `store_location_id` | Parcial |

---

## 4. Frontend

| Archivo | Cambio | Estado |
|---|---|---|
| `Frontend/src/modules/Agenda/Agenda.jsx` | Vista vendedor (3 tabs: horario semanal, excepciones, citas) + Vista cliente (3 pasos: vendedor, fecha, horario) | Modificado localmente |
| `Frontend/css/pages/agenda.css` | 419 líneas de estilos | Modificado localmente |
| `Frontend/src/utils/apiClient.js` | `agendaClient` con 12 métodos | Commit `4443ba8` |
| `Frontend/src/modules/Products/Products.jsx` | Botón "Ver Agenda" por producto | Modificado localmente |
| `Frontend/src/modules/Services/Services.jsx` | Botón "Agendar" por servicio | Modificado localmente |

### Archivos pre-existentes (no modificados) que referencian agenda

- `Frontend/src/main.jsx` — Importa `agenda.css`
- `Frontend/src/App.jsx` — Ruta `/agenda` → componente Agenda
- `Frontend/src/config/appConfig.js` — `AGENDA_STATUS`, nav item
- `Frontend/src/modules/Dashboard/Dashboard.jsx` — Enlace "Agendar Cita"
- `Frontend/src/modules/Landing/Landing.jsx` — "Agenda Inteligente" en marquee
- `Frontend/src/modules/Landing/featureData.js` — Tarjeta de feature con 6 funcionalidades
- `Frontend/src/utils/mockData.js` — 8 citas mock (`apt_001` a `apt_008`)
- `Frontend/js/config.js` — Config legacy
- `Frontend/js/utils/mockData.js` — Mock data legacy

---

## 5. Estructura de Base de Datos (Migración `9b3a4f7c2d5e`)

### Tablas nuevas

| Tabla | Columnas principales | FK |
|---|---|---|
| `store_locations` | id, user_id, location_id, name, phone, is_active, is_primary, created_at | users, locations |
| `availability_templates` | id, user_id, day_of_week (0=Dom..6=Sáb), start_time, end_time, is_available, created_at | users |
| `availability_overrides` | id, user_id, date, start_time, end_time, is_available, reason, created_at | users |
| `appointments` | id, seller_id, client_id, service_id, store_location_id, date, start_time, end_time, status (pending/confirmed/cancelled/completed), notes, created_at, updated_at | users, services, store_locations |

### Tablas modificadas

| Tabla | Columna añadida |
|---|---|
| `products` | `store_location_id` → FK a `store_locations` |
| `services` | `store_location_id` → FK a `store_locations` |

**Dependencia:** migración padre → `cead60bc2af0` ("google_auth")

---

## 6. Endpoints de la API (`/api/v1/agenda`)

### Disponibilidad (seller/admin)

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/availability/templates` | Listar plantillas semanales |
| POST | `/availability/templates` | Crear plantilla |
| PATCH | `/availability/templates/{id}` | Actualizar plantilla |
| DELETE | `/availability/templates/{id}` | Eliminar plantilla |
| GET | `/availability/overrides` | Listar excepciones (con filtro fecha) |
| POST | `/availability/overrides` | Crear excepción |
| DELETE | `/availability/overrides/{id}` | Eliminar excepción |

### Citas (clientes + sellers)

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/appointments` | Listar citas según rol |
| POST | `/appointments` | Crear cita (solo clientes) |
| PATCH | `/appointments/{id}` | Actualizar cita (cambiar status) |

### Slots (público)

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/slots` | Slots disponibles para vendedor/fecha |

### Vendedores (público)

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/sellers` | Listar vendedores activos |
| GET | `/sellers/{id}` | Detalle de vendedor |

### Sucursales (seller/admin)

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/store-locations` | Listar sucursales propias |
| POST | `/store-locations` | Crear sucursal |
| DELETE | `/store-locations/{id}` | Eliminar sucursal |

---

## 7. Commits relevantes

| Hash | Fecha | Autor | Descripción |
|---|---|---|---|
| `4443ba8` | 2026-07-14 | David Calle | feat: implement WhatsApp Cloud API — añade `agendaClient` a `apiClient.js` |
| `a74b84b` | 2026-07-04 | Romerome02 | Implementación modulo facturacion v2 — versión anterior de Agenda.jsx, agenda.css, mockData |
| `2522ab5` | 2026-05-11 | David Calle | Initial commit |

**Nota:** No hay ningún commit que mencione explícitamente "agenda" en su mensaje. Los archivos del backend (models, schemas, crud, router) y la migración no existen en ningún commit — son archivos nuevos sin trackear.

---

## 8. Pruebas (tests)

**No existen pruebas para el módulo Agenda.**

El proyecto tiene 10 tests en total:
- `Backend/tests/test_auth_google.py` — 1 test
- `Backend/tests/test_main.py` — 1 test
- `Backend/tests/whatsapp/` — 6 tests

Ninguno cubre modelos, CRUD o endpoints del módulo Agenda.

---

## 9. Referencias en documentación

`DONAPP_CONTEXT V10.md` (14 Julio 2026) describe el módulo Agenda:

- **Estado actual:** "Agenda - Parcial - Mock data - CRÍTICO"
- **Backend:** `Backend/app/modules/agenda/` contenía solo `__init__.py` vacío (antes del cambio local)
- **Frontend:** `Agenda/` usaba mock data
- **Deuda técnica crítica:** "Módulo Agenda 0% — Sin modelo, router, schemas ni endpoints"
- **Roadmap:** "Desarrollar backend de Agenda — 3-5 días — Prioridad 1"

---

## 10. Evaluación General

### Estado: 80% COMPLETO (en working tree)

**Backend** (recién implementado, sin commitear):
- ✅ Modelos ORM completos con relaciones y foreign keys
- ✅ Schemas Pydantic completos (create, update, response)
- ✅ CRUD asíncrono completo con lógica de cálculo de slots
- ✅ Router con 14 endpoints, autorización por roles, validaciones
- ✅ Migración Alembic completa con 4 tablas nuevas + modificaciones
- ✅ Registro en `main.py`, `base.py`, `auth/models.py`, `locations/models.py`
- ✅ Integración con products y services (`store_location_id`)
- ❌ Sin pruebas unitarias ni de integración
- ❌ Sin commitear — el backend completo solo existe localmente

**Frontend** (antes mock, ahora conectándose a API):
- ✅ Componente React completo con dos vistas (vendedor y cliente)
- ✅ Vista vendedor: 3 tabs (horario semanal, excepciones, citas)
- ✅ Vista cliente: 3 pasos (vendedor, fecha, horario)
- ✅ `agendaClient` en `apiClient.js` con todos los métodos de API
- ✅ Integración con módulos Products y Services
- ✅ Estilos CSS completos y responsivos
- ✅ Configuración de navegación y routing
- ❌ Algunos archivos de productos/servicios parcialmente modificados
- ⚠️ Datos mock de `mockData.js` obsoletos funcionalmente

### Riesgos

| Riesgo | Impacto | Descripción |
|---|---|---|
| 🔴 **Crítico** | Todo el backend de Agenda y la migración están sin commitear | Si se pierde el working tree, se pierden ~4 días de trabajo |
| 🟡 **Medio** | Sin tests | La lógica de cálculo de slots (templates + overrides + appointments) es propensa a bugs |
| 🟡 **Medio** | Vista cliente usa `useSearchParams` para `seller_id`/`service_id` | No hay validación de que esos IDs existan antes de la selección |
| 🟢 **Bajo** | Código legacy en `Frontend/js/` | No usado por la app React |

### Conclusión

El módulo Agenda está siendo implementado actualmente como una feature completa. El frontend ya estaba preparado con una interfaz mock, y ahora se está conectando al backend real. Los archivos del backend (models, schemas, crud, router) están completos y funcionalmente terminados, pero **no han sido commitados**. Una vez que se commitee la migración y se ejecute, el módulo Agenda estará completo y operativo (~95%), quedando pendiente únicamente la creación de tests y la verificación de integración.
