# Configuración de Ngrok para Integración Social (V9)

Para que las redes sociales (Meta y TikTok) puedan redirigir de vuelta al backend de ServiNow y enviar webhooks, necesitamos exponer el puerto local mediante un túnel HTTPS.

## Pasos manuales requeridos en cada reinicio de túnel

1. **Inicia el túnel ngrok** en tu terminal (WSl o Windows):
   ```bash
   ngrok http 8000
   ```
2. **Copia la URL HTTPS generada** (ejemplo: `https://abcd-123.ngrok-free.app`).
3. **Actualiza las variables de entorno:**
   Ve al archivo `Backend/.env` y reemplaza el inicio de la URL en estas dos variables:
   ```env
   META_REDIRECT_URI=https://<TU-NGROK-URL>/api/v1/social/callback/meta
   TIKTOK_REDIRECT_URI=https://<TU-NGROK-URL>/api/v1/social/callback/tiktok
   ```
4. **Actualiza el panel de Meta for Developers:**
   - Entra a tu App en Meta for Developers.
   - Ve a **Facebook Login > Configuración**.
   - Añade la URL copiada en **Valid OAuth Redirect URIs**.
5. **Reinicia el servidor local** (para que tome las nuevas variables `.env`).

> **Nota:** Cada vez que detienes e inicias ngrok (en la capa gratuita), la URL cambia, por lo que deberás repetir estos pasos.
