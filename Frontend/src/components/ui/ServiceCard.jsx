import React, { useState } from 'react';
import { Pencil, Trash2, CalendarPlus, Clock, Play } from 'lucide-react';
import Helpers from '../../utils/helpers';

export default function ServiceCard({
  service,
  canManage = false,
  canBook = false,
  onEdit,
  onDelete,
  onBook,
}) {
  const [imageError, setImageError] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);

  const hasMedia = service.image_url || service.video_url;
  const isVideo = service.video_url && !service.image_url;

  const handleMediaError = () => {
    setImageError(true);
  };

  return (
    <div className="service-card">
      <div className="service-card-media">
        {hasMedia && !imageError ? (
          <>
            {isVideo ? (
              <div
                className="service-card-video-wrapper"
                onMouseEnter={() => setShowVideoPreview(true)}
                onMouseLeave={() => setShowVideoPreview(false)}
              >
                <video
                  src={Helpers.resolveMediaUrl(service.video_url)}
                  className="service-card-video"
                  onError={handleMediaError}
                  muted
                  playsInline
                />
                <div className={`service-card-video-overlay ${showVideoPreview ? 'visible' : ''}`}>
                  <Play width={48} height={48} fill="var(--purple)" color="var(--purple)" />
                </div>
                <span className="service-card-badge-video">Video</span>
              </div>
            ) : (
              <img
                src={Helpers.resolveMediaUrl(service.image_url)}
                alt={service.name}
                className="service-card-image"
                onError={handleMediaError}
              />
            )}
          </>
        ) : (
          <div className="service-card-placeholder">
            <WrenchIcon />
          </div>
        )}
      </div>

      <div className="service-card-body">
        <div className="service-card-header">
          <span className="service-card-category">{service.category}</span>
          <StatusBadge status={service.status} />
        </div>

        <h3 className="service-card-name">{service.name}</h3>

        {service.description && (
          <p className="service-card-desc">{service.description}</p>
        )}

        <div className="service-card-meta">
          {service.duration && (
            <span className="service-card-duration">
              <Clock width={14} height={14} />
              {service.duration}
            </span>
          )}
        </div>

        <div className="service-card-footer">
          <div className="service-card-price-group">
            <div className="service-card-price">{Helpers.formatCurrency(service.price)}</div>
          </div>

          <div className="service-card-actions">
            {canManage ? (
              <>
                <button
                  className="btn btn-ghost btn-sm btn-icon-only"
                  onClick={() => onEdit?.(service)}
                  title="Editar"
                >
                  <Pencil width="16" height="16" />
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-icon-only"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => onDelete?.(service)}
                  title="Eliminar"
                >
                  <Trash2 width="16" height="16" />
                </button>
              </>
            ) : canBook ? (
              <button className="btn btn-primary btn-sm" onClick={() => onBook?.(service)}>
                <CalendarPlus width="16" height="16" />
                Agendar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <style>{`
.service-card {
          background: rgba(28, 25, 36, 0.35);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-xl);
          overflow: hidden;
          transition: all var(--transition-base);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.06);
        }

        .service-card:hover {
          box-shadow: var(--shadow-lg), 0 0 30px rgba(196, 168, 224, 0.12);
          transform: translateY(-4px);
          border-color: rgba(196, 168, 224, 0.35);
          background: rgba(28, 25, 36, 0.45);
        }

        [data-theme="light"] .service-card {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        [data-theme="light"] .service-card:hover {
          background: rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
        }

        .service-card:hover {
          box-shadow: var(--shadow-lg), 0 0 30px rgba(196, 168, 224, 0.15);
          transform: translateY(-4px);
          border-color: rgba(196, 168, 224, 0.4);
          background: rgba(28, 25, 36, 0.65);
        }

        [data-theme="light"] .service-card {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
        }

        [data-theme="light"] .service-card:hover {
          background: rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        .service-card-media {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(196, 168, 224, 0.15) 0%, var(--page-bg) 100%);
        }

        .service-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--transition-base);
        }

        .service-card:hover .service-card-image {
          transform: scale(1.05);
        }

        .service-card-video-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .service-card-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .service-card-video-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }

        .service-card-video-overlay.visible {
          opacity: 1;
        }

        .service-card-badge-video {
          position: absolute;
          top: var(--space-3);
          right: var(--space-3);
          background: var(--purple);
          color: var(--page-bg);
          font-size: var(--text-xs);
          font-weight: var(--font-semibold);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
        }

        .service-card-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--purple);
          opacity: 0.4;
        }

        .service-card-body {
          padding: var(--space-5);
        }

        .service-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-2);
        }

        .service-card-category {
          font-size: var(--text-xs);
          color: var(--purple);
          font-weight: var(--font-semibold);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
        }

        .service-card-name {
          font-family: var(--font-display);
          font-size: var(--text-lg);
          font-weight: var(--font-semibold);
          color: var(--text-primary);
          margin-bottom: var(--space-2);
          line-height: var(--leading-snug);
        }

        .service-card-desc {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin-bottom: var(--space-3);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .service-card-meta {
          display: flex;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }

        .service-card-duration {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          background: var(--neutral-800);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
        }

        .service-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: var(--space-4);
        }

        .service-card-price-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .service-card-price {
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: var(--font-bold);
          color: var(--gold);
        }

        .service-card-actions {
          display: flex;
          gap: var(--space-2);
        }
      `}</style>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    active: { class: 'badge-success', label: 'Activo' },
    inactive: { class: 'badge-neutral', label: 'Inactivo' },
  };
  const { class: cls, label } = config[status] || config.inactive;
  return <span className={`badge ${cls}`}>{label}</span>;
}

function WrenchIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}