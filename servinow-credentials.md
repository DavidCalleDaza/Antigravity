---
name: servinow-credentials
description: Modelo de datos, cifrado y reglas de acceso del sistema de credenciales de apps sociales (`social_app_credentials`) en ServiNow. Consulta esta skill SIEMPRE que trabajes con almacenamiento de App ID/Secret, cifrado de tokens, auditoría de cambios de credenciales, o los endpoints `/social/accounts/manual/*`. Regla innegociable: `app_secret` y los tokens de acceso NUNCA se exponen en schemas de respuesta, logs, ni al frontend en texto plano.
---

# Gestión de credenciales sociales en ServiNow

## Modelo de datos

Tabla `social_app_credentials` (`Backend/app/modules/social/models.py`):

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK `users.id`, `ON DELETE CASCADE` |
| `platform_group` | String(20) | `"meta"`, `"tiktok"` |
| `app_id` | String(255) | — |
| `app_secret` | `EncryptedString` | cifrado, ver abajo |
| `created_at` | DateTime tz | `func.now()` |
| `last_modified_by` | UUID | FK `users.id`, `ON DELETE SET NULL` |
| `last_modified_at` | DateTime tz | `onupdate=func.now()` |

Si agregas un campo nuevo a esta tabla, cualquier dato sensible (secrets, tokens) debe usar el mismo tipo `EncryptedString`, no `String` plano.

## Reglas de acceso

El `user_id` es el dueño del negocio. Las credenciales de aplicación pueden venir de dos fuentes:

1. **Sistema global**: cargadas desde variables de entorno `.env` (la app developer de ServiNow).
2. **Por usuario/negocio**: un `seller`/dueño puede proveer su propia App de Facebook/Instagram vía validación manual (`/accounts/manual/validate` → `/manual/confirm`).

Los usuarios tienen un flag `is_staff` que reserva vistas de administración global, pero las rutas de credenciales actuales están acopladas a `current_user.id`, no a `is_staff` — **si vas a construir un panel de administración global de credenciales, necesitas agregar explícitamente la verificación de `is_staff`, no está implementada todavía en ese flujo.**

## Cifrado y exposición

- `app_secret` usa el decorador SQLAlchemy `EncryptedString`, con `encrypt_token`/`decrypt_token` basados en AES sobre `settings.SECRET_KEY`.
- A nivel de base de datos el secret es ilegible directamente.
- **Nunca** incluyas `app_secret` ni tokens de acceso en un schema Pydantic de respuesta (`*Response`). Solo deben desencriptarse en memoria del backend, en el momento exacto de autenticar contra la API externa — nunca deben viajar hacia el frontend ni quedar en logs (`logger.info`/`logger.warning`).

## Auditoría

- `last_modified_by` + `last_modified_at` registran quién y cuándo se modificó una credencial, vía relación ORM `modifier = relationship("User", foreign_keys=[last_modified_by])`.
- Esto da trazabilidad básica de la última modificación, **no es una bitácora histórica completa** — si se pide historial de todos los cambios (no solo el último), se necesita una tabla auxiliar de auditoría nueva; no asumas que ya existe.

## Flujos existentes

- **App centralizada**: login OAuth estándar heredando secretos globales del `.env` (flujo normal descrito en `servinow-social-oauth`).
- **Credenciales manuales propias**: `POST /social/accounts/manual/validate` valida `app_id`/`app_secret` provistos por el negocio contra la API externa; `manual/confirm` persiste el registro cifrado y verifica el `access_token` resultante antes de darlo por válido.

Si vas a modificar este flujo, no bajes la validación de `manual/validate` — es lo único que evita guardar credenciales inválidas cifradas en base de datos.
