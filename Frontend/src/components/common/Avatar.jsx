import React, { useState } from 'react';
import Helpers from '../../utils/helpers';

/**
 * Componente universal de Avatar con fallback automático a iniciales,
 * paleta de colores armónica determinista y protección contra errores 404.
 */
export default function Avatar({
  author,
  src,
  name,
  size = 40,
  className = '',
  style = {},
  onClick,
  ...props
}) {
  const [hasError, setHasError] = useState(false);

  const displayName =
    name ||
    author?.full_name ||
    author?.name ||
    (typeof author === 'string' ? author : '?');

  const rawUrl = src || author?.avatar_url || author?.avatar;
  const avatarUrl = rawUrl ? Helpers.resolveMediaUrl(rawUrl) : null;
  const initials = Helpers.getInitials(displayName) || '?';

  // Generador determinista de color de fondo según las iniciales/nombre
  const getBackgroundColor = (str) => {
    const palette = [
      '#6366f1', // Indigo
      '#8b5cf6', // Purple
      '#ec4899', // Pink
      '#f43f5e', // Rose
      '#06b6d4', // Cyan
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#3b82f6', // Blue
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  };

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    userSelect: 'none',
    fontSize: `${Math.max(10, Math.floor(size * 0.38))}px`,
    fontWeight: 600,
    backgroundColor: getBackgroundColor(displayName),
    color: '#ffffff',
    position: 'relative',
    flexShrink: 0,
    ...style,
  };

  if (avatarUrl && !hasError) {
    return (
      <div
        className={`app-avatar ${className}`}
        style={containerStyle}
        onClick={onClick}
        {...props}
      >
        <img
          src={avatarUrl}
          alt={displayName}
          onError={() => setHasError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`app-avatar app-avatar-fallback ${className}`}
      style={containerStyle}
      onClick={onClick}
      {...props}
    >
      <span>{initials}</span>
    </div>
  );
}
