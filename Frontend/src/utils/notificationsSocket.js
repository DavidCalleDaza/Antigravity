import { useStore } from '../store/useStore';
import { resolveWsUrl } from './urlHelper';

let socket = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1500;
const MAX_RECONNECT_DELAY = 30000;

function calculateBackoff(attempt) {
  const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(1.8, attempt), MAX_RECONNECT_DELAY);
  const jitter = delay * 0.2 * Math.random();
  return Math.floor(delay + jitter);
}

export const connectNotifications = () => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const token = useStore.getState().currentUser?.token;
  if (!token) return;

  const wsUrl = resolveWsUrl('/notifications/ws/notifications', { token });
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined' || !wsUrl || !wsUrl.startsWith('ws')) {
    return;
  }

  try {
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      reconnectAttempts = 0;
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        useStore.getState().addNotification(data);
      } catch {
        // Ignorar payload malformado
      }
    };

    socket.onclose = (event) => {
      // 1008 = Policy Violation (ej. token expirado o inválido)
      if (event.code !== 1008 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = calculateBackoff(reconnectAttempts);
        reconnectAttempts++;
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          connectNotifications();
        }, delay);
      }
    };

    socket.onerror = () => {
      // Dejar que onclose maneje el reintento de conexión
    };
  } catch {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = calculateBackoff(reconnectAttempts);
      reconnectAttempts++;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        connectNotifications();
      }, delay);
    }
  }
};

export const disconnectNotifications = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    try {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    } catch {
      // Ignorar errores de cierre
    }
    socket = null;
  }
};
