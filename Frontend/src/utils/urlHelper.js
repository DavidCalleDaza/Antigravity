/**
 * URL and Protocol Resolver Helper
 * Centraliza y normaliza las URLs de la API REST y WebSockets para soportar
 * entornos locales, Vercel, Render y Docker sin discrepancias de rutas (/api/v1).
 */

/**
 * Normaliza la URL base de la API REST garantizando que termine con /api/v1 sin slashes extras.
 * @returns {string} URL normalizada (ej: 'https://servinow-api.onrender.com/api/v1' o 'http://localhost:8000/api/v1')
 */
export function getApiBaseUrl() {
  const envUrl = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';
  let cleanUrl = envUrl.trim().replace(/\/+$/, '');
  if (!cleanUrl.endsWith('/api/v1')) {
    cleanUrl = `${cleanUrl}/api/v1`;
  }
  return cleanUrl;
}

/**
 * Obtiene la URL del servidor raíz (sin el prefijo /api/v1).
 * Útil para resolver rutas de recursos estáticos como /uploads/...
 * @returns {string} URL raíz del servidor (ej: 'https://servinow-api.onrender.com' o 'http://localhost:8000')
 */
export function getServerBaseUrl() {
  return getApiBaseUrl().replace(/\/api\/v1$/, '');
}

/**
 * Resuelve una URL WebSocket segura (ws:// o wss://) con el prefijo /api/v1 y los parámetros requeridos.
 * @param {string} endpointPath - Ruta del socket relativa a /api/v1 (ej: '/wall/ws/wall' o '/notifications/ws/notifications')
 * @param {Record<string, string|number|boolean>} [queryParams={}] - Parámetros de consulta opcionales (ej: { token: '...' })
 * @returns {string} URL WebSocket absoluta (ej: 'wss://servinow-api.onrender.com/api/v1/wall/ws/wall')
 */
export function resolveWsUrl(endpointPath, queryParams = {}) {
  const apiBase = getApiBaseUrl();
  const wsProtocol = apiBase.startsWith('https:') ? 'wss:' : 'ws:';
  const hostAndBase = apiBase.replace(/^https?:\/\//, '');

  const cleanEndpoint = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  let finalUrl = `${wsProtocol}//${hostAndBase}${cleanEndpoint}`;

  const searchParams = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, String(val));
    }
  });

  const queryString = searchParams.toString();
  if (queryString) {
    finalUrl += `${finalUrl.includes('?') ? '&' : '?'}${queryString}`;
  }

  return finalUrl;
}
