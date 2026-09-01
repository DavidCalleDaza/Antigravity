import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Mic, Video } from 'lucide-react';
import Helpers from '../../utils/helpers';

/**
 * MediaCarousel Component
 * 
 * Justificación de diseño: Se utiliza un track horizontal de fila única con overflow-x auto,
 * scroll-snap y altura fija (aspect-ratio 16/9 en miniaturas). Esto evita que la grilla crezca
 * verticalmente dentro del panel lateral (Drawer, ~380-420px), manteniendo una altura constante
 * y permitiendo una navegación fluida por botones o scroll/touch.
 */
export default function MediaCarousel({
  label = 'Imágenes adicionales',
  kind = 'image', // 'image' | 'audio' | 'video'
  accept = 'image/*',
  existingUrls = [],
  primaryUrl = '',
  newImages = [],
  items: customItems = null,
  onRemoveExisting,
  onRemoveNew,
  onAddFile,
  onItemClick,
  multiple = false,
}) {
  const fileInputRef = useRef(null);
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Normalización de items (soporta tanto URLs guardadas como archivos nuevos en blob:)
  const items = customItems || [
    ...(existingUrls || [])
      .filter((url) => url && url !== primaryUrl)
      .map((url, idx) => ({
        id: `existing-${url}-${idx}`,
        url: Helpers.resolveMediaUrl(url),
        isNew: false,
        rawUrl: url,
        onRemove: () => onRemoveExisting && onRemoveExisting(url),
      })),
    ...(newImages || []).map((img, idx) => ({
      id: `new-${img.previewUrl || idx}`,
      url: img.previewUrl,
      isNew: true,
      newIndex: idx,
      onRemove: () => onRemoveNew && onRemoveNew(idx),
    })),
  ];

  // Actualización de estado de scroll e índice activo
  const updateScrollState = () => {
    if (!trackRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);

    if (items.length > 0 && clientWidth > 0) {
      // Estimar item index basado en la posición de scroll
      const itemWidth = 120 + 8; // min-width 120px + gap 8px
      const idx = Math.min(
        Math.max(0, Math.round(scrollLeft / itemWidth)),
        items.length - 1
      );
      setActiveIndex(idx);
    } else {
      setActiveIndex(0);
    }
  };

  useEffect(() => {
    updateScrollState();
    const track = trackRef.current;
    if (track) {
      track.addEventListener('scroll', updateScrollState, { passive: true });
      window.addEventListener('resize', updateScrollState);
    }
    return () => {
      if (track) track.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [items.length]);

  const scrollLeft = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: -140, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: 140, behavior: 'smooth' });
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (onAddFile) {
      files.forEach((file) => onAddFile(file));
    }
    e.target.value = '';
    // Scroll automático al final al agregar una imagen
    setTimeout(() => {
      if (trackRef.current) {
        trackRef.current.scrollTo({
          left: trackRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }
    }, 100);
  };

  return (
    <div className="media-carousel">
      {/* Encabezado con etiqueta, contador de posición e indicador total */}
      <div className="media-carousel-header">
        <label className="form-label media-carousel-label">{label}</label>
        <div className="media-carousel-header-meta">
          {items.length > 0 && (
            <span className="media-carousel-position-badge">
              {activeIndex + 1} / {items.length}
            </span>
          )}
          <span className="media-carousel-count">
            {items.length > 0
              ? `${items.length} adicional${items.length === 1 ? '' : 'es'}`
              : 'Opcional'}
          </span>
        </div>
      </div>

      {/* Contenedor del Carrusel */}
      <div className="media-carousel-wrapper">
        {canScrollLeft && (
          <button
            type="button"
            className="media-carousel-nav media-carousel-nav--prev"
            onClick={scrollLeft}
            title="Anterior"
            aria-label="Imagen anterior"
          >
            <ChevronLeft width={16} height={16} />
          </button>
        )}

        <div className="media-carousel-track" ref={trackRef}>
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className={`media-carousel-item ${kind !== 'image' ? 'media-carousel-item--file' : ''} ${idx === activeIndex ? 'is-active' : ''} ${onItemClick ? 'media-carousel-item--clickable' : ''}`}
              draggable={kind === 'image'}
              onDragStart={kind === 'image' ? (e) => {
                e.dataTransfer.effectAllowed = 'move';
                const payload = item.isNew
                  ? { kind: 'new', index: item.newIndex }
                  : { kind: 'existing', url: item.rawUrl || item.url };
                e.dataTransfer.setData('application/json', JSON.stringify(payload));
              } : undefined}
              onClick={onItemClick ? () => onItemClick(item) : undefined}
            >
              {kind === 'image' ? (
                <img
                  src={item.url}
                  alt={`Adicional ${idx + 1}`}
                  className="media-carousel-img"
                />
              ) : (
                <div className="media-carousel-file">
                  {kind === 'audio' ? <Mic width={20} height={20} /> : <Video width={20} height={20} />}
                  <span className="media-carousel-file-name">{item.name}</span>
                </div>
              )}
              {item.onRemove && (
                <button
                  type="button"
                  className="media-carousel-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onRemove();
                  }}
                  title="Quitar"
                  aria-label="Quitar"
                >
                  <X width={12} height={12} />
                </button>
              )}
            </div>
          ))}

          {/* Botón para agregar una nueva imagen */}
          <button
            type="button"
            className="media-carousel-add-tile"
            onClick={() => fileInputRef.current?.click()}
            title="Agregar imagen adicional"
          >
            <Plus width={18} height={18} />
            <span className="media-carousel-add-text">Agregar</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept={accept}
            multiple={multiple}
            className="media-carousel-file-input"
            onChange={handleFileChange}
          />
        </div>

        {canScrollRight && (
          <button
            type="button"
            className="media-carousel-nav media-carousel-nav--next"
            onClick={scrollRight}
            title="Siguiente"
            aria-label="Imagen siguiente"
          >
            <ChevronRight width={16} height={16} />
          </button>
        )}
      </div>

      <style>{`
        .media-carousel {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          width: 100%;
          box-sizing: border-box;
        }

        .media-carousel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
        }

        .media-carousel-label {
          margin-bottom: 0 !important;
        }

        .media-carousel-header-meta {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .media-carousel-position-badge {
          font-size: var(--text-xs);
          font-weight: var(--font-medium);
          color: var(--gold);
          background: var(--gold-soft);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          letter-spacing: 0.02em;
        }

        .media-carousel-count {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }

        .media-carousel-wrapper {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
        }

        .media-carousel-track {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          overflow-x: auto;
          scroll-behavior: smooth;
          scroll-snap-type: x mandatory;
          padding: var(--space-1) 2px;
          width: 100%;
          max-height: 84px;
          scrollbar-width: thin;
          scrollbar-color: var(--border-color) transparent;
        }

        .media-carousel-track::-webkit-scrollbar {
          height: 4px;
        }

        .media-carousel-track::-webkit-scrollbar-track {
          background: transparent;
        }

        .media-carousel-track::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: var(--radius-full);
        }

        .media-carousel-item {
          position: relative;
          flex: 0 0 116px;
          height: 68px;
          aspect-ratio: 16 / 9;
          scroll-snap-align: start;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--border-color);
          background: var(--neutral-900);
          cursor: grab;
          transition: border-color var(--transition-fast), transform var(--transition-fast);
        }

        .media-carousel-item:active {
          cursor: grabbing;
        }

        .media-carousel-item:hover,
        .media-carousel-item.is-active {
          border-color: var(--gold);
        }

        .media-carousel-item--clickable {
          cursor: pointer;
        }

        .media-carousel-item--clickable:hover {
          box-shadow: 0 0 0 2px var(--gold-soft);
        }

        .media-carousel-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .media-carousel-item--file {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px;
          color: var(--text-secondary);
          cursor: default;
        }

        .media-carousel-file {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          width: 100%;
        }

        .media-carousel-file-name {
          font-size: 10px;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: center;
        }

        .media-carousel-remove {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 22px;
          height: 22px;
          border-radius: var(--radius-full);
          background: rgba(0, 0, 0, 0.75);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background var(--transition-fast), transform var(--transition-fast);
          z-index: 2;
        }

        .media-carousel-remove:hover {
          background: var(--danger);
          border-color: var(--danger);
          transform: scale(1.1);
        }

        .media-carousel-add-tile {
          flex: 0 0 100px;
          height: 68px;
          aspect-ratio: 16 / 9;
          scroll-snap-align: start;
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-md);
          background: var(--gold-dim);
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .media-carousel-add-tile:hover {
          border-color: var(--gold);
          color: var(--gold);
          background: var(--gold-soft);
        }

        .media-carousel-add-text {
          font-size: var(--text-xs);
          font-weight: var(--font-medium);
        }

        .media-carousel-file-input {
          display: none;
        }

        .media-carousel-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 26px;
          height: 26px;
          border-radius: var(--radius-full);
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: var(--shadow-sm);
          z-index: 3;
          transition: all var(--transition-fast);
        }

        .media-carousel-nav:hover {
          background: var(--gold);
          color: var(--page-bg);
          border-color: var(--gold);
        }

        .media-carousel-nav--prev {
          left: -8px;
        }

        .media-carousel-nav--next {
          right: -8px;
        }
      `}</style>
    </div>
  );
}
