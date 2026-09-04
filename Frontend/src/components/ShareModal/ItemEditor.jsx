import React, { useState, useMemo, useRef } from 'react';
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
  Mic,
  Video as VideoIcon,
  Plus,
  X,
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

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [activeAudioIndex, setActiveAudioIndex] = useState(0);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const categoryName =
    item?.category?.name ||
    item?.category ||
    dbCategories?.find((c) => c.id === item?.category_id)?.name ||
    'Sin categoría';

  // ── 1. Lista de Imágenes ────────────────────────────────────────────────────
  const imageList = useMemo(() => {
    const list = [];
    const isSpecialUrl = previewUrl && (previewUrl.includes('.mp4') || previewUrl.includes('.webm') || previewUrl.includes('.mp3') || previewUrl.includes('.wav') || previewUrl.includes('.ogg'));
    if (previewUrl && !isSpecialUrl) {
      list.push({ type: 'image', url: previewUrl, isPrimary: true, name: item?.name || 'Imagen principal' });
    } else if (item?.image_url) {
      list.push({ type: 'image', url: Helpers.resolveMediaUrl(item.image_url), isPrimary: true, name: item?.name || 'Imagen principal' });
    }

    additionalImages.forEach((img, idx) => {
      const isVid = img.type === 'video' || (img.previewUrl && (img.previewUrl.includes('.mp4') || img.previewUrl.includes('.webm') || img.blob?.type?.startsWith('video/')));
      const isAud = img.type === 'audio' || (img.previewUrl && (img.previewUrl.includes('.mp3') || img.previewUrl.includes('.wav') || img.previewUrl.includes('.ogg') || img.blob?.type?.startsWith('audio/')));
      if (!isVid && !isAud) {
        list.push({
          type: 'image',
          url: img.previewUrl,
          isPrimary: false,
          name: img.name || `Imagen ${list.length + 1}`,
          additionalIndex: idx,
        });
      }
    });
    return list;
  }, [previewUrl, item, additionalImages]);

  // ── 2. Lista de Audios ──────────────────────────────────────────────────────
  const audioList = useMemo(() => {
    const list = [];
    if (item?.audio_url) {
      list.push({
        type: 'audio',
        url: Helpers.resolveMediaUrl(item.audio_url),
        isPrimary: true,
        name: item.audio_url.split('/').pop() || 'Audio principal',
      });
    }

    additionalImages.forEach((img, idx) => {
      const isAud = img.type === 'audio' || (img.previewUrl && (img.previewUrl.includes('.mp3') || img.previewUrl.includes('.wav') || img.previewUrl.includes('.ogg') || img.blob?.type?.startsWith('audio/')));
      if (isAud) {
        list.push({
          type: 'audio',
          url: img.previewUrl,
          isPrimary: false,
          name: img.name || `Pista ${list.length + 1}`,
          additionalIndex: idx,
        });
      }
    });
    return list;
  }, [item, additionalImages]);

  // ── 3. Lista de Videos ──────────────────────────────────────────────────────
  const videoList = useMemo(() => {
    const list = [];
    if (aiVideoUrl) {
      list.push({ type: 'video', url: aiVideoUrl, isPrimary: true, name: 'Video con IA' });
    } else if (item?.video_url) {
      list.push({
        type: 'video',
        url: Helpers.resolveMediaUrl(item.video_url),
        isPrimary: true,
        name: item.video_url.split('/').pop() || 'Video principal',
      });
    }

    additionalImages.forEach((img, idx) => {
      const isVid = img.type === 'video' || (img.previewUrl && (img.previewUrl.includes('.mp4') || img.previewUrl.includes('.webm') || img.blob?.type?.startsWith('video/')));
      if (isVid) {
        list.push({
          type: 'video',
          url: img.previewUrl,
          isPrimary: false,
          name: img.name || `Video ${list.length + 1}`,
          additionalIndex: idx,
        });
      }
    });
    return list;
  }, [aiVideoUrl, item, additionalImages]);

  const safeImgIdx = Math.min(activeImgIndex, Math.max(0, imageList.length - 1));
  const currentImage = imageList[safeImgIdx];

  const safeAudioIdx = Math.min(activeAudioIndex, Math.max(0, audioList.length - 1));
  const currentAudio = audioList[safeAudioIdx];

  const safeVideoIdx = Math.min(activeVideoIndex, Math.max(0, videoList.length - 1));
  const currentVideo = videoList[safeVideoIdx];

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
            {/* Columna Principal: Carrusel(es) de Medios */}
            <div className="share-sec-col-main" style={{ width: '100%' }}>
              <div className={isExpanded ? "share-media-triple-grid" : "share-media-triple-grid--single"}>
                
                {/* ── 1. CARRUSEL DE IMÁGENES ── */}
                <div className="share-media-column">
                  <div className="share-media-column-header">
                    <span className="share-media-column-title">
                      <ImageIcon width={14} height={14} style={{ color: accentColor }} />
                      Imágenes
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="share-media-column-count">
                        {imageList.length} {imageList.length === 1 ? 'imagen' : 'imágenes'}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-primary"
                        onClick={() => imageInputRef.current?.click()}
                        title="Agregar imágenes"
                        style={{ padding: '2px 6px', height: '22px' }}
                      >
                        <Plus width={12} height={12} className="mr-1" />
                        Agregar
                      </button>
                    </div>
                  </div>

                  <div className="share-media-column-card">
                    {loadingImage ? (
                      <div className="share-preview-loading">
                        <Loader2 width={28} height={28} className="spin" />
                      </div>
                    ) : currentImage ? (
                      <>
                        <img
                          src={currentImage.url}
                          alt="Vista previa"
                          className="share-preview-image"
                          onClick={() => setIsImagePreviewOpen(true)}
                          style={{ cursor: 'pointer', width: '100%', height: '100%', objectFit: 'contain' }}
                          title="Clic para ampliar imagen"
                        />
                        {imageList.length > 1 && (
                          <>
                            <button
                              type="button"
                              className="item-detail-nav-btn prev"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveImgIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
                              }}
                              title="Imagen anterior"
                            >
                              <ChevronLeft width={14} height={14} />
                            </button>
                            <button
                              type="button"
                              className="item-detail-nav-btn next"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveImgIndex((prev) => (prev + 1) % imageList.length);
                              }}
                              title="Imagen siguiente"
                            >
                              <ChevronRight width={14} height={14} />
                            </button>
                            <div className="item-detail-media-counter">
                              {safeImgIdx + 1} / {imageList.length}
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
                      </>
                    ) : (
                      <div className="share-media-empty" onClick={() => imageInputRef.current?.click()}>
                        <ImageIcon width={32} height={32} style={{ opacity: 0.35 }} />
                        <span style={{ fontSize: '11px' }}>Sin imágenes</span>
                      </div>
                    )}
                  </div>

                  {/* Tira de miniaturas de imágenes */}
                  {imageList.length > 0 && (
                    <div className="share-media-column-strip">
                      {imageList.map((img, idx) => (
                        <div
                          key={idx}
                          className={`share-multi-img-thumb ${idx === safeImgIdx ? 'share-multi-img-thumb--active' : ''} ${img.isPrimary ? 'share-multi-img-thumb--primary' : 'share-multi-img-thumb--interchangeable'}`}
                          onClick={() => setActiveImgIndex(idx)}
                          style={{ borderColor: idx === safeImgIdx ? accentColor : undefined }}
                          title={img.isPrimary ? 'Imagen 1 (Portada)' : `Imagen ${idx + 1} - Clic para ver`}
                        >
                          <img src={img.url} alt={`Thumb ${idx + 1}`} />
                          {!img.isPrimary && img.additionalIndex !== undefined && (
                            <button
                              type="button"
                              className="share-multi-img-remove"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeAdditionalImage(img.additionalIndex);
                                if (safeImgIdx >= imageList.length - 1) {
                                  setActiveImgIndex(Math.max(0, imageList.length - 2));
                                }
                              }}
                              title="Quitar imagen"
                            >
                              ×
                            </button>
                          )}
                          <span className="share-multi-img-thumb-badge" style={{ background: img.isPrimary ? accentColor : undefined }}>
                            {idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── 2. CARRUSEL DE AUDIOS (Visible solo al expandir) ── */}
                {isExpanded && (
                  <div className="share-media-column">
                    <div className="share-media-column-header">
                      <span className="share-media-column-title">
                        <Volume2 width={14} height={14} style={{ color: '#a855f7' }} />
                        Audios
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="share-media-column-count">
                          {audioList.length} {audioList.length === 1 ? 'audio' : 'audios'}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-primary"
                          onClick={() => audioInputRef.current?.click()}
                          title="Agregar audios"
                          style={{ padding: '2px 6px', height: '22px' }}
                        >
                          <Plus width={12} height={12} className="mr-1" />
                          Agregar
                        </button>
                      </div>
                    </div>

                    <div className="share-media-column-card">
                      {currentAudio ? (
                        <div className="share-audio-player-wrapper">
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <Volume2 width={20} height={20} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {currentAudio.name || 'Pista de audio'}
                          </span>
                          <audio src={currentAudio.url} controls style={{ width: '100%', maxWidth: '240px', height: '32px' }} />

                          {audioList.length > 1 && (
                            <>
                              <button
                                type="button"
                                className="item-detail-nav-btn prev"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveAudioIndex((prev) => (prev - 1 + audioList.length) % audioList.length);
                                }}
                                title="Audio anterior"
                              >
                                <ChevronLeft width={14} height={14} />
                              </button>
                              <button
                                type="button"
                                className="item-detail-nav-btn next"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveAudioIndex((prev) => (prev + 1) % audioList.length);
                                }}
                                title="Audio siguiente"
                              >
                                <ChevronRight width={14} height={14} />
                              </button>
                              <div className="item-detail-media-counter">
                                {safeAudioIdx + 1} / {audioList.length}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="share-media-empty" onClick={() => audioInputRef.current?.click()}>
                          <Mic width={32} height={32} style={{ opacity: 0.35 }} />
                          <span style={{ fontSize: '11px' }}>Sin audios</span>
                        </div>
                      )}
                    </div>

                    {/* Tira de pistas de audios */}
                    {audioList.length > 0 && (
                      <div className="share-media-column-strip">
                        {audioList.map((aud, idx) => (
                          <div
                            key={idx}
                            className={`share-media-audio-tile ${idx === safeAudioIdx ? 'is-active' : ''}`}
                            onClick={() => setActiveAudioIndex(idx)}
                            title={aud.name || `Pista ${idx + 1}`}
                          >
                            <Volume2 width={18} height={18} color="#a855f7" />
                            {!aud.isPrimary && aud.additionalIndex !== undefined && (
                              <button
                                type="button"
                                className="share-multi-img-remove"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAdditionalImage(aud.additionalIndex);
                                  if (safeAudioIdx >= audioList.length - 1) {
                                    setActiveAudioIndex(Math.max(0, audioList.length - 2));
                                  }
                                }}
                                title="Quitar audio"
                              >
                                ×
                              </button>
                            )}
                            <span className="share-media-audio-badge">{idx + 1}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── 3. CARRUSEL DE VIDEOS (Visible solo al expandir) ── */}
                {isExpanded && (
                  <div className="share-media-column">
                    <div className="share-media-column-header">
                      <span className="share-media-column-title">
                        <Play width={14} height={14} style={{ color: '#ef4444' }} />
                        Videos
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="share-media-column-count">
                          {videoList.length} {videoList.length === 1 ? 'video' : 'videos'}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-primary"
                          onClick={() => videoInputRef.current?.click()}
                          title="Agregar videos"
                          style={{ padding: '2px 6px', height: '22px' }}
                        >
                          <Plus width={12} height={12} className="mr-1" />
                          Agregar
                        </button>
                      </div>
                    </div>

                    <div className="share-media-column-card">
                      {currentVideo ? (
                        <div className="share-preview-media-wrapper">
                          <video
                            src={currentVideo.url}
                            className="share-preview-video"
                            controls
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                          {videoList.length > 1 && (
                            <>
                              <button
                                type="button"
                                className="item-detail-nav-btn prev"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveVideoIndex((prev) => (prev - 1 + videoList.length) % videoList.length);
                                }}
                                title="Video anterior"
                              >
                                <ChevronLeft width={14} height={14} />
                              </button>
                              <button
                                type="button"
                                className="item-detail-nav-btn next"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveVideoIndex((prev) => (prev + 1) % videoList.length);
                                }}
                                title="Video siguiente"
                              >
                                <ChevronRight width={14} height={14} />
                              </button>
                              <div className="item-detail-media-counter">
                                {safeVideoIdx + 1} / {videoList.length}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="share-media-empty" onClick={() => videoInputRef.current?.click()}>
                          <VideoIcon width={32} height={32} style={{ opacity: 0.35 }} />
                          <span style={{ fontSize: '11px' }}>Sin videos</span>
                        </div>
                      )}
                    </div>

                    {/* Tira de miniaturas de videos */}
                    {videoList.length > 0 && (
                      <div className="share-media-column-strip">
                        {videoList.map((vid, idx) => (
                          <div
                            key={idx}
                            className={`share-media-video-tile ${idx === safeVideoIdx ? 'is-active' : ''}`}
                            onClick={() => setActiveVideoIndex(idx)}
                            title={vid.name || `Video ${idx + 1}`}
                          >
                            <Play width={16} height={16} color="#fff" />
                            {!vid.isPrimary && vid.additionalIndex !== undefined && (
                              <button
                                type="button"
                                className="share-multi-img-remove"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAdditionalImage(vid.additionalIndex);
                                  if (safeVideoIdx >= videoList.length - 1) {
                                    setActiveVideoIndex(Math.max(0, videoList.length - 2));
                                  }
                                }}
                                title="Quitar video"
                              >
                                ×
                              </button>
                            )}
                            <span className="share-media-video-badge">{idx + 1}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Inputs Ocultos de Archivos para Cada Tipo */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={addAdditionalImage}
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                multiple
                style={{ display: 'none' }}
                onChange={addAdditionalImage}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                style={{ display: 'none' }}
                onChange={addAdditionalImage}
              />
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
