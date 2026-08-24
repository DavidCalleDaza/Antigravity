import React from 'react';
import { Loader2, Check } from 'lucide-react';
import Drawer from '../../../components/ui/Drawer';
import MediaUploader from '../../../components/ui/MediaUploader';
import MediaCarousel from '../../../components/ui/MediaCarousel';
import CategorySelect from '../../../components/ui/CategorySelect';
import MarkdownEditor from '../../../components/ui/MarkdownEditor';
import ShareOnSaveSection from '../../../components/ui/ShareOnSaveSection';
import Helpers from '../../../utils/helpers';

export default function ServiceFormDrawer({
  isOpen,
  onClose,
  editingService,
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
  storeLocations,
  accounts,
  shareOnSave,
  setShareOnSave,
}) {
  const saveActionTitle = editingService
    ? shareOnSave.length > 0 ? 'Guardar y publicar' : 'Guardar Cambios'
    : shareOnSave.length > 0 ? 'Crear y publicar' : 'Crear Servicio';

  const handleDropItem = (data) => {
    if (!data) return;
    if (data.kind === 'existing') {
      const draggedUrl = data.url;
      const prevMain = formData.image_url || editingService?.image_url;
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

  const drawerHeaderActions = (
    <button
      type="submit"
      form="service-form-drawer"
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
      title={editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
      headerActions={drawerHeaderActions}
    >
      <form id="service-form-drawer" className="d-flex flex-col gap-5" onSubmit={onSubmit}>
        <MediaUploader
          preview={preview || Helpers.resolveMediaUrl(formData.image_url || editingService?.image_url)}
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
          primaryUrl={formData.image_url || editingService?.image_url}
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

        <div className="form-group">
          <label className="form-label">Nombre <span className="required">*</span></label>
          <input
            type="text"
            className="form-input"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: Corte de cabello"
            required
          />
        </div>

        <CategorySelect
          value={formData.category_id}
          onChange={(categoryId) => setFormData({ ...formData, category_id: categoryId })}
          entityType="service"
          categories={dbCategories}
          onCategoryCreated={onCategoryCreated}
        />

        <div className="d-flex gap-3">
          <div className="form-group flex-1">
            <label className="form-label">Precio <span className="required">*</span></label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>
          <div className="form-group flex-1">
            <label className="form-label">Duración</label>
            <input
              type="text"
              className="form-input"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="Ej: 30 min"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Estado</label>
          <select
            className="form-select"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Descripción</label>
          <MarkdownEditor
            value={formData.description}
            onChange={(val) => setFormData({ ...formData, description: val })}
          />
        </div>

        {storeLocations.length > 0 && (
          <div className="form-group">
            <label className="form-label">Ubicación</label>
            <select
              className="form-select"
              value={formData.store_location_id}
              onChange={(e) => setFormData({ ...formData, store_location_id: e.target.value })}
            >
              <option value="">Sin ubicación</option>
              {storeLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}

        <ShareOnSaveSection
          accounts={accounts}
          selectedNetworks={shareOnSave}
          onChange={setShareOnSave}
        />
      </form>
    </Drawer>
  );
}
