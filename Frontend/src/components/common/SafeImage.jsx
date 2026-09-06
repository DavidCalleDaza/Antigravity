import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

/**
 * Componente de imagen seguro que previene errores visuales 404,
 * gestiona estados de carga y proporciona un fallback limpio y consistente.
 */
export default function SafeImage({
  src,
  alt = '',
  className = '',
  fallback,
  placeholderText = 'Imagen no disponible',
  style = {},
  ...props
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (!src || hasError) {
    if (fallback) return fallback;
    return (
      <div
        className={`safe-image-placeholder ${className}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--surface-sunken, #f3f4f6)',
          color: 'var(--text-tertiary, #9ca3af)',
          minHeight: '100px',
          width: '100%',
          borderRadius: '8px',
          padding: '1rem',
          boxSizing: 'border-box',
          ...style,
        }}
      >
        <ImageOff size={22} style={{ opacity: 0.6 }} />
        <span style={{ fontSize: '0.75rem', marginTop: '6px', opacity: 0.8 }}>
          {placeholderText}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{
        ...style,
        transition: 'opacity 0.25s ease-in-out',
        opacity: isLoaded ? 1 : 0.4,
      }}
      onLoad={() => setIsLoaded(true)}
      onError={() => setHasError(true)}
      loading="lazy"
      {...props}
    />
  );
}
