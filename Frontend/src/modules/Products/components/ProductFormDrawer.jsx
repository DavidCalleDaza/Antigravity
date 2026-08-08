import React from 'react';
import { Loader2 } from 'lucide-react';
import Drawer from '../../../components/ui/Drawer';
import MediaUploader from '../../../components/ui/MediaUploader';
import CategorySelect from '../../../components/ui/CategorySelect';
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
  onMediaClear,
  mediaError,
  dbCategories,
  onCategoryCreated,
  storeLocations,
  accounts,
  shareOnSave,
  setShareOnSave,
}) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
    >
      <form className="d-flex flex-col gap-5" onSubmit={onSubmit}>
        <MediaUploader
          preview={preview || Helpers.resolveMediaUrl(editingProduct?.image_url)}
          uploading={uploading}
          compressing={compressing}
          progress={progress}
          onSelect={onFileSelect}
          onClear={onMediaClear}
          error={mediaError}
        />

        <div className="form-group">
          <label className="form-label">Nombre del producto <span className="required">*</span></label>
          <input
            type="text"
            className="form-input"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', alignItems: 'end' }}>
          <div className="form-group">
            <label className="form-label">Categoría</label>
            <CategorySelect
              value={formData.category_id}
              onChange={(val) => setFormData({ ...formData, category_id: val })}
              entityType="product"
              categories={dbCategories}
              onCategoryCreated={onCategoryCreated}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Precio <span className="required">*</span></label>
            <input
              type="number"
              className="form-input"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              required
              min="0"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Stock</label>
            <input
              type="number"
              className="form-input"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
              min="0"
            />
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
              <option value="out_of_stock">Agotado</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea
            className="form-textarea"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows="2"
            style={{ resize: 'vertical' }}
          />
        </div>

        <ShareOnSaveSection
          accounts={accounts}
          selectedNetworks={shareOnSave}
          onChange={setShareOnSave}
        />

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

        <div className="drawer-form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...
              </>
            ) : (
              editingProduct
                ? shareOnSave.length > 0 ? 'Guardar y publicar' : 'Guardar Cambios'
                : shareOnSave.length > 0 ? 'Crear y publicar' : 'Crear Producto'
            )}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
