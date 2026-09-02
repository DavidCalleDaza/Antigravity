import React, { useState } from 'react';
import { Eye, Pencil, Trash2, ShoppingCart, Play } from 'lucide-react';
import Helpers from '../../utils/helpers';

export default function ProductCard({
  product,
  canManage = false,
  canBuy = false,
  onView,
  onEdit,
  onDelete,
  onAddToCart,
}) {
  const [imageError, setImageError] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);

  const hasMedia = product.image_url || product.video_url;
  const isVideo = product.video_url && !product.image_url;

  const handleMediaError = () => {
    setImageError(true);
  };

  return (
    <div className="product-card">
      <div className="product-card-media">
        {hasMedia && !imageError ? (
          <>
            {isVideo ? (
              <div
                className="product-card-video-wrapper"
                onMouseEnter={() => setShowVideoPreview(true)}
                onMouseLeave={() => setShowVideoPreview(false)}
              >
                <video
                  src={Helpers.resolveMediaUrl(product.video_url)}
                  className="product-card-video"
                  onError={handleMediaError}
                  muted
                  playsInline
                />
                <div className={`product-card-video-overlay ${showVideoPreview ? 'visible' : ''}`}>
                  <Play width={48} height={48} fill="var(--gold)" color="var(--gold)" />
                </div>
                <span className="product-card-badge-video">Video</span>
              </div>
            ) : (
              <img
                src={Helpers.resolveMediaUrl(product.image_url)}
                alt={product.name}
                className="product-card-image"
                onError={handleMediaError}
              />
            )}
          </>
        ) : (
          <div className="product-card-placeholder">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
        )}
      </div>

      <div className="product-card-body">
        <div className="product-card-header">
          <span className="product-card-category">{product.category}</span>
          <StatusBadge status={product.status} />
        </div>

        <h3 className="product-card-name">{product.name}</h3>

        {product.description && (
          <p className="product-card-desc">{product.description}</p>
        )}

        <div className="product-card-footer">
          <div className="product-card-price-group">
            <div className="product-card-price">{Helpers.formatCurrency(product.price)}</div>
            {product.stock !== undefined && (
              <div className="product-card-stock">Stock: {product.stock} uds</div>
            )}
          </div>

          <div className="product-card-actions">
            {canManage ? (
              <>
                <button
                  className="btn btn-ghost btn-sm btn-icon-only"
                  onClick={() => onView?.(product)}
                  title="Ver detalle"
                >
                  <Eye width="16" height="16" />
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-icon-only"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => onDelete?.(product)}
                  title="Eliminar"
                >
                  <Trash2 width="16" height="16" />
                </button>
              </>
            ) : canBuy ? (
              <button className="btn btn-primary btn-sm" onClick={() => onAddToCart?.(product)}>
                <ShoppingCart width="16" height="16" />
                Añadir
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <style>{`
        .product-card {
          background: rgba(28, 25, 36, 0.35);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-xl);
          overflow: hidden;
          transition: all var(--transition-base);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.06);
        }

        .product-card:hover {
          box-shadow: var(--shadow-lg), 0 0 30px rgba(212, 175, 55, 0.12);
          transform: translateY(-4px);
          border-color: rgba(212, 175, 55, 0.35);
          background: rgba(28, 25, 36, 0.45);
        }

        [data-theme="light"] .product-card {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        [data-theme="light"] .product-card:hover {
          background: rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
        }

        .product-card-media {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: linear-gradient(135deg, var(--sidebar-bg) 0%, var(--page-bg) 100%);
        }

        .product-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--transition-base);
        }

        .product-card:hover .product-card-image {
          transform: scale(1.05);
        }

        .product-card-video-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .product-card-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-card-video-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }

        .product-card-video-overlay.visible {
          opacity: 1;
        }

        .product-card-badge-video {
          position: absolute;
          top: var(--space-3);
          right: var(--space-3);
          background: var(--gold);
          color: var(--page-bg);
          font-size: var(--text-xs);
          font-weight: var(--font-semibold);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
        }

        .product-card-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gold);
          opacity: 0.3;
        }

        .product-card-body {
          padding: var(--space-5);
        }

        .product-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-2);
        }

        .product-card-category {
          font-size: var(--text-xs);
          color: var(--gold);
          font-weight: var(--font-semibold);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
        }

        .product-card-name {
          font-family: var(--font-display);
          font-size: var(--text-lg);
          font-weight: var(--font-semibold);
          color: var(--text-primary);
          margin-bottom: var(--space-2);
          line-height: var(--leading-snug);
        }

        .product-card-desc {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin-bottom: var(--space-4);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: var(--space-4);
        }

        .product-card-price-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .product-card-price {
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: var(--font-bold);
          color: var(--gold);
        }

        .product-card-stock {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }

        .product-card-actions {
          display: flex;
          gap: var(--space-2);
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

function StatusBadge({ status }) {
  const config = {
    active: { class: 'badge-success', label: 'Activo' },
    inactive: { class: 'badge-neutral', label: 'Inactivo' },
    out_of_stock: { class: 'badge-danger', label: 'Agotado' },
  };
  const { class: cls, label } = config[status] || config.inactive;
  return <span className={`badge ${cls}`}>{label}</span>;
}