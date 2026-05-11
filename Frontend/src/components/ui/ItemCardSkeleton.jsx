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
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          overflow: hidden;
        }

        .card-skeleton-media {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: var(--sidebar-bg);
        }

        .skeleton-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.03) 50%,
            transparent 100%
          );
          animation: shimmer 1.5s infinite;
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
          background: var(--neutral-800);
          border-radius: var(--radius-sm);
          position: relative;
          overflow: hidden;
        }

        .skeleton-line::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.05) 50%,
            transparent 100%
          );
          animation: shimmer 1.5s infinite;
        }

        .skeleton-category { width: 60px; }
        .skeleton-badge { width: 50px; height: 18px; }
        .skeleton-title { width: 80%; height: 18px; margin-bottom: var(--space-3); }
        .skeleton-desc { width: 100%; margin-bottom: var(--space-2); }
        .skeleton-desc.short { width: 70%; margin-bottom: var(--space-4); }
        .skeleton-price { width: 80px; height: 24px; margin-bottom: var(--space-1); }
        .skeleton-stock { width: 60px; }
        .skeleton-actions { width: 60px; height: 32px; border-radius: var(--radius-md); }

        .card-skeleton-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
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