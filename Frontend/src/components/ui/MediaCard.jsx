import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, ShoppingCart, CalendarPlus, Play, Share2 } from 'lucide-react';
import Helpers from '../../utils/helpers';
import ServinowLogo from './ServinowLogo';

const STATUS_CONFIG = {
  product: {
    active: { class: 'badge-success', label: 'Activo' },
    inactive: { class: 'badge-neutral', label: 'Inactivo' },
    out_of_stock: { class: 'badge-danger', label: 'Agotado' },
  },
  service: {
    active: { class: 'badge-success', label: 'Activo' },
    inactive: { class: 'badge-neutral', label: 'Inactivo' },
  },
};

const ACCENT_COLORS = {
  product: 'var(--gold)',
  service: 'var(--purple)',
};



export default function MediaCard({
  item,
  variant = 'product',
  canManage = false,
  onEdit,
  onDelete,
  onAction,
  onShare,
  actionLabel = 'Añadir',
  actionIcon = ShoppingCart,
}) {
  const [imageError, setImageError] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef(null);

  const isVideo = item.video_url && !item.image_url;
  const hasMedia = item.image_url || item.video_url;
  const accentColor = ACCENT_COLORS[variant];

  useEffect(() => {
    if (videoRef.current) {
      if (isHovering && isVideo) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isHovering, isVideo]);

  const handleMediaError = () => {
    setImageError(true);
  };

  const renderPlaceholder = () => (
    <div className="media-card-placeholder">
      <ServinowLogo width={64} height={64} variant="gold" />
    </div>
  );

  const renderMedia = () => {
    if (!hasMedia || imageError) {
      return renderPlaceholder();
    }

    if (isVideo) {
      return (
        <div
          className="media-card-video-wrapper"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <video
            ref={videoRef}
            src={Helpers.resolveMediaUrl(item.video_url)}
            className="media-card-video"
            onError={handleMediaError}
            muted
            loop
            playsInline
          />
          <div className={`media-card-video-overlay ${isHovering ? 'visible' : ''}`}>
            <Play width={40} height={40} fill={accentColor} color={accentColor} />
          </div>
          <span className="media-card-badge" style={{ background: accentColor }}>
            Video
          </span>
        </div>
      );
    }

    return (
      <img
        src={Helpers.resolveMediaUrl(item.image_url)}
        alt={item.name}
        className="media-card-image"
        onError={handleMediaError}
      />
    );
  };

  const statusConfig = STATUS_CONFIG[variant] || STATUS_CONFIG.product;
  const { class: statusClass, label: statusLabel } = statusConfig[item.status] || statusConfig.inactive;
  const ActionIcon = actionIcon;

  return (
    <div
      className={`media-card media-card-${variant}`}
      onMouseEnter={(e) => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const color = isLight ? '62, 180, 137' : (variant === 'product' ? '212, 175, 55' : '196, 168, 224');
        e.currentTarget.style.borderColor = `rgba(${color}, 0.4)`;
        e.currentTarget.style.boxShadow = `0 8px 32px rgba(0, 0, 0, 0.12)`;
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.background = 'rgba(28, 25, 36, 0.65)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.background = 'rgba(28, 25, 36, 0.5)';
      }}
    >
      <div className="media-card-media">{renderMedia()}</div>

      <div className="media-card-body">
        <div className="media-card-header">
          <span className="media-card-category" style={{ color: accentColor }}>
            {item.category}
          </span>
          <span className={`badge ${statusClass}`}>{statusLabel}</span>
        </div>

        <h3 className="media-card-name">{item.name}</h3>

        {item.description && (
          <p className="media-card-desc">{item.description}</p>
        )}

        {variant === 'service' && item.duration && (
          <div className="media-card-meta">
            <span className="media-card-duration">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {item.duration}
            </span>
          </div>
        )}

        <div className="media-card-footer">
          <div className="media-card-price-group">
            <div className="media-card-price" style={{ color: accentColor }}>
              {Helpers.formatCurrency(item.price)}
            </div>
            {variant === 'product' && item.stock !== undefined && (
              <div className="media-card-stock">Stock: {item.stock} uds</div>
            )}
          </div>

          <div className="media-card-actions">
            {canManage ? (
              <>
                <button
                  className="btn btn-ghost btn-sm btn-icon-only"
                  onClick={() => onEdit?.(item)}
                  title="Editar"
                >
                  <Pencil width="16" height="16" />
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-icon-only"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => onDelete?.(item)}
                  title="Eliminar"
                >
                  <Trash2 width="16" height="16" />
                </button>
                {onShare && (
                  <button
                    className="btn btn-ghost btn-sm btn-icon-only"
                    onClick={() => onShare(item)}
                    title="Compartir"
                  >
                    <Share2 width="16" height="16" />
                  </button>
                )}
              </>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onAction?.(item)}
              >
                <ActionIcon width="16" height="16" />
                {actionLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .media-card {
          background: rgba(28, 25, 36, 0.35);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-xl);
          overflow: hidden;
          transition: all var(--transition-base);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.06);
          display: flex;
          flex-direction: column;
        }

        [data-theme="light"] .media-card {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .media-card-media {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: linear-gradient(135deg, var(--sidebar-bg) 0%, var(--page-bg) 100%);
        }

        .media-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--transition-base);
        }

        .media-card:hover .media-card-image {
          transform: scale(1.05);
        }

        .media-card-video-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .media-card-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .media-card-video-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }

        .media-card-video-overlay.visible {
          opacity: 1;
        }

        .media-card-badge {
          position: absolute;
          top: var(--space-3);
          right: var(--space-3);
          color: var(--page-bg);
          font-size: var(--text-xs);
          font-weight: var(--font-semibold);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
        }

        .media-card-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .media-card-body {
          padding: var(--space-5);
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .media-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-2);
        }

        .media-card-category {
          font-size: var(--text-xs);
          font-weight: var(--font-semibold);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
        }

        .media-card-name {
          font-family: var(--font-display);
          font-size: var(--text-lg);
          font-weight: var(--font-semibold);
          color: var(--text-primary);
          margin-bottom: var(--space-2);
          line-height: var(--leading-snug);
        }

        .media-card-desc {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin-bottom: var(--space-3);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .media-card-meta {
          display: flex;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }

        .media-card-duration {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          background: var(--neutral-800);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
        }

        .media-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: var(--space-3);
          margin-top: auto;
        }

        .media-card-price-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .media-card-price {
          font-family: var(--font-display);
          font-size: var(--text-xl);
          font-weight: var(--font-bold);
          white-space: nowrap;
        }

        .media-card-stock {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }

        .media-card-actions {
          display: flex;
          gap: var(--space-2);
          flex-shrink: 0;
        }

        .badge {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-weight: var(--font-medium);
        }

        .badge-success {
          background: var(--success-50);
          color: var(--success);
        }

        .badge-neutral {
          background: var(--neutral-800);
          color: var(--text-tertiary);
        }

        .badge-danger {
          background: var(--danger-50);
          color: var(--danger);
        }
      `}</style>
    </div>
  );
}