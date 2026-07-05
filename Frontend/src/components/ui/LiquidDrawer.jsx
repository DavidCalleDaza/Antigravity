import React, { useEffect, useState } from 'react';
import { X, ChevronRight, ArrowRight } from 'lucide-react';

const LiquidDrawer = ({
  isOpen,
  onClose,
  position = 'left',
  title,
  icon: IconComponent,
  description,
  items = [],
  ctaText = 'Explorar más',
  onCtaClick,
  usePush = false,
  drawerWidth = 520
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen && !usePush) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, usePush]);

  if (!isOpen) return null;

  const positionClass = position === 'right' ? 'right' : 'left';
  const containerStyle = usePush ? {
    width: drawerWidth,
    maxWidth: '95vw',
    flexShrink: 0,
  } : {};

  return (
    <>
      {!usePush && (
        <div className={`liquid-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      )}
      <div
        className={`drawer-liquid-container ${positionClass} ${isOpen ? 'open' : ''} ${usePush ? 'push-mode' : ''}`}
        style={containerStyle}
      >
        <svg className={`drawer-liquid-svg ${positionClass}`} viewBox="0 0 520 1100" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`liquidGradient-${position}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a080c" />
              <stop offset="50%" stopColor="#1a1025" />
              <stop offset="100%" stopColor="#0a080c" />
            </linearGradient>
            <linearGradient id={`liquidShine-${position}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(62, 180, 137, 0.3)" />
              <stop offset="50%" stopColor="rgba(72, 61, 139, 0.2)" />
              <stop offset="100%" stopColor="rgba(212, 175, 55, 0.1)" />
            </linearGradient>
          </defs>
          <path
            className={`drawer-liquid-path drawer-liquid-path-${positionClass}`}
            fill={`url(#liquidGradient-${position})`}
          />
          <path
            className={`drawer-liquid-path drawer-liquid-path-${positionClass}`}
            fill={`url(#liquidShine-${position})`}
            style={{ opacity: 0.5 }}
          />
        </svg>

        <div className={`drawer-liquid-gradient ${positionClass}-gradient`} />

        <div className="drawer-liquid-orb drawer-liquid-orb-1" />
        <div className="drawer-liquid-orb drawer-liquid-orb-2" />
        <div className="drawer-liquid-orb drawer-liquid-orb-3" />

        <div className="drawer-liquid-shine" />

        <div className="drawer-liquid-content">
          <div className="drawer-liquid-header">
            <div className="drawer-liquid-title-row">
              {IconComponent && (
                <div className="drawer-liquid-icon">
                  <IconComponent />
                </div>
              )}
              <h3 className="drawer-liquid-title">{title}</h3>
            </div>
            <button className="drawer-liquid-close" onClick={onClose} aria-label="Cerrar">
              <X width="20" height="20" />
            </button>
          </div>

          <div className="drawer-liquid-body">
            {description && (
              <p className="drawer-liquid-description">{description}</p>
            )}

            {items.length > 0 && (
              <>
                <div className="drawer-liquid-section-title">Funcionalidades</div>
                <ul className="drawer-liquid-list">
                  {items.map((item, idx) => (
                    <li key={idx} className="drawer-liquid-item">
                      <div className="drawer-liquid-item-icon-minimal">
                        <ArrowRight size={14} />
                      </div>
                      <div className="drawer-liquid-item-content">
                        <span className="drawer-liquid-item-name">{item.name}</span>
                        <span className="drawer-liquid-item-detail">{item.detail}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {ctaText && (
            <div className="drawer-liquid-footer">
              <button className="drawer-liquid-footer-cta" onClick={onCtaClick || onClose}>
                {ctaText}
                <ArrowRight width="18" height="18" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LiquidDrawer;