import React from 'react';
import { Cloud, Loader2 } from 'lucide-react';
import { useServerHealth } from '../../hooks/useServerHealth';

export default function ServerHealthBanner() {
  const { isWakingUp } = useServerHealth();

  if (!isWakingUp) return null;

  return (
    <aside
      aria-label="Estado del servidor"
      className="server-health-banner"
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 18px',
        borderRadius: '9999px',
        backgroundColor: 'rgba(23, 23, 23, 0.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: '#f3f4f6',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        fontSize: '0.84rem',
        fontWeight: 500,
        maxWidth: '92vw',
        pointerEvents: 'none',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <Loader2
        size={16}
        style={{
          animation: 'spin 1s linear infinite',
          color: '#fbbf24',
          flexShrink: 0,
        }}
      />
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        Conectando con el servidor en la nube (Render)... Sincronizando datos
      </span>
      <Cloud size={15} style={{ color: '#9ca3af', flexShrink: 0 }} />
    </aside>
  );
}
