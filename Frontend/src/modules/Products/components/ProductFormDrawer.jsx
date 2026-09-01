import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  Check,
  Image as ImageIcon,
  Package,
  Share2,
  Mic,
  Video,
  Plus,
  Trash2,
  Facebook,
  Instagram,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import Drawer from '../../../components/ui/Drawer';
import AccordionSection from '../../../components/ui/AccordionSection';
import MediaUploader from '../../../components/ui/MediaUploader';
import MediaCarousel from '../../../components/ui/MediaCarousel';
import CategorySelect from '../../../components/ui/CategorySelect';
import MarkdownEditor from '../../../components/ui/MarkdownEditor';
import ShareOnSaveSection from '../../../components/ui/ShareOnSaveSection';
import Helpers from '../../../utils/helpers';

export default function ProductFormDrawer({
  isOpen,
  onClose,
  editingProduct,
  formData,
  setFormData,
  onSubmit,
  isSaving,
  preview,
  uploading,
  compressing,
  progress,
  onFileSelect,
  onPromoteNewImage,
  onMediaClear,
  mediaError,
  dbCategories,
  onCategoryCreated,
  storeLocations = [],
  accounts = [],
  shareOnSave = [],
  setShareOnSave,
}) {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState('media');
  const [audioError, setAudioError] = useState('');
  const [videoError, setVideoError] = useState('');

  const audioInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setOpenSection(editingProduct ? 'info' : 'media');
      setAudioError('');
      setVideoError('');
    }
  }, [isOpen, editingProduct]);

  const saveActionTitle = editingProduct
    ? shareOnSave.length > 0 ? 'Guardar y publicar' : 'Guardar Cambios'
    : shareOnSave.length > 0 ? 'Crear y publicar' : 'Crear Producto';

  const handleDropItem = (data) => {
    if (!data) return;
    if (data.kind === 'existing') {
      const draggedUrl = data.url;
      const prevMain = formData.image_url || editingProduct?.image_url;
      const currentMediaUrls = formData.media_urls || [];
      const idx = currentMediaUrls.indexOf(draggedUrl);

      let newMediaUrls = [...currentMediaUrls];
      if (idx !== -1) {
        if (prevMain && prevMain !== draggedUrl) {
          newMediaUrls[idx] = prevMain;
        } else {
          newMediaUrls.splice(idx, 1);
        }
      }

      setFormData({
        ...formData,
        image_url: draggedUrl,
        media_urls: newMediaUrls,
      });
    } else if (data.kind === 'new') {
      if (onPromoteNewImage) {
        onPromoteNewImage(data.index);
      }
    }
  };

  // ── Audio Handler ──────────────────────────────────────────────────────────
  const handleAddAudio = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioError('');

    if (file.size > 5 * 1024 * 1024) {
      setAudioError('El archivo de audio supera el límite de 5MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const newAudio = {
      id: Date.now() + Math.random().toString(),
      file,
      name: file.name,
      size: file.size,
      previewUrl,
    };

    setFormData({
      ...formData,
      additionalAudios: [...(formData.additionalAudios || []), newAudio],
    });
    e.target.value = '';
  };

  const handleRemoveAudio = (id) => {
    const item = (formData.additionalAudios || []).find((a) => a.id === id);
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    const newAudios = (formData.additionalAudios || []).filter((a) => a.id !== id);
    setFormData({ ...formData, additionalAudios: newAudios });
  };

  // ── Video Handler ──────────────────────────────────────────────────────────
  const handleAddVideo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoError('');

    if (file.size > 25 * 1024 * 1024) {
      setVideoError('El archivo de video supera el límite de 25MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const newVideo = {
      id: Date.now() + Math.random().toString(),
      file,
      name: file.name,
      size: file.size,
      previewUrl,
    };

    setFormData({
      ...formData,
      additionalVideos: [...(formData.additionalVideos || []), newVideo],
    });
    e.target.value = '';
  };

  const handleRemoveVideo = (id) => {
    const item = (formData.additionalVideos || []).find((v) => v.id === id);
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    const newVideos = (formData.additionalVideos || []).filter((v) => v.id !== id);
    setFormData({ ...formData, additionalVideos: newVideos });
  };

  // ── Summaries Calculation ──────────────────────────────────────────────────
  const mainMediaCount = preview || formData.image_url || editingProduct?.image_url ? 1 : 0;
  const existingMediaCount = formData.media_urls?.length || 0;
  const newMediaCount = formData.additionalImages?.length || 0;
  const audioCount = formData.additionalAudios?.length || 0;
  const videoCount = formData.additionalVideos?.length || 0;
  const totalMedia = mainMediaCount + existingMediaCount + newMediaCount + audioCount + videoCount;
  const mediaSummary = `${totalMedia} elemento${totalMedia === 1 ? '' : 's'}`;

  const completedProductFields = [
    Boolean(String(formData.name || '').trim()),
    Boolean(formData.category_id),
    Boolean(formData.price !== '' && formData.price !== null && formData.price !== undefined && Number(formData.price) >= 0),
    Boolean(formData.stock !== '' && formData.stock !== null && formData.stock !== undefined),
    Boolean(formData.status),
    Boolean(String(formData.description || '').trim()),
  ].filter(Boolean).length;
  const infoSummary = `${completedProductFields} / 6 campos`;

  const metaAccounts = accounts.filter((a) => a.platform === 'facebook' || a.platform === 'instagram');
  const tikTokAccounts = accounts.filter((a) => a.platform === 'tiktok');
  const hasAccounts = accounts.length > 0;
  const selectedCount = shareOnSave.length;
  const socialSummary = !hasAccounts
    ? 'Desconectado'
    : selectedCount > 0
    ? `${selectedCount} seleccionada${selectedCount > 1 ? 's' : ''}`
    : `${accounts.length} cuenta${accounts.length > 1 ? 's' : ''} conectada${accounts.length > 1 ? 's' : ''}`;

  const drawerHeaderActions = (
    <button
      type="submit"
      form="product-form-drawer"
      className="btn btn-primary btn-icon-only btn-sm"
      disabled={isSaving}
      title={saveActionTitle}
      aria-label={saveActionTitle}
    >
      {isSaving ? (
        <Loader2 width={16} height={16} style={{ animation: 'spin 1s linear infinite' }} />
      ) : (
        <Check width={16} height={16} />
      )}
    </button>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
      headerActions={drawerHeaderActions}
    >
      <form id="product-form-drawer" className="d-flex flex-col gap-4" onSubmit={onSubmit}>
        {/* ── 1. MULTIMEDIA ── */}
        <AccordionSection
          icon={<ImageIcon width={18} height={18} />}
          title="MULTIMEDIA"
          isOpen={openSection === 'media'}
          onToggle={() => setOpenSection(openSection === 'media' ? null : 'media')}
          summary={mediaSummary}
        >
          <MediaUploader
            preview={preview || Helpers.resolveMediaUrl(formData.image_url || editingProduct?.image_url)}
            uploading={uploading}
            compressing={compressing}
            progress={progress}
            onSelect={onFileSelect}
            onDropItem={handleDropItem}
            onClear={onMediaClear}
            error={mediaError}
          />

          {/* Galería de imágenes adicionales */}
          <MediaCarousel
            existingUrls={formData.media_urls}
            primaryUrl={formData.image_url || editingProduct?.image_url}
            newImages={formData.additionalImages}
            onRemoveExisting={(url) => {
              const newMediaUrls = (formData.media_urls || []).filter((u) => u !== url);
              setFormData({ ...formData, media_urls: newMediaUrls });
            }}
            onRemoveNew={(idx) => {
              const img = formData.additionalImages?.[idx];
              if (img?.previewUrl) {
                URL.revokeObjectURL(img.previewUrl);
              }
              const newImages = (formData.additionalImages || []).filter((_, i) => i !== idx);
              setFormData({ ...formData, additionalImages: newImages });
            }}
            onAddFile={(file) => {
              const previewUrl = URL.createObjectURL(file);
              setFormData({
                ...formData,
                additionalImages: [...(formData.additionalImages || []), { blob: file, previewUrl }],
              });
            }}
          />

          {/* Audios adicionales (Prototipo UI) */}
          <div className="extra-media-block">
            <div className="extra-media-header">
              <div className="extra-media-title">
                <Mic width={16} height={16} />
                <span>Audios adicionales</span>
                <span className="badge-coming-soon">Próximamente</span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon-only"
                onClick={() => audioInputRef.current?.click()}
                title="Agregar audio (máx 5MB)"
              >
                <Plus width={16} height={16} />
              </button>
              <input
                type="file"
                ref={audioInputRef}
                accept="audio/*"
                onChange={handleAddAudio}
                style={{ display: 'none' }}
              />
            </div>
            <div className="extra-media-note">
              Esta función está en desarrollo. Los audios se previsualizan de forma local pero aún no se guardan en el servidor.
            </div>
            {audioError && <div className="text-xs text-danger mt-1">{audioError}</div>}
            {(formData.additionalAudios || []).map((audio) => (
              <div key={audio.id} className="extra-media-item">
                <span className="truncate flex-1 mr-2">{audio.name}</span>
                <audio controls src={audio.previewUrl} style={{ height: '24px', maxWidth: '140px' }} />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-icon-only text-danger ml-2"
                  onClick={() => handleRemoveAudio(audio.id)}
                >
                  <Trash2 width={14} height={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Videos adicionales (Prototipo UI) */}
          <div className="extra-media-block">
            <div className="extra-media-header">
              <div className="extra-media-title">
                <Video width={16} height={16} />
                <span>Videos adicionales</span>
                <span className="badge-coming-soon">Próximamente</span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon-only"
                onClick={() => videoInputRef.current?.click()}
                title="Agregar video (máx 25MB)"
              >
                <Plus width={16} height={16} />
              </button>
              <input
                type="file"
                ref={videoInputRef}
                accept="video/*"
                onChange={handleAddVideo}
                style={{ display: 'none' }}
              />
            </div>
            <div className="extra-media-note">
              Esta función está en desarrollo. Los videos se previsualizan de forma local pero aún no se guardan en el servidor.
            </div>
            {videoError && <div className="text-xs text-danger mt-1">{videoError}</div>}
            {(formData.additionalVideos || []).map((video) => (
              <div key={video.id} className="extra-media-item">
                <span className="truncate flex-1 mr-2">{video.name}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-icon-only text-danger"
                  onClick={() => handleRemoveVideo(video.id)}
                >
                  <Trash2 width={14} height={14} />
                </button>
              </div>
            ))}
          </div>
        </AccordionSection>

        {/* ── 2. INFORMACIÓN DEL PRODUCTO ── */}
        <AccordionSection
          icon={<Package width={18} height={18} />}
          title="INFORMACIÓN DEL PRODUCTO"
          isOpen={openSection === 'info'}
          onToggle={() => setOpenSection(openSection === 'info' ? null : 'info')}
          summary={infoSummary}
        >
          <div className="form-group">
            <label className="form-label">
              Nombre del producto <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Camiseta de Algodón"
              required
            />
          </div>

          <CategorySelect
            value={formData.category_id || ''}
            onChange={(categoryId) => setFormData({ ...formData, category_id: categoryId })}
            entityType="product"
            categories={dbCategories}
            onCategoryCreated={onCategoryCreated}
          />

          <div className="d-flex gap-3">
            <div className="form-group flex-1">
              <label className="form-label">
                Precio <span className="required">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={formData.price !== undefined ? formData.price : ''}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Stock</label>
              <input
                type="number"
                className="form-input"
                value={formData.stock !== undefined ? formData.stock : ''}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Estado</label>
            <select
              className="form-select"
              value={formData.status || 'active'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="out_of_stock">Agotado</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <MarkdownEditor
              value={formData.description || ''}
              onChange={(val) => setFormData({ ...formData, description: val })}
            />
          </div>

          {storeLocations.length > 0 && (
            <div className="form-group">
              <label className="form-label">Ubicación</label>
              <select
                className="form-select"
                value={formData.store_location_id || ''}
                onChange={(e) => setFormData({ ...formData, store_location_id: e.target.value })}
              >
                <option value="">Sin ubicación</option>
                {storeLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </AccordionSection>

        {/* ── 3. REDES SOCIALES ── */}
        <AccordionSection
          icon={<Share2 width={18} height={18} />}
          title="REDES SOCIALES"
          isOpen={openSection === 'social'}
          onToggle={() => setOpenSection(openSection === 'social' ? null : 'social')}
          summary={socialSummary}
        >
          {/* Conexión / Selección Meta */}
          {metaAccounts.length === 0 ? (
            <div className="social-connect-card">
              <div className="social-connect-card-header">
                <Facebook width={20} height={20} />
                <Instagram width={20} height={20} />
                <span>Meta (Facebook &amp; Instagram)</span>
              </div>
              <div className="social-connect-status">
                <AlertCircle width={14} height={14} className="text-secondary" />
                <span>Estado: Desconectado</span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm mt-1"
                onClick={() => navigate('/profile')}
              >
                <Plus width={14} height={14} /> Conectar Cuenta de Meta <ExternalLink width={12} height={12} className="ml-1" />
              </button>
            </div>
          ) : null}

          {/* Conexión / Selección TikTok */}
          {tikTokAccounts.length === 0 ? (
            <div className="social-connect-card">
              <div className="social-connect-card-header">
                <Share2 width={20} height={20} />
                <span>TikTok</span>
              </div>
              <div className="social-connect-status">
                <AlertCircle width={14} height={14} className="text-secondary" />
                <span>Estado: Desconectado</span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm mt-1"
                onClick={() => navigate('/profile')}
              >
                <Plus width={14} height={14} /> Conectar Cuenta de TikTok <ExternalLink width={12} height={12} className="ml-1" />
              </button>
            </div>
          ) : null}

          {/* Si hay cuentas conectadas (Meta o TikTok), mostrar ShareOnSaveSection */}
          {hasAccounts && (
            <ShareOnSaveSection
              accounts={accounts}
              selectedNetworks={shareOnSave}
              onChange={setShareOnSave}
            />
          )}
        </AccordionSection>
      </form>
    </Drawer>
  );
}
