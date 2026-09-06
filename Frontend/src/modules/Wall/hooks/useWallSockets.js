import { useEffect, useRef, useState, useCallback } from 'react';
import { resolveWsUrl } from '../../../utils/urlHelper';

const WS_BASE_DELAY = 1500;
const WS_MAX_DELAY = 30000;
const WS_MAX_RETRIES = 10;

/**
 * Hook para gestionar la conexión WebSocket del Muro con reintentos exponenciales,
 * jitter anti-colisiones, detección de estados y resolución dinámica de URL.
 */
export function useWallSockets({
  onNewPost,
  onNewComment,
  onPostUpdated,
  onPostDeleted,
  onCommentUpdated,
  onCommentDeleted,
}) {
  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED'); // 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED'
  const wsRef = useRef(null);
  const retriesRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const isUnmountedRef = useRef(false);

  const calculateBackoff = (attempt) => {
    // Exponential backoff con Jitter aleatorio
    const delay = Math.min(WS_BASE_DELAY * Math.pow(1.8, attempt), WS_MAX_DELAY);
    const jitter = delay * 0.2 * Math.random();
    return Math.floor(delay + jitter);
  };

  const cleanupSocket = () => {
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      try {
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
        }
      } catch {
        // Ignorar errores de cierre
      }
      wsRef.current = null;
    }
  };

  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;
    cleanupSocket();

    const targetUrl = resolveWsUrl('/wall/ws/wall');
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined' || !targetUrl || !targetUrl.startsWith('ws')) {
      return;
    }

    setConnectionStatus(retriesRef.current === 0 ? 'CONNECTING' : 'RECONNECTING');

    try {
      const ws = new WebSocket(targetUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current) return;
        retriesRef.current = 0;
        setConnectionStatus('CONNECTED');
      };

      ws.onmessage = (event) => {
        if (isUnmountedRef.current) return;
        try {
          const message = JSON.parse(event.data);
          if (message.event === 'new_post' && onNewPost) {
            onNewPost(message.data);
          } else if (message.event === 'post_updated' && onPostUpdated) {
            onPostUpdated(message.data);
          } else if (message.event === 'post_deleted' && onPostDeleted) {
            onPostDeleted(message.data);
          } else if (message.event === 'new_comment' && onNewComment) {
            onNewComment(message.data);
          } else if (message.event === 'comment_updated' && onCommentUpdated) {
            onCommentUpdated(message.data);
          } else if (message.event === 'comment_deleted' && onCommentDeleted) {
            onCommentDeleted(message.data);
          }
        } catch {
          // Ignorar mensajes malformados
        }
      };

      ws.onerror = () => {
        // No forzar ws.close() síncronamente aquí; permitir que el evento onclose del navegador gestione la reconexión limpia
      };

      ws.onclose = () => {
        if (isUnmountedRef.current) return;
        setConnectionStatus('DISCONNECTED');

        if (retriesRef.current < WS_MAX_RETRIES) {
          const delay = calculateBackoff(retriesRef.current);
          retriesRef.current += 1;
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };
    } catch {
      if (!isUnmountedRef.current && retriesRef.current < WS_MAX_RETRIES) {
        const delay = calculateBackoff(retriesRef.current);
        retriesRef.current += 1;
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    }
  }, [onNewPost, onNewComment, onPostUpdated, onPostDeleted, onCommentUpdated, onCommentDeleted]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    return () => {
      isUnmountedRef.current = true;
      clearTimeout(reconnectTimeoutRef.current);
      cleanupSocket();
    };
  }, [connect]);

  return { connectionStatus };
}
