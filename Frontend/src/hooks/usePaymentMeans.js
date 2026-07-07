// src/hooks/usePaymentMeans.js
// -----------------------------------------------------------------------------
// Hook que consulta al backend (FastAPI) la lista de medios de pago válidos
// para un método de pago dado. Fuente única de verdad: las reglas viven solo
// en payment_means_rules.py — el frontend no las duplica.
// -----------------------------------------------------------------------------
import { useState, useEffect, useRef } from 'react';
import { billingClient } from '../utils/apiClient';

// Catálogo local SOLO como fallback instantáneo mientras responde el backend,
// y como red de seguridad si la llamada falla (evita pantalla en blanco).
// No reemplaza la validación real: el backend manda siempre.
const FALLBACK_CATALOG = [
  { value: '10', label: '10 - Efectivo' },
  { value: '42', label: '42 - Consignación Bancaria' },
  { value: '47', label: '47 - Transferencia' },
  { value: '48', label: '48 - Tarjeta de Crédito' },
  { value: '49', label: '49 - Tarjeta de Débito' },
];

/**
 * @param {string} paymentMethod - 'Contado' | 'Crédito' | 'Transferencia' | ''
 * @returns {{ options: Array<{value:string,label:string}>, loading: boolean }}
 */
export function usePaymentMeans(paymentMethod) {
  const [options, setOptions] = useState(FALLBACK_CATALOG);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let isCurrent = true;
    const requestId = ++requestIdRef.current;

    const fetchOptions = async () => {
      setLoading(true);
      try {
        const data = await billingClient.getPaymentMeans({
          payment_method: paymentMethod || '',
        });
        // Evita condiciones de carrera si el usuario cambia el método
        // de pago rápido varias veces seguidas.
        if (isCurrent && requestId === requestIdRef.current) {
          setOptions(Array.isArray(data) && data.length ? data : FALLBACK_CATALOG);
        }
      } catch (err) {
        console.error('Error obteniendo medios de pago válidos:', err);
        if (isCurrent && requestId === requestIdRef.current) {
          setOptions(FALLBACK_CATALOG);
        }
      } finally {
        if (isCurrent && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    fetchOptions();
    return () => { isCurrent = false; };
  }, [paymentMethod]);

  return { options, loading };
}