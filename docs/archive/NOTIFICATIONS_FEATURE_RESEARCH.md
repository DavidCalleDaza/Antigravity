# Investigación Previa — Features: Citas Cliente, Email, Notificaciones In-App

> **Fecha:** 15 Julio 2026
> **Propósito:** Investigación del estado actual del proyecto ServiNow para preparar la implementación de:
> 1. Vista de citas del cliente
> 2. Notificaciones por email
> 3. Notificaciones in-app (icono de campana)
>
> **No se implementó nada — solo investigación y reporte.**

---

## 1. Tareas en Background / Celery

### Dependencias instaladas

| Dependencia | Archivo | Línea | Estado |
|---|---|---|---|
| `celery>=5.4.0` | `Backend/requirements.txt` | 43 | ✅ Instalada |
| `redis>=5.0.0` | `Backend/requirements.txt` | 44 | ✅ Instalada |
| `kombu` | — | — | ❌ No explicitada (viene con Celery) |

### Archivo de configuración de Celery

**`Backend/app/core/celery_app.py`** — App `servinow_worker` configurada con:

```python
celery_app = Celery(
    "servinow_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.modules.social.tasks", "app.modules.ai.tasks", "app.modules.whatsapp.tasks"]
)
```

- Broker/backend: `redis://redis:6379/0` (desde `settings.REDIS_URL`)
- Serializer: JSON
- Timezone: UTC
- Ya incluye manejo de `worker_process_init` con event loop asyncio y `engine.dispose()`
- **Las tasks de agenda/notificaciones se añadirían al `include`**

### ¿Cómo implementa WhatsApp el background processing?

El módulo WhatsApp usa **Celery** con el siguiente patrón:

1. **`whatsapp/router.py:123-124`** — El webhook de Meta recibe el payload y lo encola:
   ```python
   from app.modules.whatsapp.tasks import process_whatsapp_message
   process_whatsapp_message.delay(payload)
   ```

2. **`whatsapp/tasks.py:266-274`** — Tarea Celery definida con `@celery_app.task`, usa `loop.run_until_complete()` para ejecutar lógica asíncrona:
   ```python
   @celery_app.task(name="process_whatsapp_message", bind=True, max_retries=3)
   def process_whatsapp_message(self, payload: dict):
       loop = celery_app._worker_loop
       loop.run_until_complete(async_process_message(payload, retries=self.request.retries))
   ```

3. **`whatsapp/service.py`** — Servicio síncrono (pero con métodos `async def`) que hace llamadas HTTP con `httpx.AsyncClient`.

**Patrón reutilizable para notificaciones por email:**
```
router.py → .delay() → tasks.py (Celery) → loop.run_until_complete() → service.py (lógica real)
```

### docker-compose.yml

**`Backend/docker-compose.yml`** — Ya incluye todos los servicios necesarios:

| Servicio | Imagen | Propósito |
|---|---|---|
| `db` | `postgres:15-alpine` | PostgreSQL |
| `web` | Build local | FastAPI (via `entrypoint.sh`) |
| `redis` | `redis:7-alpine` | Message broker para Celery |
| `worker` | Build local | Celery worker (`celery -A app.core.celery_app.celery_app worker`) |
| `flower` | `mher/flower` | UI monitoreo (puerto 5555) |

### Entrypoint / Procfiles

| Archivo | Estado | Detalle |
|---|---|---|
| `Backend/entrypoint.sh` | ✅ Existe | Corre `alembic upgrade head` + `uvicorn app.main:app` |
| `Procfile` | ❌ No existe | — |
| `supervisord.conf` | ❌ No existe | — |
| README con instrucciones worker | ❌ No documentado | — |

**El worker se levanta exclusivamente via `docker-compose up worker`.**

---

## 2. Envío de Emails

### Librerías y utilidades existentes

| Aspecto | Estado | Detalle |
|---|---|---|
| Librería SMTP | ✅ `smtplib` (stdlib) | Usada en `billing/invoice_email_service.py` |
| Cliente HTTP email (SendGrid, Mailgun, etc.) | ❌ No hay | Solo SMTP directo |
| Plantilla HTML email | ✅ Jinja2 | `billing/templates/invoice_email.html` (88 líneas, completa) |
| Endpoint send-email | ✅ Existe | `POST /api/v1/billing/invoices/{id}/send-email` |
| Uso de Celery para email | ❌ No | `send_invoice_email` se llama síncrono con `run_in_threadpool` |

### Variables de entorno faltantes

**El módulo `invoice_email_service.py` referencia estas variables de `settings` que NO existen en `config.py`:**

| Variable | Estado | ¿Dónde debería ir? |
|---|---|---|
| `SMTP_HOST` | ❌ No definida | `app/core/config.py` + `.env` |
| `SMTP_PORT` | ❌ No definida | `app/core/config.py` + `.env` |
| `SMTP_USER` | ❌ No definida | `app/core/config.py` + `.env` |
| `SMTP_PASSWORD` | ❌ No definida | `app/core/config.py` + `.env` |
| `SMTP_FROM_EMAIL` | ❌ No definida | `app/core/config.py` + `.env` |
| `SMTP_FROM_NAME` | ❌ No definida | `app/core/config.py` + `.env` |
| `SMTP_USE_TLS` | ❌ No definida | `app/core/config.py` + `.env` |
| `COMPANY_NAME` | ❌ No definida | `app/core/config.py` + `.env` |
| `COMPANY_NIT` | ❌ No definida | `app/core/config.py` + `.env` |
| `COMPANY_ADDRESS` | ❌ No definida | `app/core/config.py` + `.env` |
| `COMPANY_CITY` | ❌ No definida | `app/core/config.py` + `.env` |
| `COMPANY_PHONE` | ❌ No definida | `app/core/config.py` + `.env` |

**⚠️ El endpoint `POST /api/v1/billing/invoices/{id}/send-email` fallaría en runtime** porque `settings.SMTP_HOST` (y todos los demás) lanzarían `AttributeError`.

### Patrón a seguir para email de citas

El módulo WhatsApp (`whatsapp/service.py` → `tasks.py` → `router.py`) es el patrón probado. Para email se replicaría:

1. Crear `notifications/email_service.py` (similar a `whatsapp/service.py`) con lógica SMTP
2. Crear `notifications/tasks.py` con tarea Celery que llame al servicio
3. En el CRUD de agenda (`crud.py`), después de crear/actualizar una cita, encolar `.delay()`

---

## 3. Notificaciones Existentes

### Backend

| Aspecto | Estado | Detalle |
|---|---|---|
| Modelo/Tabla `notifications` | ❌ No existe | No hay migración, modelo, schemas ni endpoints |
| TODO en código | ⚠️ Referencia | `auth/google.py:223`: `# TODO: Trigger Celery task to send notification email about new linked identity` |

### Frontend — Header.jsx

**Archivo:** `Frontend/src/components/layout/Header.jsx`

```jsx
import { Bell } from 'lucide-react';
// ...
<button className="navbar-notification" id="notifications-btn" data-tooltip="Notificaciones">
  <Bell width="20" height="20" />
  <span className="notification-dot"></span>
</button>
```

**Estado: COMPLETAMENTE ESTÁTICO**
- No hay `onClick`
- No hay estado de conteo
- No hay dropdown
- `notification-dot` es un `<span>` decorativo sin lógica
- No hay integración con ningún store

### Mecanismos de tiempo real existentes

| Mecanismo | ¿Existe? | Dónde | Uso actual |
|---|---|---|---|
| **WebSocket** | ✅ Sí | `wall/router.py` — `/ws/wall` | Broadcast de posts/comentarios en tiempo real. Usa `ConnectionManager` con `broadcast()`. |
| **Polling HTTP** | ✅ Sí | `social/router.py` — `GET /social/post-status/{id}` | Consulta de estado de publicación social |
| **SSE (EventSource)** | ❌ No | — | No implementado |
| **Socket.IO** | ❌ No | — | No instalado |

**El `ConnectionManager` del Wall module es directamente reutilizable** para notificaciones. Solo habría que crear un WebSocket endpoint separado (ej. `/ws/notifications`) y enviar eventos específicos por usuario.

### Store global (Zustand)

**`Frontend/src/store/useStore.js`** — Store con persistencia a localStorage. Actualmente maneja:

- `theme`, `toggleTheme`
- `sidebarCollapsed`
- `currentUser`, `isAuthenticated`, `login`, `logout`
- `landingDrawers`

No hay estado de notificaciones. Sería trivial añadir:

```js
notifications: [],
unreadCount: 0,
setNotifications: (list) => set({ notifications: list, unreadCount: list.filter(n => !n.read).length }),
markAsRead: (id) => set((state) => {
  const updated = state.notifications.map(n => n.id === id ? { ...n, read: true } : n);
  return { notifications: updated, unreadCount: updated.filter(n => !n.read).length };
}),
addNotification: (notification) => set((state) => ({
  notifications: [notification, ...state.notifications],
  unreadCount: state.unreadCount + 1,
})),
```

---

## 4. Configuración del Entorno

### Backend — Dependencias relevantes (`requirements.txt`)

| Dependencia | Versión | Propósito |
|---|---|---|
| `fastapi>=0.110.0` | — | Framework web |
| `uvicorn[standard]>=0.27.0` | — | Servidor ASGI |
| `sqlalchemy[asyncio]>=2.0.0` | — | ORM asíncrono |
| `asyncpg>=0.29.0` | — | Driver PostgreSQL |
| `alembic>=1.13.0` | — | Migraciones |
| `celery>=5.4.0` | — | Background jobs |
| `redis>=5.0.0` | — | Broker Celery + caching |
| `jinja2>=3.1.3` | — | Templates HTML (email) |
| `httpx>=0.27.0` | — | Cliente HTTP async |
| `pydantic>=2.5.0` | — | Validación |
| `pydantic-settings>=2.1.0` | — | Config desde .env |
| `python-jose[cryptography]>=3.3.0` | — | JWT |
| `bcrypt>=4.0.0` | — | Hashing |

### Frontend — Dependencias relevantes (`package.json`)

| Dependencia | Versión | Propósito |
|---|---|---|
| `react` | ^18.3.1 | UI framework |
| `react-router-dom` | ^6.30.4 | Navegación SPA |
| `zustand` | ^4.5.7 | Estado global |
| `lucide-react` | ^0.300.0 | Iconos (Bell ya importado) |
| `react-icons` | ^5.6.0 | Iconos adicionales |
| `vite` | ^5.4.21 | Build tool |

**No hay librerías de WebSocket/polling en el frontend** — se usa `WebSocket` nativo del navegador (el Wall module no necesita librería externa).

### Deploy / Entorno

| Aspecto | Detalle |
|---|---|
| **Local dev** | Docker Compose (PostgreSQL + Redis + Celery + Flower + FastAPI) |
| **Frontend dev** | Vite dev server (puerto 5173) |
| **Producción hint** | `Frontend/.env.example` menciona `https://servinow-api.onrender.com` |
| **Plataforma** | Posiblemente Render o Railway (no hay evidencia concluyente) |
| **Worker en prod** | No documentado |

**Celery+Redis es viable** tanto en Docker Compose (local) como en Render (Redis + Celery Worker son servicios soportados).

---

## 5. Estado de Git Relevante

### Módulo Agenda — AÚN SIN COMMITEAR

```
?? Backend/alembic/versions/9b3a4f7c2d5e_add_agenda_and_store_locations.py
?? Backend/app/modules/agenda/crud.py
?? Backend/app/modules/agenda/models.py
?? Backend/app/modules/agenda/router.py
?? Backend/app/modules/agenda/schemas.py

 M Backend/app/db/base.py
 M Backend/app/main.py
 M Backend/app/modules/agenda/__init__.py
 M Backend/app/modules/auth/models.py
 M Backend/app/modules/locations/models.py
 M Backend/app/modules/products/crud.py
 M Backend/app/modules/products/models.py
 M Backend/app/modules/products/router.py
 M Backend/app/modules/products/schemas.py
 M Backend/app/modules/services/crud.py
 M Backend/app/modules/services/models.py
 M Backend/app/modules/services/router.py
 M Backend/app/modules/services/schemas.py
 M Frontend/css/pages/agenda.css
 M Frontend/src/modules/Agenda/Agenda.jsx
 M Frontend/src/modules/Products/Products.jsx
 M Frontend/src/modules/Services/Services.jsx
 M Frontend/src/utils/apiClient.js
```

### Archivos no relacionados con Agenda con cambios

| Archivo | Estado | Nota |
|---|---|---|
| `Frontend/dist/index.html` | ` M` | Build artifact — probablemente no intencional, descartar |
| `start.bat` | ` M` | Script de arranque Windows |
| `start.sh` | `??` | Script de arranque Linux (nuevo) |
| `docs/archive/AGENDA_MODULE_STATUS.md` | `??` | Reporte generado previamente |

Ninguno representa riesgo para empezar las nuevas features, pero se recomienda commitear o limpiar.

---

## 6. Recomendación Técnica

### Email: ✅ Celery+Redis, no BackgroundTasks

| Criterio | Celery+Redis | `BackgroundTasks` de FastAPI |
|---|---|---|
| Persistencia ante fallos | ✅ Retry con backoff (`max_retries=3`) | ❌ Se pierde si el servidor falla |
| Ya implementado | ✅ 3 módulos (social, ai, whatsapp) | — |
| Worker en docker-compose | ✅ Ya configurado | — |
| Escalabilidad | ✅ Múltiples workers | ❌ Misma instancia |
| Complejidad para este volumen | Aceptable (ya está todo listo) | Menor, pero insuficiente |

**Veredicto:** Usar Celery+Redis. El patrón ya existe y está probado en WhatsApp. Para emails de citas se crearía una tarea similar a `process_whatsapp_message`.

### Notificaciones In-App

**Backend:**
1. Crear tabla `notifications` (id, user_id, type, title, message, data_json, read, created_at)
2. Endpoint REST `GET /api/v1/notifications` con paginación y filtro `?unread_only=true`
3. Endpoint `PATCH /api/v1/notifications/{id}/read` para marcar como leída
4. Opcional: WebSocket `/ws/notifications` (reutilizando `ConnectionManager` del Wall module) para broadcast en tiempo real
5. La tarea Celery de email también crea el registro en `notifications` antes de enviar

**Frontend:**
1. Store en `useStore.js`: `notifications`, `unreadCount`, `addNotification`, `markAsRead`
2. `Header.jsx`: conectar `onClick` del Bell a un dropdown con lista de notificaciones
3. Badge numérico en el icono con `unreadCount`
4. WebSocket para recibir notificaciones en tiempo real (o polling cada N segundos como fallback)

### Riesgos Antes de Empezar

1. 🔴 **Commitear el módulo Agenda primero.** Si se pierde el working tree, se pierden ~4 días de trabajo.
2. 🟡 **SMTP no configurado.** Las 12 variables (`SMTP_*` y `COMPANY_*`) no existen ni en `config.py` ni en `.env`. Habrá que crearlas antes de que funcione cualquier envío de email.
3. 🟡 **`send-invoice-email` está roto.** El endpoint `POST /api/v1/billing/invoices/{id}/send-email` existe pero crashea por falta de `settings.SMTP_HOST`. Considerar corregirlo como parte del alcance.
4. 🟢 **`Frontend/dist/index.html` modificado.** Limpiar antes de empezar para evitar ruido en commits.
