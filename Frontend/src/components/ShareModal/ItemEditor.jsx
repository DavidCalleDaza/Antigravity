import React, { useState, useMemo } from 'react';
import {
  Pencil,
  Loader2,
  Share2,
  Save,
  Package,
  Wrench,
  ChevronDown,
  ChevronUp,
  Clock,
  Tag,
  Calendar,
  Power,
  FileText,
  Building2,
  Image as ImageIcon,
  Play,
  Volume2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import CategorySelect from '../ui/CategorySelect';
import MarkdownEditor from '../ui/MarkdownEditor';
import Helpers from '../../utils/helpers';

export default function ItemEditor({
  isWallPost,
  isEditingItem,
  setIsEditingItem,
  item,
  editingFields,
  setEditingFields,
  dbCategories,
  onCategoryCreated,
  openSection,
  setOpenSection,
  productSummary,
  isExpanded,
  loadingImage,
  previewUrl,
  aiVideoUrl,
  setIsImagePreviewOpen,
  hasTikTokSelected,
  additionalImages = [],
  removeAdditionalImage,
  additionalImageInputRef,
  addAdditionalImage,
  handleSwapImage,
  itemSaveError,
  savingItem,
  handleSaveItemChanges,
  mode,
}) {
  const isOpen = openSection === 'product' || openSection === 'item';
  const isService = mode === 'service' || (item && item.duration !== undefined && item.stock === undefined);
  const accentColor = isService ? 'var(--purple, #a855f7)' : 'var(--gold, #3eb489)';
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const categoryName =
    item?.category?.name ||
    item?.category ||
    dbCategories?.find((c) => c.id === item?.category_id)?.name ||
    'Sin categoría';

  // Construir lista unificada de medios para el carrusel (imágenes, audios y videos)
  const mediaList = useMemo(() => {
    const list = [];
    if (aiVideoUrl) {
      list.push({ type: 'video', url: aiVideoUrl, isPrimary: true, name: 'Video con IA' });
    } else if (previewUrl) {
      const isVideo = previewUrl.includes('.mp4') || previewUrl.includes('.webm') || (item?.video_url && item.video_url === previewUrl);
      const isAudio = previewUrl.includes('.mp3') || previewUrl.includes('.wav') || (item?.audio_url && item.audio_url === previewUrl);
      list.push({
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        url: previewUrl,
        isPrimary: true,
        name: item?.name || 'Medio principal',
      });
    } else if (item?.video_url) {
      list.push({ type: 'video', url: Helpers.resolveMediaUrl(item.video_url), isPrimary: true, name: item.name });
    } else if (item?.audio_url) {
      list.push({ type: 'audio', url: Helpers.resolveMediaUrl(item.audio_url), isPrimary: true, name: item.name });
    } else if (item?.image_url) {
      list.push({ type: 'image', url: Helpers.resolveMediaUrl(item.image_url), isPrimary: true, name: item.name });
    }

    additionalImages.forEach((img, idx) => {
      const isVid = img.type === 'video' || (img.previewUrl && (img.previewUrl.includes('video') || img.blob?.type?.startsWith('video/')));
      const isAud = img.type === 'audio' || (img.previewUrl && (img.previewUrl.includes('audio') || img.blob?.type?.startsWith('audio/')));
      list.push({
        type: isVid ? 'video' : isAud ? 'audio' : 'image',
        url: img.previewUrl,
        isPrimary: false,
        name: img.name || `Medio adicional ${idx + 1}`,
        additionalIndex: idx,
      });
    });

    return list;
  }, [aiVideoUrl, previewUrl, item, additionalImages]);

  const currentMedia = mediaList[activeMediaIndex] || mediaList[0];
  const hasMultipleMedia = mediaList.length > 1;

  return (
    <div className={`share-step-card ${isOpen ? 'is-open' : ''}`}>
      <div 
        className="share-step-header" 
        style={{ cursor: 'pointer', marginBottom: isOpen ? '1.25rem' : '0', borderBottom: isOpen ? '1px solid var(--border)' : 'none', paddingBottom: isOpen ? '1rem' : '0' }}
        onClick={() => setOpenSection(isOpen ? null : 'product')}
      >
        {isService ? <Wrench width={18} height={18} style={{ color: accentColor }} /> : <Package width={18} height={18} style={{ color: accentColor }} />}
        <h3 className="share-step-title">{isWallPost ? 'EDITAR PUBLICACIÓN' : (isService ? 'EDITAR SERVICIO' : 'EDITAR PRODUCTO')}</h3>
        
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isWallPost && isOpen && (
            <button
              type="button"
              className={`btn btn-ghost btn-xs ${isEditingItem ? 'text-gold' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isEditingItem && item) {
                  setEditingFields({
                    name: item.name || '',
                    category_id: item.category_id || item.category || '',
                    price: item.price || 0,
                    stock: item.stock !== undefined ? item.stock : '',
                    duration: item.duration || '',
                    status: item.status || 'active',
                    description: item.description || '',
                  });
                }
                setIsEditingItem(!isEditingItem);
              }}
              title={isEditingItem ? 'Cancelar edición' : 'Editar información del producto/servicio'}
            >
              <Pencil width={14} height={14} className="mr-1 inline" />
              {isEditingItem ? 'Cancelar' : 'Editar'}
            </button>
          )}
          {isOpen ? <ChevronUp width={20} height={20} /> : <ChevronDown width={20} height={20} />}
        </div>
      </div>

      {isOpen && (
        <div className="share-step-content">
          <div className={`share-sec-grid ${isExpanded ? 'is-expanded-grid' : ''}`}>
            {/* Columna Izquierda: Carrusel de Medios (Imágenes, Videos y Audios) */}
            <div className="share-sec-col-main">
              <div className="share-preview">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <ImageIcon width={14} height={14} />
                  Vista previa de referencia
                </label>
                <div className={isWallPost ? 'share-preview-card share-preview-card--wallpost' : 'share-preview-card'}>
                  {loadingImage ? (
                    <div className="share-preview-loading">
                      <Loader2 width={32} height={32} className="spin" />
                    </div>
                  ) : currentMedia ? (
                    currentMedia.type === 'video' ? (
                      <div className="share-preview-media-wrapper" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                        <video
                          src={currentMedia.url}
                          className="share-preview-video"
                          controls
                          playsInline
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                    ) : currentMedia.type === 'audio' ? (
                      <div className="share-audio-player-wrapper" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', gap: '8px', background: 'var(--surface-raised)' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <Volume2 width={20} height={20} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {currentMedia.name || 'Pista de Audio'}
                        </span>
                        <audio src={currentMedia.url} controls style={{ width: '100%', maxWidth: '260px', height: '32px' }} />
                      </div>
                    ) : (
                      <img
                        src={currentMedia.url}
                        alt="Vista previa"
                        className="share-preview-image"
                        onClick={() => setIsImagePreviewOpen(true)}
                        style={{ cursor: 'pointer', width: '100%', height: '100%', objectFit: 'contain' }}
                        title="Ampliar imagen"
                      />
                    )
                  ) : (
                    <div className="share-preview-placeholder">
                      <Share2 width={40} height={40} style={{ opacity: 0.4 }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Sin medios seleccionados</span>
                    </div>
                  )}

                  {/* Flechas y Contador de Carrusel */}
                  {hasMultipleMedia && (
                    <>
                      <button
                        type="button"
                        className="item-detail-nav-btn prev"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMediaIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
                        }}
                        title="Anterior"
                      >
                        <ChevronLeft width={16} height={16} />
                      </button>
                      <button
                        type="button"
                        className="item-detail-nav-btn next"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMediaIndex((prev) => (prev + 1) % mediaList.length);
                        }}
                        title="Siguiente"
                      >
                        <ChevronRight width={16} height={16} />
                      </button>
                      <div className="item-detail-media-counter">
                        {activeMediaIndex + 1} / {mediaList.length}
                      </div>
                    </>
                  )}

                  {!isWallPost && item && (
                    <div className="share-preview-info">
                      <span className="share-preview-name">{item.name}</span>
                      <span className="share-preview-price" style={{ color: accentColor }}>
                        {Helpers.formatCurrency(item.price)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tira de Carrusel y Selector de Medios */}
              {!isWallPost && (
                <div className="share-multi-img mt-3">
                  <div className="share-multi-img-header">
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Medios del carrusel
                    </label>
                    {hasTikTokSelected ? (
                      <span className="share-multi-img-tiktok-warn">⚠️ TikTok solo permite 1 imagen</span>
                    ) : (
                      <span className="share-multi-img-count">
                        {mediaList.length > 0 ? `${mediaList.length} medio${mediaList.length === 1 ? '' : 's'}` : 'Agrega hasta 9'}
                      </span>
                    )}
                  </div>

                  <div className="share-multi-img-strip">
                    {mediaList.map((media, idx) => (
                      <div
                        key={idx}
                        className={`share-multi-img-thumb ${idx === activeMediaIndex ? 'share-multi-img-thumb--active' : ''} ${media.isPrimary ? 'share-multi-img-thumb--primary' : 'share-multi-img-thumb--interchangeable'}`}
                        onClick={() => {
                          setActiveMediaIndex(idx);
                          if (!media.isPrimary && media.additionalIndex !== undefined) {
                            handleSwapImage?.(media.additionalIndex);
                          }
                        }}
                        style={{
                          borderColor: idx === activeMediaIndex ? accentColor : undefined,
                        }}
                        title={media.isPrimary ? 'Medio principal activo' : 'Clic para seleccionar e intercambiar'}
                      >
                        {media.type === 'video' ? (
                          <div className="item-detail-thumb-video" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
                            <Play width={14} height={14} color="#fff" />
                          </div>
                        ) : media.type === 'audio' ? (
                          <div className="item-detail-thumb-audio" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(168, 85, 247, 0.25)' }}>
                            <Volume2 width={14} height={14} color={accentColor} />
                          </div>
                        ) : (
                          <img src={media.url} alt={`Medio ${idx + 1}`} />
                        )}

                        {!media.isPrimary && media.additionalIndex !== undefined && (
                          <button
                            type="button"
                            className="share-multi-img-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAdditionalImage(media.additionalIndex);
                              if (activeMediaIndex >= mediaList.length - 1) {
                                setActiveMediaIndex(Math.max(0, mediaList.length - 2));
                              }
                            }}
                            title="Quitar medio"
                          >
                            ×
                          </button>
                        )}
                        <span className="share-multi-img-thumb-badge" style={{ background: media.isPrimary ? accentColor : undefined }}>
                          {idx + 1}
                        </span>
                      </div>
                    ))}

                    {/* Botón de subida */}
                    {!hasTikTokSelected && additionalImages.length < 9 && (
                      <button
                        type="button"
                        className="share-multi-img-add"
                        onClick={() => additionalImageInputRef.current?.click()}
                        title="Agregar imagen, video o audio al carrusel"
                      >
                        <span className="share-multi-img-add-plus">+</span>
                        <span className="share-multi-img-add-label">Agregar</span>
                      </button>
                    )}
                  </div>

                  <input
                    ref={additionalImageInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*"
                    style={{ display: 'none' }}
                    onChange={addAdditionalImage}
                  />
                </div>
              )}
            </div>

            {/* Columna Derecha: Ficha técnica / Formulario de edición */}
            {!isWallPost && item && (
              <div className="share-sec-col-details">
                {isEditingItem ? (
                  /* Formulario de Edición */
                  <div className="share-product-details-card share-edit-form-card">
                    <div className="share-details-header">
                      <Pencil width={16} height={16} style={{ color: accentColor }} />
                      <span className="font-semibold text-sm">
                        {isService ? 'Editar datos del servicio' : 'Editar datos del producto'}
                      </span>
                    </div>

                    {itemSaveError && (
                      <div className="ai-copy-error text-xs">⚠️ {itemSaveError}</div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Nombre</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editingFields.name || ''}
                        onChange={(e) => setEditingFields({ ...editingFields, name: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Categoría</label>
                      <CategorySelect
                        entityType={isService ? 'service' : 'product'}
                        categories={dbCategories}
                        value={editingFields.category_id || ''}
                        onChange={(val) => setEditingFields({ ...editingFields, category_id: val })}
                        onCategoryCreated={onCategoryCreated}
                      />
                    </div>

                    <div className="share-details-grid">
                      <div className="form-group">
                        <label className="form-label">Precio ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={editingFields.price || 0}
                          onChange={(e) => setEditingFields({ ...editingFields, price: e.target.value })}
                        />
                      </div>

                      {isService ? (
                        <div className="form-group">
                          <label className="form-label">Duración</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="ej. 30 min"
                            value={editingFields.duration || ''}
                            onChange={(e) => setEditingFields({ ...editingFields, duration: e.target.value })}
                          />
                        </div>
                      ) : (
                        <div className="form-group">
                          <label className="form-label">Stock</label>
                          <input
                            type="number"
                            className="form-input"
                            value={editingFields.stock !== undefined ? editingFields.stock : ''}
                            onChange={(e) => setEditingFields({ ...editingFields, stock: e.target.value })}
                          />
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Estado</label>
                      <select
                        className="form-select"
                        value={editingFields.status || 'active'}
                        onChange={(e) => setEditingFields({ ...editingFields, status: e.target.value })}
                      >
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                        {!isService && <option value="out_of_stock">Agotado</option>}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Descripción</label>
                      <MarkdownEditor
                        value={editingFields.description || ''}
                        onChange={(val) => setEditingFields({ ...editingFields, description: val })}
                        rows={4}
                      />
                    </div>

                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setIsEditingItem(false)}
                        disabled={savingItem}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleSaveItemChanges}
                        disabled={savingItem}
                      >
                        {savingItem ? (
                          <>
                            <Loader2 width={14} height={14} className="spin" /> Guardando...
                          </>
                        ) : (
                          <>
                            <Save width={14} height={14} /> Guardar cambios
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Ficha técnica en modo lectura (Diseño reutilizado de ItemDetailDrawer) */
                  isExpanded && (
                    <div className="share-product-details-card">
                      <div className="share-details-header">
                        <div className="item-detail-header-tags" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                          <span
                            className="item-detail-badge-variant"
                            style={{
                              background: isService ? 'rgba(168, 85, 247, 0.12)' : 'rgba(62, 180, 137, 0.12)',
                              color: accentColor,
                              borderColor: isService ? 'rgba(168, 85, 247, 0.3)' : 'rgba(62, 180, 137, 0.3)',
                              padding: '3px 9px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              border: '1px solid',
                            }}
                          >
                            {isService ? <Wrench width={12} height={12} /> : <Package width={12} height={12} />}
                            {isService ? 'Servicio' : 'Producto'}
                          </span>
                          <span
                            className="item-detail-badge-category"
                            style={{
                              background: 'var(--surface-raised, rgba(255, 255, 255, 0.05))',
                              color: 'var(--text-secondary)',
                              padding: '3px 9px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 500,
                              border: '1px solid var(--border)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <Tag width={11} height={11} />
                            {categoryName}
                          </span>
                          <span
                            className={`badge ${item.status === 'active' ? 'badge-success' : 'badge-neutral'}`}
                            style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', marginLeft: 'auto' }}
                          >
                            {item.status === 'active' ? '● Activo' : '● Inactivo'}
                          </span>
                        </div>
                      </div>

                      {/* Título y Precio */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <h4 className="item-detail-title" style={{ fontSize: '1.1rem', margin: 0 }}>
                          {item.name}
                        </h4>
                        <span className="item-detail-price-value" style={{ color: accentColor, fontSize: '1.2rem' }}>
                          {Helpers.formatCurrency(item.price)}
                        </span>
                      </div>

                      {/* Grid de atributos */}
                      <div className="item-detail-attributes-grid" style={{ marginTop: '8px' }}>
                        {isService ? (
                          <div className="item-detail-attr-card">
                            <div className="item-detail-attr-icon" style={{ color: accentColor }}>
                              <Clock width={15} height={15} />
                            </div>
                            <div>
                              <span className="item-detail-attr-label">Duración</span>
                              <span className="item-detail-attr-value">
                                {item.duration ? `${item.duration} min` : 'No especificada'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="item-detail-attr-card">
                            <div className="item-detail-attr-icon" style={{ color: accentColor }}>
                              <Package width={15} height={15} />
                            </div>
                            <div>
                              <span className="item-detail-attr-label">Inventario / Stock</span>
                              <span className="item-detail-attr-value">
                                {item.stock !== undefined && item.stock !== null ? `${item.stock} unidades` : 'No registrado'}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="item-detail-attr-card">
                          <div className="item-detail-attr-icon" style={{ color: 'var(--primary, #3eb489)' }}>
                            <Tag width={15} height={15} />
                          </div>
                          <div>
                            <span className="item-detail-attr-label">Categoría</span>
                            <span className="item-detail-attr-value">{categoryName}</span>
                          </div>
                        </div>

                        {item.created_at && (
                          <div className="item-detail-attr-card">
                            <div className="item-detail-attr-icon" style={{ color: 'var(--text-tertiary)' }}>
                              <Calendar width={15} height={15} />
                            </div>
                            <div>
                              <span className="item-detail-attr-label">Creado el</span>
                              <span className="item-detail-attr-value">
                                {new Date(item.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="item-detail-attr-card">
                          <div className="item-detail-attr-icon" style={{ color: item.status === 'active' ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)' }}>
                            <Power width={15} height={15} />
                          </div>
                          <div>
                            <span className="item-detail-attr-label">Estado</span>
                            <span className="item-detail-attr-value" style={{ textTransform: 'capitalize' }}>
                              {item.status === 'active' ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Descripción */}
                      <div className="item-detail-section" style={{ marginTop: '8px' }}>
                        <span className="item-detail-section-title">
                          <FileText width={12} height={12} />
                          Descripción
                        </span>
                        <div className="item-detail-description" style={{ minHeight: '48px' }}>
                          {item.description ? (
                            <p style={{ margin: 0 }}>{item.description}</p>
                          ) : (
                            <p className="item-detail-desc-empty">Sin descripción especificada.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
