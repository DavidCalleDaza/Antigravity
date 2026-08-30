import { useEffect, useRef, useCallback } from 'react';

const WS_RECONNECT_DELAY = 3000;
const WS_MAX_RETRIES = 5;

export function useWallSockets({ onNewPost, onNewComment, onPostUpdated, onPostDeleted, onCommentUpdated, onCommentDeleted }) {
  const wsRef = useRef(null);
  const retriesRef = useRef(0);
  const isUnmountedRef = useRef(false);

  const getWsUrl = () => {
    const apiUrl = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    return `${wsUrl}/wall/ws/wall`;
  };

  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onmessage = (event) => {
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
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onclose = () => {
      if (!isUnmountedRef.current && retriesRef.current < WS_MAX_RETRIES) {
        retriesRef.current += 1;
        setTimeout(connect, WS_RECONNECT_DELAY);
      }
    };
  }, [onNewPost, onNewComment, onPostUpdated, onPostDeleted, onCommentUpdated, onCommentDeleted]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();
    return () => {
      isUnmountedRef.current = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}
