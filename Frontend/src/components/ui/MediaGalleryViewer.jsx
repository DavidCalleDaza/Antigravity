import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Helpers from '../../utils/helpers';

/**
 * MediaGalleryViewer Component
 * 
 * Componente de visualización de galería de imágenes para tarjetas en grillas (MediaCard).
 * - 0 o 1 imagen: renderiza una <img> limpia sin controles adicionales.
 * - 2+ imágenes: muestra un carrusel navegable con flechas, indicador de puntos (dots) y soporte táctil swipe.
 */
export default function MediaGalleryViewer({
  images = [],
  alt = 'Imagen',
  accentColor = 'var(--gold)',
  onError,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);

  const resolvedImages = (images || []).map((img) => Helpers.resolveMediaUrl(img));

  // Si no hay imágenes o solo hay 1, mantener renderizado plano identico al original
  if (resolvedImages.length <= 1) {
    return (
      <img
        src={resolvedImages[0] || ''}
        alt={alt}
        className="media-card-image"
        onError={onError}
      />
    );
  }

  const activeIndex = Math.min(currentIndex, resolvedImages.length - 1);

  const handlePrev = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : resolvedImages.length - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev < resolvedImages.length - 1 ? prev + 1 : 0));
  };

  const handleDotClick = (e, index) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex(index);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext(e);
      } else {
        handlePrev(e);
      }
    }
  };

  return (
    <div
      className="media-gallery-viewer"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={resolvedImages[activeIndex]}
        alt={`${alt} - ${activeIndex + 1}`}
        className="media-gallery-viewer-img"
        onError={activeIndex === 0 ? onError : undefined}
      />

      {/* Flecha Anterior */}
      <button
        type="button"
        className="media-gallery-nav media-gallery-nav--prev"
        onClick={handlePrev}
        title="Imagen anterior"
        aria-label="Imagen anterior"
      >
        <ChevronLeft width={18} height={18} />
      </button>

      {/* Flecha Siguiente */}
      <button
        type="button"
        className="media-gallery-nav media-gallery-nav--next"
        onClick={handleNext}
        title="Imagen siguiente"
        aria-label="Imagen siguiente"
      >
        <ChevronRight width={18} height={18} />
      </button>

      {/* Indicadores de posición (Dots) */}
      <div className="media-gallery-dots">
        {resolvedImages.map((_, idx) => (
          <button
            key={idx}
            type="button"
            className={`media-gallery-dot ${idx === activeIndex ? 'is-active' : ''}`}
            onClick={(e) => handleDotClick(e, idx)}
            aria-label={`Ver imagen ${idx + 1}`}
            style={{
              backgroundColor: idx === activeIndex ? accentColor : 'rgba(255, 255, 255, 0.45)',
            }}
          />
        ))}
      </div>

      <style>{`
        .media-gallery-viewer {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: linear-gradient(135deg, var(--sidebar-bg) 0%, var(--page-bg) 100%);
        }

        .media-gallery-viewer-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: opacity var(--transition-fast);
        }

        .media-gallery-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 30px;
          height: 30px;
          border-radius: var(--radius-full);
          background: rgba(18, 16, 26, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity var(--transition-fast), background var(--transition-fast), transform var(--transition-fast);
          z-index: 5;
        }

        .media-gallery-viewer:hover .media-gallery-nav {
          opacity: 1;
        }

        [data-theme="light"] .media-gallery-nav {
          color: var(--mint-green);
          background: rgba(255, 255, 255, 0.85);
          border-color: rgba(62, 180, 137, 0.3);
        }

        .media-gallery-nav:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: translateY(-50%) scale(1.08);
        }

        .media-gallery-nav--prev {
          left: 8px;
        }

        .media-gallery-nav--next {
          right: 8px;
        }

        .media-gallery-dots {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 5;
          padding: 4px 8px;
          border-radius: var(--radius-full);
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(4px);
        }

        .media-gallery-dot {
          width: 6px;
          height: 6px;
          border-radius: var(--radius-full);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .media-gallery-dot.is-active {
          width: 16px;
          border-radius: 4px;
        }

        @media (hover: none) {
          .media-gallery-nav {
            opacity: 0.85;
          }
        }
      `}</style>
    </div>
  );
}
