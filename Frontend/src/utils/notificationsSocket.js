import { useStore } from '../store/useStore';
import { SERVER_BASE_URL } from './apiClient';

let socket = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export const connectNotifications = () => {
  if (socket && socket.readyState === WebSocket.OPEN) return;
  
  const token = useStore.getState().currentUser?.token;
  if (!token) return;

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Use host from SERVER_BASE_URL if available, else window.location.host
  let wsHost = window.location.host;
  if (SERVER_BASE_URL) {
      try {
          const url = new URL(SERVER_BASE_URL);
          wsHost = url.host;
      } catch (e) { }
  }
  
  const wsUrl = `${wsProtocol}//${wsHost}/api/v1/notifications/ws/notifications?token=${encodeURIComponent(token)}`;
  
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('Notifications WebSocket connected');
    reconnectAttempts = 0;
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      useStore.getState().addNotification(data);
    } catch (err) {
      console.error('Error parsing notification data', err);
    }
  };

  socket.onclose = (event) => {
    console.log('Notifications WebSocket disconnected', event);
    if (event.code !== 1008 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const backoff = Math.min(1000 * reconnectAttempts, 5000);
      reconnectTimer = setTimeout(() => {
        connectNotifications();
      }, backoff);
    }
  };

  socket.onerror = (error) => {
    console.error('Notifications WebSocket error', error);
  };
};

export const disconnectNotifications = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
};
