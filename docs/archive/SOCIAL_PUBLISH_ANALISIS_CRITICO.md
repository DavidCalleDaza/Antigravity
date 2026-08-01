# Analisis Critico: Funcionalidad de Publicacion en Redes Sociales

**Fecha:** Julio 2026  
**Modulos auditados:** `Backend/app/modules/social/`, `Backend/app/modules/admin_social/`, `Frontend/src/modules/Social/`, `Frontend/src/components/ShareModal.jsx`, `Frontend/src/modules/Profile/SocialSettings.jsx`  
**Alcance:** TikTok, Instagram y Facebook — OAuth, gestion de cuentas y publicacion de contenido

---

## Resumen General

La funcionalidad tiene un **esqueleto solido** (modelos bien disenados, OAuth funcionando para Meta + TikTok, encryptado de tokens a nivel DB via `EncryptedString`), pero presenta **deficiencias criticas** que impiden que sea production-ready. El camino critico de publicacion (upload de imagen → obtener URL publica → llamar API de plataforma) tiene bugs que lo hacen no funcional en un entorno real.

---

## CRITICO — Bloqueantes para produccion

### 1. La URL publica de imagenes depende de ngrok/dominio de dev

**Archivos:** `Backend/app/modules/social/service.py:149-153`, `Backend/app/modules/social/tasks.py:124-126`

```python
base_url = settings.META_REDIRECT_URI.split("/api/v1")[0]
public_image_url = f"{base_url}/{local_path}"
```

Esto asume que el redirect URI de OAuth termina en `/api/v1/...` y que el mismo dominio sirve archivos estaticos. En produccion (Render), esto **no funcionara**: el dominio del callback de OAuth no es el mismo que sirve `uploads/`. Instagram y TikTok requieren URLs HTTPS publicas para publicar; si esto falla, **simplemente no se puede publicar contenido**.

**Solucion:** Subir imagenes a Cloudinary (ya integrado en el proyecto) y usar la URL publica de Cloudinary como `image_url` para Instagram y `photo_images` para TikTok. El proyecto ya tiene `cloudinary` en `requirements.txt`.

---

### 2. TikTok publica en `SELF_ONLY` (invisible al publico)

**Archivo:** `Backend/app/modules/social/service.py:179,224`

```python
"privacy_level": "SELF_ONLY",
```

Cualquier post en TikTok sera **privado, solo visible para el autor**. Esto es claramente un valor de testing que nunca se cambio. Debe ser `PUBLIC_TO_EVERYONE` o al menos configurable.

**Solucion:** Cambiar a `PUBLIC_TO_EVERYONE` o exponer como parametro en la request.

---

### 3. No hay test coverage del modulo social

**Archivo:** `Backend/tests/`

El directorio de tests contiene `test_agenda.py`, `test_auth_google.py`, `test_billing_statistics.py`, `test_password_recovery.py`, `test_main.py`. **Cero tests para el modulo social**. Ni unitarios, ni de integracion, ni mocks de las APIs externas de Meta/TikTok. Un refactor o cambio en las APIs externas puede romper todo sin deteccion.

**Solucion:** Agregar tests con `pytest` + `httpx.MockTransport`/`respx` para simular las respuestas de Meta Graph API y TikTok API v2.

---

### 4. El `media_url` del frontend no corresponde con un path local valido

**Archivos:** `Frontend/src/components/ShareModal.jsx:148`, `Backend/app/modules/social/tasks.py:108-126`

```javascript
// Frontend envia:
media_url: aiVideoUrl || item?.imageUrl || item?.image_url || ''
```

Los items de productos/servicios tienen `image_url` como URL de Cloudinary o path relativo (`uploads/productos/abc.jpg`). Pero el backend en `tasks.py` asume que `local_path` es un archivo en disco y hace:

```python
abs_path = f"/app/{local_path}"
img = Image.open(abs_path)
```

Si la imagen esta en Cloudinary, el worker fallara porque `Image.open()` no encuentra el archivo local. Si el item no tiene imagen local, `media_url` sera `''` y el endpoint respondera `400: media_url is required`.

**Solucion:** Subir la imagen a disco local o Cloudinary ANTES de encolar la tarea. El frontend debe enviar el contenido binario o el backend debe descargar la URL antes de procesar.

---

## ALTO — Riesgos importantes

### 5. `print()` de debug en produccion

**Archivo:** `Backend/app/modules/social/router.py:169,173`

```python
print(f"DEBUG META ME/ACCOUNTS RESPONSE: {me_data}")
print("DEBUG: NO PAGES FOUND IN META RESPONSE")
```

Esto contamina stdout/logs y potencialmente imprime datos sensibles (tokens, IDs de usuario).

**Solucion:** Eliminar o reemplazar con `logger.debug()`.

---

### 6. Imports inline dentro de funciones

**Archivo:** `Backend/app/modules/social/router.py:159,324`

```python
import httpx  # dentro de callback_platform()
from app.modules.social.tasks import publish_to_social_task  # dentro de publish_content()
```

Los imports deben estar al inicio del modulo. Los imports inline ocultan errores de dependencias hasta runtime y violan PEP 8.

**Solucion:** Mover ambos imports al top-level del archivo.

---

### 7. Solo se usa la primera pagina de Facebook

**Archivos:** `router.py:176`, `service.py:69`

```python
page = pages[0]  # o me_data["data"][0]
```

Si un usuario administra multiples paginas de Facebook, solo se usa la primera sin opcion de elegir. En el flujo manual (`SocialSettings.jsx`) SI se permite elegir pagina. Es inconsistente.

**Solucion:** En el flujo OAuth, si hay multiples paginas, redirigir a un paso de seleccion en el frontend (similar al flujo manual).

---

### 8. Flujo OAuth hardcodeado a `/products`

**Archivo:** `Backend/app/modules/social/router.py:78-82`

```python
def _frontend_redirect(status_val: str, **extra) -> RedirectResponse:
    base = settings.FRONTEND_URL or "http://localhost:5173"
    params = {"social_status": status_val, **extra}
    return RedirectResponse(url=f"{base}/products?{urlencode(params)}")
```

Si el usuario inicio el OAuth desde `/profile` o `/services`, igual es redirigido a `/products`. La URL de retorno deberia incluirse en el `state` firmado.

**Solucion:** Incluir `redirect_to` en el state y usarlo en la respuesta.

---

### 9. Sin refresh proactivo de tokens

**Archivo:** `Backend/app/modules/social/tasks.py:78-106`

El refresh de token de TikTok solo ocurre durante el publish. Si un usuario no publica por semanas, el token expira y la proxima publicacion falla. Los tokens de Meta son long-lived (60 dias), pero tampoco hay chequeo de expiracion ni renovacion proactiva.

**Solucion:** Agregar una tarea periodica de Celery Beat que revise tokens proximos a expirar y los renueve. Para Meta, manejar el flujo de re-autorizacion cuando el token expira.

---

### 10. Sin verificacion del estado de cuentas antes de publicar

El frontend (`ShareModal.jsx`, `SocialSettings.jsx`) muestra cuentas como "conectadas" basado solo en que existe un registro en `social_accounts`. No verifica si el token es valido. El usuario solo descubre el problema cuando la publicacion falla (asincronicamente, en Celery).

**Solucion:** Agregar un endpoint `GET /social/accounts/{platform}/status` que valide el token contra la API de la plataforma (similar a como lo hace `manual_credentials_service.py`).

---

## MEDIO — Debilidades de diseno

### 11. Sin soporte para Reels/Stories/Videos (excepto TikTok)

Instagram solo publica fotos via `image_url` (2-step container → publish). Facebook solo sube fotos via `POST /{page_id}/photos`. No hay soporte para videos, reels, stories, ni carruseles. TikTok SI tiene soporte de video via `FILE_UPLOAD`, pero con el privacy_level bug.

---

### 12. El worker Celery crea un engine por tarea

**Archivo:** `Backend/app/modules/social/tasks.py:96,123`

```python
engine = create_async_engine(settings.DATABASE_URL, ...)
```

Cada tarea de publish crea su propio `async_engine`, lo cual es costoso. El patron correcto es reutilizar una session factory compartida desde `app.db.session`.

**Solucion:** Usar `async_session_factory` ya definido en el archivo o pasar la session como parametro serializado.

---

### 13. TikTok scopes no coinciden con la funcionalidad de fotos

**Archivo:** `Backend/app/modules/social/router.py:66`

```python
scope=video.publish,video.upload,user.info.basic
```

Para publicar fotos via Content Posting API (`media_type: PHOTO`), los scopes requeridos pueden ser diferentes. Esto puede causar errores `403` de la API de TikTok.

**Solucion:** Verificar la documentacion actual de TikTok API v2 para confirmar los scopes correctos para photo posting.

---

### 14. Codigo muerto en frontend

- `showInstagramPanel` en `ShareModal.jsx:290-309`: nunca se activa — es unreachable
- `isMobile()` en `ShareModal.jsx:18`: definida pero nunca usada
- `SocialCallback.jsx`: no esta registrado en el router de `App.jsx` — es codigo zombie post-V10

---

### 15. Sin manejo granular de errores por plataforma en frontend

**Archivo:** `Frontend/src/components/ShareModal.jsx:141-163`

```javascript
for (const platform of selectedNetworks) {
    await socialClient.publish({ ... });
}
```

Si Facebook falla, la iteracion para Instagram y TikTok se interrumpe (por el `throw` del catch). El usuario solo ve un mensaje generico "Error al publicar" sin saber cual plataforma fallo o cuales tuvieron exito.

**Solucion:** Usar `Promise.allSettled` y reportar exitos/fallos por plataforma individualmente.

---

## BAJO — Mejoras deseables

### 16. Sin thumbnail/preview del post final

El usuario no ve como quedara el post en cada plataforma (diferentes aspect ratios, truncamiento de texto) antes de publicar.

---

### 17. TikTok: procesamiento de imagen redundante

`tasks.py:108-126`: la imagen se redimensiona a 1080x1920 con Pillow **cada vez que se publica**, incluso si ya fue procesada previamente.

---

### 18. Sin endpoint de historial de publicaciones

`schema SocialPost` existe en DB y `crud.py` tiene funciones, pero no hay `GET /social/posts` en el router. Solo existe `GET /social/post-status/{post_id}` para consultar una individual.

**Solucion:** Agregar `GET /social/posts` con paginacion y filtros (por plataforma, estado, fecha).

---

### 19. Sin rate limiting ni circuit breaker

Nada protege contra publicaciones repetidas accidentalmente (doble click) ni maneja degradacion graciosa cuando las APIs externas estan caidas. El unico mecanismo es el `max_retries=3` de Celery.

---

### 20. Potencial exposicion de tokens en logs

Los `print()` en `router.py:169` pueden imprimir el objeto `me_data` completo, que incluye `access_token` de la pagina de Facebook. Si los logs no estan sanitizados, es una vulnerabilidad de seguridad.

---

## Arquitectura actual — Lo que SI funciona bien

| Componente | Estado | Notas |
|---|---|---|
| Modelos DB (`social_accounts`, `social_tokens`, `social_app_credentials`, `social_posts`) | Solido | Buen diseno relacional, FK correctas, cascade delete apropiado |
| Encryptado de tokens (`EncryptedString`) | Correcto | Tokens encryptados at rest via `encrypt_token`/`decrypt_token` |
| Flujo OAuth Meta (autorizacion → callback → token exchange) | Funcional | Maneja cancelacion, expiracion de state, errores del provider |
| Flujo OAuth TikTok | Funcional | Incluye refresh token correctamente |
| Flujo manual de credenciales (`SocialSettings.jsx` + `manual_credentials_service.py`) | Funcional | Validacion contra API real antes de guardar, 2 pasos |
| Celery como mecanismo async de publish | Correcto | Patron adecuado para operaciones largas |
| Migraciones Alembic | Ordenadas | Migraciones coherentes y reversibles |

---

## Tabla de endpoints sociales

| Metodo | Ruta | Estado |
|--------|------|--------|
| `GET` | `/social/authorize/{platform}` | Funcional |
| `GET` | `/social/callback/{platform}` | Funcional (con bugs menores) |
| `POST` | `/social/accounts/manual/validate` | Funcional |
| `POST` | `/social/accounts/manual/confirm` | Funcional |
| `GET` | `/social/accounts` | Funcional |
| `DELETE` | `/social/accounts/{platform}` | Funcional |
| `POST` | `/social/publish` | **Roto en produccion** (URL publica + media_url mismatch) |
| `GET` | `/social/post-status/{post_id}` | Funcional |
| `FALTANTE` | `/social/posts` (historial) | No implementado |
| `FALTANTE` | `/social/accounts/{platform}/status` (health check) | No implementado |

---

## Recomendaciones priorizadas

| Prioridad | Accion | Impacto |
|-----------|--------|---------|
| **P0** | Implementar subida a Cloudinary y usar URLs publicas reales en lugar de derivarlas de `META_REDIRECT_URI` / `TIKTOK_REDIRECT_URI` | Desbloquea Instagram + TikTok publish en produccion |
| **P0** | Cambiar `SELF_ONLY` → `PUBLIC_TO_EVERYONE` en TikTok | Hace el contenido visible |
| **P0** | Resolver mismatch `media_url` frontend/backend: el backend debe descargar la URL o el frontend debe subir la imagen primero | El publish deja de fallar con `400` |
| **P1** | Eliminar `print()` debug, mover imports al top-level | Higiene de codigo y seguridad |
| **P1** | Agregar tests con mocks de `httpx` (Meta Graph API + TikTok API v2) | Previene regresiones |
| **P1** | Permitir seleccion de pagina Facebook cuando hay multiples | UX |
| **P1** | Incluir `redirect_to` en el state de OAuth | UX (retorno al contexto correcto) |
| **P2** | Implementar refresh proactivo de tokens via Celery Beat | Evita fallos por expiracion |
| **P2** | Agregar `GET /social/posts` y `GET /social/accounts/{platform}/status` | Visibilidad y diagnostico |
| **P2** | Cambiar publish secuencial a `Promise.allSettled` en frontend | UX (errores granulares) |
| **P3** | Soporte para Reels/Stories/video multiplataforma | Feature completeness |
| **P3** | Rate limiting + circuit breaker para APIs externas | Resiliencia |
