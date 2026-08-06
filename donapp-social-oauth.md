---
name: donapp-social-oauth
description: Flujo OAuth y publicación en redes sociales (Meta/Facebook/Instagram y TikTok) de DonApp, incluyendo manejo de CSRF state, mapeo de plataformas y persistencia de tokens. Consulta esta skill SIEMPRE que trabajes en autenticación social, callbacks OAuth, el módulo `app/modules/social/`, o publicación de contenido en redes. Contiene bugs ya corregidos que NO debes reintroducir bajo ninguna circunstancia (separación Meta/Instagram, validación de CSRF state, normalización de nombres de plataforma).
---

# OAuth y publicación social en DonApp

## Arquitectura general

Modelo híbrido: DonApp es la "App Developer" registrada (`settings.META_APP_ID`, etc.), pero cada negocio (`user_id`) autoriza individualmente el acceso a sus propias cuentas. Los tokens resultantes viven en `social_accounts` y `social_tokens` (`Backend/app/modules/social/models.py`), vinculados por `user_id` + plataforma.

## Flujo OAuth por plataforma

Código de referencia: `Backend/app/modules/social/router.py`.

**CSRF / state**: se firma un payload `{"user_id": ..., "platform": ...}` con `URLSafeTimedSerializer` (`itsdangerous`). Expira a los 10 minutos (`STATE_MAX_AGE = 600`). **Nunca implementes un callback OAuth nuevo sin este mecanismo de state firmado.**

**Meta (Facebook/Instagram)**:
- Scopes: `business_management, pages_show_list, pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish`
- Callback: intercambia el código por access_token, llama a `/me/accounts` (Graph API) para listar la página de Facebook y su `instagram_business_account` vinculada si existe.

**TikTok**:
- Scopes: `video.publish, video.upload, user.info.basic`
- Callback: retorna `access_token`, `expires_in` y `refresh_token` propio (a diferencia de Meta).

## Mapeo de nombres de plataforma — regla crítica

- Los endpoints `/authorize/{platform}` y `/callback/{platform}` **siempre normalizan a minúsculas** (`target = platform.lower()`).
- Cuando el flujo es Meta/FB/IG, el intercambio de token se hace internamente bajo `target = "meta"`, pero al persistir se crean **dos registros separados**: `platform="facebook"` y `platform="instagram"`.
- **Bug ya corregido — no lo repitas**: antes no se separaba Instagram de Facebook (quedaban mezclados bajo un solo registro), y existían discrepancias de mayúsculas ("Facebook" vs "facebook") que rompían comparaciones. La corrección fue inspeccionar `instagram_business_account` en la respuesta de Graph API y crear las dos entidades `SocialAccount` de forma explícita.

## Publicación

- `POST /social/publish` encola una tarea de Celery (`publish_to_social_task.delay()`) — la publicación es asíncrona, no síncrona en el request.
- **TikTok es exclusivamente video** — las APIs V2 de TikTok no aceptan imagen. Facebook/Instagram sí aceptan imagen o video. Si vas a agregar validación de payload, esta restricción debe aplicarse a nivel de request antes de encolar la tarea.
- Se requiere `media_url` local de DonApp (no URLs externas arbitrarias).

## Persistencia de tokens

- `access_token` y `refresh_token` se almacenan con el tipo personalizado `EncryptedString` (cifrado bidireccional vía `cryptography`) — nunca en texto plano.
- Meta típicamente entrega tokens *long-lived* sin refresh token; TikTok sí entrega refresh token — no asumas que ambas plataformas se renuevan igual.
- `cascade="all, delete-orphan"` en la relación asegura limpieza de tokens al desconectar una cuenta.

## Manejo de errores de state

Las excepciones `SignatureExpired` y `BadSignature` del state firmado se capturan y redirigen al frontend con querystring de error, ej.:
```
http://localhost:5173/products?social_status=error&detail=state_expired
```
Sigue este patrón (redirect con `social_status` y `detail`) para cualquier error nuevo del flujo OAuth, en vez de devolver un JSON de error crudo — el frontend ya espera este contrato.

## Entorno de desarrollo

- **Webhooks locales**: requiere ngrok como proxy HTTPS hacia `localhost:8000` para registrar callbacks válidos (ej. `https://<id>.ngrok-free.app/api/v1/social/callback/meta`).
- **Sandbox**: página de prueba de Meta ("DonApp"), cuenta IG Business vinculada (`@donapp.oficial`). TikTok exige que el `user_id` esté en whitelist de la Developer App para poder probar.

## Antes de tocar este módulo

Si vas a agregar una plataforma nueva o modificar el callback existente, verifica primero contra esta skill que no estás reintroduciendo: mezcla de Meta/Instagram en un solo registro, comparaciones de plataforma sensibles a mayúsculas, o ausencia de validación de state firmado.
