# AUDITORÍA TÉCNICA: MÓDULO DE INTEGRACIÓN SOCIAL (PRE-IMPLEMENTACIÓN)

Este documento presenta el estado de preparación técnica de ServiNow (FastAPI + React) con respecto a la pre-implementación de la funcionalidad de publicación de productos y servicios en redes sociales (Facebook, Instagram y TikTok).

---

## 1. BACKEND — MÓDULO `social/`

### 1.1 Estructura de Archivos
La lista de archivos presentes en la ruta [Backend/app/modules/social/](file:///Ubuntu/home/davidcalle/Projects/Servinow/Backend/app/modules/social/) y su respectivo propósito técnico:
1. [models.py](file:///Ubuntu/home/davidcalle/Projects/Servinow/Backend/app/modules/social/models.py): Contiene las definiciones ORM de SQLAlchemy para las tablas de base de datos asociadas a cuentas vinculadas (`SocialAccount`) y posts publicados (`SocialPost`).
2. [schemas.py](file:///Ubuntu/home/davidcalle/Projects/Servinow/Backend/app/modules/social/schemas.py): Define los esquemas de validación y serialización de datos de Pydantic para peticiones y respuestas.
3. [router.py](file:///Ubuntu/home/davidcalle/Projects/Servinow/Backend/app/modules/social/router.py): Expone los endpoints de la API FastAPI correspondientes al módulo.
4. [crud.py](file:///Ubuntu/home/davidcalle/Projects/Servinow/Backend/app/modules/social/crud.py): Encapsula las operaciones asíncronas de lectura y escritura en la base de datos PostgreSQL utilizando SQLAlchemy.

### 1.2 Modelos de Datos en `social/models.py`

#### A. Modelo `SocialAccount`
Define las credenciales OAuth y metadatos de las redes conectadas de cada usuario. Sus campos exactos son:
* `id`: `UUID` (Llave primaria, auto-generado).
* `user_id`: `UUID` (Llave foránea hacia `users.id`, con política `ondelete="CASCADE"`, obligatorio).
* `platform`: `String(20)` (Enum con valores: `"tiktok"`, `"instagram"`, `"facebook"`, obligatorio).
* `platform_user_id`: `String(255)` (ID de usuario provisto por la plataforma, opcional).
* `platform_username`: `String(255)` (Nombre de usuario provisto por la plataforma, opcional).
* `access_token`: `Text` (Token de acceso OAuth para llamadas a API, obligatorio).
* `refresh_token`: `Text` (Token de actualización para renovar credenciales expiradas, opcional).
* `expires_at`: `DateTime(timezone=True)` (Fecha/hora de vencimiento del `access_token`, opcional).
* `created_at`: `DateTime(timezone=True)` (Timestamp de creación, por defecto `func.now()`).

#### B. Modelo `SocialPost`
Almacena el historial y estado de las publicaciones realizadas. Sus campos exactos son:
* `id`: `UUID` (Llave primaria, auto-generado).
* `user_id`: `UUID` (Llave foránea hacia `users.id`, obligatorio).
* `product_id`: `UUID` (Llave foránea hacia `products.id` con política `ondelete="SET NULL"`, opcional).
* `service_id`: `UUID` (Llave foránea hacia `services.id` con política `ondelete="SET NULL"`, opcional).
* `platform`: `String(20)` (Enum: `"tiktok"`, `"instagram"`, `"facebook"`, obligatorio).
* `status`: `String(20)` (Estado del post, por defecto `"pending"`, obligatorio).
* `caption`: `Text` (Texto de la publicación, opcional).
* `media_url`: `String(500)` (Ruta o URL de la imagen/video compartido, opcional).
* `platform_post_id`: `String(255)` (Identificador del post devuelto por la red social, opcional).
* `error_message`: `Text` (Detalle de error si falla la publicación, opcional).
* `published_at`: `DateTime(timezone=True)` (Fecha de publicación efectiva, opcional).
* `created_at`: `DateTime(timezone=True)` (Fecha de creación del registro, obligatorio).

### 1.3 Endpoint `/publish` y Lógica Real de Envío
En [router.py (Línea 20)](file:///Ubuntu/home/davidcalle/Projects/Servinow/Backend/app/modules/social/router.py#L20), el endpoint POST `/publish` está definido de la siguiente forma:

```python
@router.post("/publish", response_model=SocialPostResponse, status_code=status.HTTP_201_CREATED)
async def publish_content(
    post_in: SocialPostCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new social media post (will be processed in background)."""
    return await crud.create_social_post(db, current_user.id, post_in)
```

Al evaluar la función `crud.create_social_post` en [crud.py (Línea 39)](file:///Ubuntu/home/davidcalle/Projects/Servinow/Backend/app/modules/social/crud.py#L39):
```python
async def create_social_post(db: AsyncSession, user_id: str, post_in: SocialPostCreate) -> SocialPost:
    db_post = SocialPost(user_id=user_id, **post_in.model_dump())
    db.add(db_post)
    await db.commit()
    await db.refresh(db_post)
    return db_post
```

**Veredicto:** **MOCK / PERSISTENCIA PURA**. El backend únicamente guarda el registro en la tabla `social_posts` con estado `"pending"` (o el estado enviado por parámetro). No se invoca ninguna función en segundo plano, no se llama a APIs externas (Meta Graph API o TikTok Content Posting API) ni existe un servicio de colas o workers que consuma estos posts.

### 1.4 Flujo OAuth
* **¿Existe manejo de OAuth en el backend?** **NO IMPLEMENTADO**.
* No hay routers de callback, URL de autorización (auth_url) ni endpoints para intercambiar el `code` temporal de redirección por tokens de acceso de larga duración en ninguna parte del código del backend actual.

### 1.5 Manejo de Errores Parciales
**NO IMPLEMENTADO**. Al no haber lógica de publicación real y al no existir interacción con APIs de terceros, no hay mecanismos que controlen si una red falla y otra tiene éxito en una publicación simultánea.

### 1.6 Dependencias Instaladas (`requirements.txt`)
Al revisar [requirements.txt](file:///Ubuntu/home/davidcalle/Projects/Servinow/Backend/requirements.txt):
* Hay cliente HTTP genérico: `httpx>=0.27.0` (usado principalmente en testing).
* **NO EXISTEN** SDKs oficiales de Meta (como `facebook-sdk` o `facebook-business`) ni librerías de TikTok instaladas.

---

## 2. ALMACENAMIENTO DE ARCHIVOS E IMÁGENES

### 2.1 Mecanismo de Almacenamiento
* **Tipo:** **Local Filesystem** (Almacenamiento en disco local).
* En [uploads.py (Líneas 34-35)](file:///Ubuntu/home/davidcalle/Projects/Servinow/Backend/app/api/uploads.py#L34-L35), se especifica el directorio destino:
  ```python
  UPLOAD_DIR = Path("uploads/items")
  ```
* En [main.py (Línea 128)](file:///Ubuntu/home/davidcalle/Projects/Servinow/Backend/app/main.py#L128), el directorio se monta como ruta estática en FastAPI:
  ```python
  app.mount("/uploads", StaticFiles(directory="uploads", html=False), name="uploads")
  ```
* **URLs Generadas:** Son del tipo relativo `/uploads/items/{uuid}.jpg`.

### 2.2 Accesibilidad HTTP y Bloqueantes para Integración Real
* Las imágenes son accesibles localmente a través del servidor FastAPI en ejecución (ej. `http://localhost:8000/uploads/items/...`).
* **⚠️ BLOQUEANTE CRÍTICO DE PRODUCCIÓN:** Para que Meta (Facebook/Instagram) y TikTok publiquen contenido multimedia, sus servidores necesitan descargar la imagen/video desde una URL pública activa (servida con SSL/HTTPS y dominio registrado). Las URLs de desarrollo local (`localhost`, `127.0.0.1` o IPs privadas de WSL) serán rechazadas por las APIs de Graph/TikTok.

---

## 3. FRONTEND — MODAL DE PUBLICACIÓN SOCIAL

### 3.1 Componente del Modal
* **Ruta del Archivo:** [Frontend/src/components/ShareModal.jsx](file:///Ubuntu/home/davidcalle/Projects/Servinow/Frontend/src/components/ShareModal.jsx)
* **Props que recibe:**
  * `isOpen` (boolean): Controla la visibilidad en el portal.
  * `onClose` (function): Callback al cerrar el modal.
  * `item` (object): Objeto representativo de un Producto o Servicio (debe incluir `name`, `price`, `category`, `description` e `imageUrl`).
  * `onPublish` (function): Callback ejecutado después de un proceso exitoso de compartición.
* **Estado Interno:**
  * `selectedNetworks` (`Array`): Almacena las redes seleccionadas (IDs: `'facebook'`, `'instagram'`, `'tiktok'`).
  * `shareText` (`String`): Texto que será compartido (pre-poblado automáticamente).
  * `previewUrl` (`String`): Enlace temporal deObjectURL para la visualización de la imagen canvas generada.
  * `imageBlob` (`Blob`): Objeto binario de la imagen compuesta generada localmente.
  * `loadingImage` (`boolean`): Estado de carga al generar el canvas.
  * `showInstagramPanel` (`boolean`): Control de visualización del panel con instrucciones específicas de descarga de imagen para Instagram.
  * `publishing` (`boolean`): Estado de envío durante la compartición.

### 3.2 Invocación en el Proyecto
Es invocado en dos pantallas de administración del catálogo:
1. [Products.jsx](file:///Ubuntu/home/davidcalle/Projects/Servinow/Frontend/src/modules/Products/Products.jsx) (Línea 442) a través de la prop `onShare` de la tarjeta del ítem.
2. [Services.jsx](file:///Ubuntu/home/davidcalle/Projects/Servinow/Frontend/src/modules/Services/Services.jsx) (Línea 335) de manera homóloga para servicios.

### 3.3 Conexión real con `apiClient` / `socialClient`
El modal **NO** llama al backend al presionar "Publicar".
Al revisar la función `handlePublishClick` en [ShareModal.jsx (Línea 102)](file:///Ubuntu/home/davidcalle/Projects/Servinow/Frontend/src/components/ShareModal.jsx#L102):
```javascript
  const handlePublishClick = async () => {
    setPublishing(true);
    try {
      const result = await handlePublish(selectedNetworks, shareText, item, imageBlob);
      if (result?.needsInstagramInstructions) {
        setShowInstagramPanel(true);
      } else if (onPublish) {
        onPublish({ networks: selectedNetworks, text: shareText, item });
      }
    } finally {
      setPublishing(false);
    }
  };
```

La lógica de `handlePublish` se limita a:
* Si es dispositivo móvil, usa el compartir nativo del navegador (`navigator.share`).
* Si es escritorio, abre enlaces Web a los compartidores estándar de las plataformas en pestañas nuevas (ej: `https://www.facebook.com/sharer/sharer.php` y `https://www.tiktok.com/upload`).
* En ningún momento invoca a `apiClient` o `socialClient`.

### 3.4 Métodos del `socialClient` en `apiClient.js`
Definidos en [apiClient.js (Líneas 156-161)](file:///Ubuntu/home/davidcalle/Projects/Servinow/Frontend/src/utils/apiClient.js#L156-L161):
```javascript
export const socialClient = {
  listAccounts: () => apiClient.get('/social/accounts'),
  publish: (data) => apiClient.post('/social/publish', data),
  listPosts: () => apiClient.get('/social/posts'),
  deleteAccount: (platform) => apiClient.delete(`/social/accounts/${platform}`),
};
```

### 3.5 Estados de Carga, Error y Éxito en el Modal
* **Carga:** Maneja adecuadamente el estado visual `publishing` deshabilitando el botón y mostrando un loader (`Loader2`).
* **Error / Éxito:** **NO IMPLEMENTADO**. No hay bloques `catch` que intercepten errores HTTP del servidor ni se muestran notificaciones tipo Toast basadas en la respuesta del backend (dado que no hay llamada a API).

---

## 4. VARIABLES DE ENTORNO Y CONFIGURACIÓN

Al auditar `config.py` y `.env.example`:
* **Variables Meta/Facebook (App ID, Secret):** **NO ENCONTRADO** (No existen).
* **Variables TikTok (Client Key, Client Secret):** **NO ENCONTRADO** (No existen).
* **Variables OAuth Redirect URIs:** **NO ENCONTRADO** (No existen).

---

## 5. RESUMEN EJECUTIVO

| Componente | Estado real | Evidencia (archivo:línea) | Bloqueante para producción |
|---|---|---|---|
| OAuth Meta | **NO IMPLEMENTADO** (Sin credenciales ni endpoints de intercambio/callback) | [config.py:1](file:///Ubuntu/home/davidcalle/Projects/Servinow/Backend/app/core/config.py) | **Sí** |
| OAuth TikTok | **NO IMPLEMENTADO** (Sin credenciales ni endpoints de intercambio/callback) | [config.py:1](file:///Ubuntu/home/davidcalle/Projects/Servinow/Backend/app/core/config.py) | **Sí** |
| Modelo posts↔producto | **SOPORTADO** (Tablas mapeadas con FK hacia productos y servicios) | [models.py:59](file:///Ubuntu/home/davidcalle/Projects/Servinow/Backend/app/modules/social/models.py#L59) | **No** |
| Publish real vs mock | **MOCK / SOLO PERSISTENCIA** (Guarda en BD pero no procesa ni llama a APIs externas) | [crud.py:39](file:///Ubuntu/home/davidcalle/Projects/Servinow/Backend/app/modules/social/crud.py#L39) | **Sí** |
| Imágenes públicas | **LOCAL ONLY** (Guardadas localmente, inaccesibles por Meta/TikTok) | [uploads.py:34](file:///Ubuntu/home/davidcalle/Projects/Servinow/Backend/app/api/uploads.py#L34) | **Sí** |
| Frontend conectado a backend | **SIN CONECTAR** (El modal usa intents de enlaces directos o sharing nativo sin llamar a apiClient) | [ShareModal.jsx:102](file:///Ubuntu/home/davidcalle/Projects/Servinow/Frontend/src/components/ShareModal.jsx#L102) | **Sí** |
