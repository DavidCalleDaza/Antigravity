import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Pencil,
  Clock,
  Package,
  MapPin,
  Tag,
  Power,
  ChevronLeft,
  ChevronRight,
  Play,
  Loader2,
  Building2,
  FileText,
} from 'lucide-react';
import Helpers from '../../utils/helpers';
import DonAppLogo from './DonAppLogo';

const ACCENT_COLORS = {
  product: 'var(--gold)',
  service: 'var(--purple)',
};

export default function ItemDetailModal({
  isOpen,
  onClose,
  item,
  variant = 'product',
  canManage = true,
  onEdit,
  onToggleStatus,
  storeLocations = [],
  dbCategories = [],
}) {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState({});
  const [isToggling, setIsToggling] = useState(false);
  const [localStatus, setLocalStatus] = useState(item?.status || 'active');

  useEffect(() => {
    if (item) {
      setLocalStatus(item.status || 'active');
      setSelectedMediaIndex(0);
      setImageErrors({});
    }
  }, [item]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const isProduct = variant === 'product';
  const accentColor = ACCENT_COLORS[variant] || 'var(--gold)';

  // Construir lista de medios (imágenes y/o video)
  const mediaList = [];
  if (item.video_url) {
    mediaList.push({ type: 'video', url: item.video_url });
  }
  if (item.image_url) {
    mediaList.push({ type: 'image', url: item.image_url });
  }
  if (Array.isArray(item.media_urls)) {
    item.media_urls.forEach((url) => {
      if (url && !mediaList.some((m) => m.url === url)) {
        mediaList.push({ type: 'image', url });
      }
    });
  }

  const currentMedia = mediaList[selectedMediaIndex] || mediaList[0];
  const hasMultipleMedia = mediaList.length > 1;

  // Resolver categoría
  const categoryName =
    item.category?.name ||
    item.category ||
    dbCategories.find((c) => c.id === item.category_id)?.name ||
    'Sin categoría';

  // Resolver sede / ubicación
  const storeLocationName =
    storeLocations.find((loc) => loc.id === item.store_location_id)?.name ||
    item.store_name ||
    item.store_location?.name ||
    null;

  const handleMediaError = (idx) => {
    setImageErrors((prev) => ({ ...prev, [idx]: true }));
  };

  const handleNextMedia = (e) => {
    e?.stopPropagation();
    setSelectedMediaIndex((prev) => (prev + 1) % mediaList.length);
  };

  const handlePrevMedia = (e) => {
    e?.stopPropagation();
    setSelectedMediaIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  };

  const handleToggle = async () => {
    if (isToggling || !onToggleStatus) return;
    const nextStatus = localStatus === 'active' ? 'inactive' : 'active';
    setIsToggling(true);
    try {
      await onToggleStatus(item, nextStatus);
      setLocalStatus(nextStatus);
    } catch (err) {
      console.error('Error toggling status in detail modal:', err);
    } finally {
      setIsToggling(false);
    }
  };

  const isActive = localStatus === 'active';

  return createPortal(
    <div
      className="modal-overlay active item-detail-modal-overlay"
      onClick={(e) => e.target.classList.contains('item-detail-modal-overlay') && onClose?.()}
    >
      <div
        className="modal item-detail-modal-container animate-scaleUp"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="item-detail-header">
          <div className="item-detail-header-tags">
            <span
              className="item-detail-badge-variant"
              style={{
                background: isProduct ? 'rgba(212, 175, 55, 0.15)' : 'rgba(196, 168, 224, 0.15)',
                color: accentColor,
                borderColor: isProduct ? 'rgba(212, 175, 55, 0.35)' : 'rgba(196, 168, 224, 0.35)',
              }}
            >
              <Tag width={12} height={12} />
              {isProduct ? 'Producto' : 'Servicio'}
            </span>
            <span className="item-detail-badge-category">{categoryName}</span>
            <span className={`badge ${isActive ? 'badge-success' : 'badge-neutral'}`}>
              {isActive ? '● Activo' : '● Inactivo'}
            </span>
          </div>

          <button
            className="modal-close item-detail-close-btn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X width={20} height={20} />
          </button>
        </div>

        {/* Cuerpo del Modal (2 Columnas en Desktop) */}
        <div className="item-detail-body">
          {/* Columna Izquierda: Media Ampliada */}
          <div className="item-detail-media-column">
            <div className="item-detail-media-viewer">
              {currentMedia && !imageErrors[selectedMediaIndex] ? (
                currentMedia.type === 'video' ? (
                  <div className="item-detail-video-wrapper">
                    <video
                      src={Helpers.resolveMediaUrl(currentMedia.url)}
                      className="item-detail-video"
                      controls
                      autoPlay
                      playsInline
                      onError={() => handleMediaError(selectedMediaIndex)}
                    />
                  </div>
                ) : (
                  <div className="item-detail-image-wrapper">
                    <img
                      src={Helpers.resolveMediaUrl(currentMedia.url)}
                      alt={item.name}
                      className="item-detail-image"
                      onError={() => handleMediaError(selectedMediaIndex)}
                    />
                  </div>
                )
              ) : (
                <div className="item-detail-placeholder">
                  <DonAppLogo width={80} height={80} variant="auto" />
                  <span>Sin vista previa disponible</span>
                </div>
              )}

              {/* Botones de navegación de galería */}
              {hasMultipleMedia && (
                <>
                  <button
                    className="item-detail-nav-btn prev"
                    onClick={handlePrevMedia}
                    title="Anterior"
                  >
                    <ChevronLeft width={20} height={20} />
                  </button>
                  <button
                    className="item-detail-nav-btn next"
                    onClick={handleNextMedia}
                    title="Siguiente"
                  >
                    <ChevronRight width={20} height={20} />
                  </button>
                  <div className="item-detail-media-counter">
                    {selectedMediaIndex + 1} / {mediaList.length}
                  </div>
                </>
              )}
            </div>

            {/* Tira de Miniaturas si hay múltiples medios */}
            {hasMultipleMedia && (
              <div className="item-detail-thumbnails">
                {mediaList.map((m, idx) => (
                  <button
                    key={idx}
                    className={`item-detail-thumb-btn ${idx === selectedMediaIndex ? 'active' : ''}`}
                    onClick={() => setSelectedMediaIndex(idx)}
                    style={{
                      borderColor: idx === selectedMediaIndex ? accentColor : 'transparent',
                    }}
                  >
                    {m.type === 'video' ? (
                      <div className="item-detail-thumb-video">
                        <Play width={14} height={14} color={accentColor} />
                      </div>
                    ) : (
                      <img
                        src={Helpers.resolveMediaUrl(m.url)}
                        alt={`thumb-${idx}`}
                        className="item-detail-thumb-img"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Columna Derecha: Información y Opciones */}
          <div className="item-detail-info-column">
            <h2 className="item-detail-title">{item.name}</h2>

            <div className="item-detail-price-box">
              <span className="item-detail-price-label">Precio</span>
              <span className="item-detail-price-value" style={{ color: accentColor }}>
                {Helpers.formatCurrency(item.price)}
              </span>
            </div>

            {/* Grid de Atributos */}
            <div className="item-detail-attributes-grid">
              {isProduct ? (
                <div className="item-detail-attr-card">
                  <div className="item-detail-attr-icon" style={{ color: 'var(--gold)' }}>
                    <Package width={18} height={18} />
                  </div>
                  <div>
                    <span className="item-detail-attr-label">Inventario / Stock</span>
                    <span className="item-detail-attr-value">
                      {item.stock !== undefined && item.stock !== null
                        ? `${item.stock} unidades`
                        : 'No registrado'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="item-detail-attr-card">
                  <div className="item-detail-attr-icon" style={{ color: 'var(--purple)' }}>
                    <Clock width={18} height={18} />
                  </div>
                  <div>
                    <span className="item-detail-attr-label">Duración</span>
                    <span className="item-detail-attr-value">
                      {item.duration ? `${item.duration} min` : 'No especificada'}
                    </span>
                  </div>
                </div>
              )}

              {storeLocationName && (
                <div className="item-detail-attr-card">
                  <div className="item-detail-attr-icon" style={{ color: 'var(--primary)' }}>
                    <Building2 width={18} height={18} />
                  </div>
                  <div>
                    <span className="item-detail-attr-label">Sede / Ubicación</span>
                    <span className="item-detail-attr-value">{storeLocationName}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Descripción */}
            <div className="item-detail-section">
              <span className="item-detail-section-title">
                <FileText width={14} height={14} />
                Descripción
              </span>
              <div className="item-detail-description">
                {item.description ? (
                  <p>{item.description}</p>
                ) : (
                  <p className="item-detail-desc-empty">Sin descripción especificada.</p>
                )}
              </div>
            </div>

            {/* Controlador de Estado (Activar / Inactivar) */}
            <div className={`item-detail-status-card ${isActive ? 'is-active' : 'is-inactive'}`}>
              <div className="item-detail-status-text">
                <div className="item-detail-status-head">
                  <Power
                    width={18}
                    height={18}
                    className={isActive ? 'text-success' : 'text-danger'}
                  />
                  <strong>
                    {isActive ? (isProduct ? 'Producto Activo' : 'Servicio Activo') : (isProduct ? 'Producto Inactivo' : 'Servicio Inactivo')}
                  </strong>
                </div>
                <p className="item-detail-status-hint">
                  {isActive
                    ? `El ${isProduct ? 'producto' : 'servicio'} se encuentra visible para los clientes y disponible.`
                    : `El ${isProduct ? 'producto' : 'servicio'} se encuentra oculto en el catálogo general.`}
                </p>
              </div>

              {canManage && (
                <div className="item-detail-switch-wrapper">
                  <label
                    className={`item-detail-switch ${isToggling ? 'is-loading' : ''}`}
                    title={isActive ? 'Desactivar objeto' : 'Activar objeto'}
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      disabled={isToggling}
                      onChange={handleToggle}
                    />
                    <span className="item-detail-switch-slider">
                      {isToggling ? (
                        <Loader2 className="item-detail-switch-spinner" width={12} height={12} />
                      ) : null}
                    </span>
                  </label>
                  <span className="item-detail-switch-action-label">
                    {isActive ? 'Desactivar' : 'Activar'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pie del Modal */}
        <div className="modal-footer item-detail-footer">
          {canManage && onEdit && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                onClose?.();
                onEdit?.(item);
              }}
            >
              <Pencil width={15} height={15} style={{ marginRight: '6px' }} />
              Editar {isProduct ? 'Producto' : 'Servicio'}
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
