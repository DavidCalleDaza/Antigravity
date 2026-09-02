import React, { useState, useEffect } from 'react';
import {
  Pencil,
  Clock,
  Package,
  Building2,
  Tag,
  Power,
  ChevronLeft,
  ChevronRight,
  Play,
  Loader2,
  FileText,
} from 'lucide-react';
import Drawer from './Drawer';
import Helpers from '../../utils/helpers';
import DonAppLogo from './DonAppLogo';

const ACCENT_COLORS = {
  product: 'var(--gold)',
  service: 'var(--purple)',
};

export default function ItemDetailDrawer({
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

  if (!item) return null;

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
      console.error('Error toggling status in detail drawer:', err);
    } finally {
      setIsToggling(false);
    }
  };

  const isActive = localStatus === 'active';

  const drawerHeaderActions = canManage && onEdit ? (
    <button
      type="button"
      className="btn btn-ghost btn-sm btn-icon-only"
      onClick={() => {
        onClose?.();
        onEdit?.(item);
      }}
      title={`Editar ${isProduct ? 'Producto' : 'Servicio'}`}
      aria-label={`Editar ${isProduct ? 'Producto' : 'Servicio'}`}
    >
      <Pencil width={16} height={16} />
    </button>
  ) : null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      title={isProduct ? 'Detalle de Producto' : 'Detalle de Servicio'}
      headerActions={drawerHeaderActions}
    >
      <div className="item-detail-drawer-content">
        {/* Cabecera de Etiquetas */}
        <div className="item-detail-header-tags" style={{ marginBottom: 'var(--space-3)' }}>
          <span
            className="item-detail-badge-variant"
            style={{
              background: isProduct ? 'rgba(212, 175, 55, 0.15)' : 'rgba(196, 168, 224, 0.15)',
              color: accentColor,
              borderColor: isProduct ? 'rgba(212, 175, 55, 0.35)' : 'rgba(196, 168, 224, 0.35)',
            }}
          >
            <Tag width={11} height={11} />
            {isProduct ? 'Producto' : 'Servicio'}
          </span>
          <span className="item-detail-badge-category">{categoryName}</span>
          <span className={`badge ${isActive ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
            {isActive ? '● Activo' : '● Inactivo'}
          </span>
        </div>

        {/* Visor de Media Ampliada */}
        <div className="item-detail-media-column" style={{ marginBottom: 'var(--space-3)' }}>
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
                <DonAppLogo width={56} height={56} variant="auto" />
                <span style={{ fontSize: '12px' }}>Sin imagen</span>
              </div>
            )}

            {/* Botones de navegación de galería */}
            {hasMultipleMedia && (
              <>
                <button
                  className="item-detail-nav-btn prev"
                  onClick={handlePrevMedia}
                  title="Anterior"
                  type="button"
                >
                  <ChevronLeft width={16} height={16} />
                </button>
                <button
                  className="item-detail-nav-btn next"
                  onClick={handleNextMedia}
                  title="Siguiente"
                  type="button"
                >
                  <ChevronRight width={16} height={16} />
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
                  type="button"
                  className={`item-detail-thumb-btn ${idx === selectedMediaIndex ? 'active' : ''}`}
                  onClick={() => setSelectedMediaIndex(idx)}
                  style={{
                    borderColor: idx === selectedMediaIndex ? accentColor : 'transparent',
                  }}
                >
                  {m.type === 'video' ? (
                    <div className="item-detail-thumb-video">
                      <Play width={12} height={12} color={accentColor} />
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

        {/* Título y Precio */}
        <div className="item-detail-info-column" style={{ gap: 'var(--space-3)' }}>
          <h3 className="item-detail-title">{item.name}</h3>

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
                  <Package width={15} height={15} />
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
                  <Clock width={15} height={15} />
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
                  <Building2 width={15} height={15} />
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
              <FileText width={12} height={12} />
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
                  width={15}
                  height={15}
                  className={isActive ? 'text-success' : 'text-danger'}
                />
                <strong>
                  {isActive
                    ? isProduct
                      ? 'Producto Activo'
                      : 'Servicio Activo'
                    : isProduct
                    ? 'Producto Inactivo'
                    : 'Servicio Inactivo'}
                </strong>
              </div>
              <p className="item-detail-status-hint">
                {isActive
                  ? `El ${isProduct ? 'producto' : 'servicio'} está visible para los clientes y disponible.`
                  : `El ${isProduct ? 'producto' : 'servicio'} está oculto en el catálogo.`}
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
                      <Loader2 className="item-detail-switch-spinner" width={10} height={10} />
                    ) : null}
                  </span>
                </label>
                <span className="item-detail-switch-action-label">
                  {isActive ? 'Desactivar' : 'Activar'}
                </span>
              </div>
            )}
          </div>

          {/* Botón inferior de edición */}
          {canManage && onEdit && (
            <div style={{ marginTop: 'var(--space-1)' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => {
                  onClose?.();
                  onEdit?.(item);
                }}
              >
                <Pencil width={14} height={14} />
                Editar {isProduct ? 'Producto' : 'Servicio'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
