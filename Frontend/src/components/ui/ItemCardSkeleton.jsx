import React from 'react';

export function ItemCardSkeleton({ variant = 'product' }) {
  return (
    <div className={`card-skeleton card-skeleton-${variant}`}>
      <div className="card-skeleton-media">
        <div className="skeleton-shimmer" />
      </div>
      <div className="card-skeleton-body">
        <div className="card-skeleton-header">
          <div className="skeleton-line skeleton-category" />
          <div className="skeleton-line skeleton-badge" />
        </div>
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line skeleton-desc" />
        <div className="skeleton-line skeleton-desc short" />
        <div className="card-skeleton-footer">
          <div>
            <div className="skeleton-line skeleton-price" />
            <div className="skeleton-line skeleton-stock" />
          </div>
          <div className="skeleton-line skeleton-actions" />
        </div>
      </div>

      <style>{`
        .card-skeleton {
          background: var(--surface-overlay);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(212, 175, 55, 0.1);
          border-radius: var(--radius-xl);
          overflow: hidden;
          position: relative;
        }

        [data-theme="light"] .card-skeleton {
          background: rgba(250, 248, 252, 0.9);
          border-color: rgba(0, 0, 0, 0.05);
        }

        .card-skeleton-media {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.2);
        }

        [data-theme="light"] .card-skeleton-media {
          background: rgba(0, 0, 0, 0.05);
        }

        .skeleton-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(212, 175, 55, 0.15) 50%,
            transparent 100%
          );
          animation: shimmer 1.5s infinite linear;
        }

        [data-theme="light"] .skeleton-shimmer {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(0, 0, 0, 0.08) 50%,
            transparent 100%
          );
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .card-skeleton-body {
          padding: var(--space-5);
        }

        .card-skeleton-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-3);
        }

        .skeleton-line {
          height: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-sm);
          position: relative;
          overflow: hidden;
        }

        [data-theme="light"] .skeleton-line {
          background: rgba(0, 0, 0, 0.05);
        }

        .skeleton-line::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(212, 175, 55, 0.15) 50%,
            transparent 100%
          );
          animation: shimmer 1.5s infinite linear;
        }

        [data-theme="light"] .skeleton-line::after {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(0, 0, 0, 0.08) 50%,
            transparent 100%
          );
        }

        .skeleton-category { width: 60px; height: 10px; }
        .skeleton-badge { width: 50px; height: 18px; border-radius: var(--radius-full); }
        .skeleton-title { width: 80%; height: 20px; margin-bottom: var(--space-3); }
        .skeleton-desc { width: 100%; margin-bottom: var(--space-2); }
        .skeleton-desc.short { width: 70%; margin-bottom: var(--space-4); }
        .skeleton-price { width: 80px; height: 24px; margin-bottom: var(--space-2); }
        .skeleton-stock { width: 60px; height: 10px; }
        .skeleton-actions { width: 70px; height: 32px; border-radius: var(--radius-lg); }

        .card-skeleton-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: var(--space-4);
        }
      `}</style>
    </div>
  );
}

export function MediaCardSkeleton({ count = 6 }) {
  return (
    <div className="media-card-skeletons">
      {Array.from({ length: count }, (_, i) => (
        <ItemCardSkeleton key={i} />
      ))}
      <style>{`
        .media-card-skeletons {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-6);
        }
      `}</style>
    </div>
  );
}