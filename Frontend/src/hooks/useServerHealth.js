import { useState, useEffect, useRef } from 'react';
import { getApiBaseUrl } from '../utils/urlHelper';

/**
 * Hook para monitorear el estado del backend en Render.
 * Si el servidor está hibernando (spin-down / cold start) y la respuesta inicial
 * tarda más de 2.5s o falla con 502/503/timeout, activa isWakingUp para alertar
 * al usuario sin bloquear la navegación de la aplicación.
 */
export function useServerHealth() {
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [isServerReady, setIsServerReady] = useState(false);
  const pollIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const checkHealth = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2800);

    try {
      const res = await fetch(`${getApiBaseUrl()}/health`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        if (isMountedRef.current) {
          setIsServerReady(true);
          setIsWakingUp(false);
        }
        return true;
      }
    } catch {
      clearTimeout(timeoutId);
    }
    return false;
  };

  useEffect(() => {
    isMountedRef.current = true;

    const initialProbe = async () => {
      const ready = await checkHealth();
      if (!ready && isMountedRef.current) {
        setIsWakingUp(true);

        // Sondeo cada 4 segundos hasta que el servidor despierte
        pollIntervalRef.current = setInterval(async () => {
          const isOk = await checkHealth();
          if (isOk && isMountedRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }, 4000);
      }
    };

    initialProbe();

    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  return { isWakingUp, isServerReady, checkHealth };
}
