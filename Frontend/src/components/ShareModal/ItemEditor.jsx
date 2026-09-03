import React from 'react';
import { Pencil, Loader2, Share2, Save, Info, Package, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import CategorySelect from '../ui/CategorySelect';
import MarkdownEditor from '../ui/MarkdownEditor';

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
  additionalImages,
  removeAdditionalImage,
  additionalImageInputRef,
  addAdditionalImage,
  itemSaveError,
  savingItem,
  handleSaveItemChanges,
  mode,
}) {
  const isOpen = openSection === 'product' || openSection === 'item';

  return (
    <div className={`share-step-card ${isOpen ? 'is-open' : ''}`}>
      <div 
        className="share-step-header" 
        style={{ cursor: 'pointer', marginBottom: isOpen ? '1.25rem' : '0', borderBottom: isOpen ? '1px solid var(--border)' : 'none', paddingBottom: isOpen ? '1rem' : '0' }}
        onClick={() => setOpenSection(isOpen ? null : 'product')}
      >
        {mode === 'service' ? <Wrench width={18} height={18} /> : <Package width={18} height={18} />}
        <h3 className="share-step-title">{isWallPost ? 'EDITAR PUBLICACIÓN' : (mode === 'service' ? 'EDITAR SERVICIO' : 'EDITAR PRODUCTO')}</h3>
        
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
        <div className="share-sec-col-main">
          <div className="share-preview">
            <label className="form-label">Vista previa de referencia</label>
            <div className={isWallPost ? 'share-preview-card share-preview-card--wallpost' : 'share-preview-card'}>
              {loadingImage ? (
                <div className="share-preview-loading">
                  <Loader2 width={32} height={32} className="spin" />
                </div>
              ) : previewUrl ? (
                aiVideoUrl ? (
                  <video src={aiVideoUrl} autoPlay loop muted playsInline className="share-preview-image" style={{ objectFit: 'cover' }} />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Vista previa"
                    className="share-preview-image"
                    onClick={() => setIsImagePreviewOpen(true)}
                    style={{ cursor: 'pointer' }}
                    title="Ampliar imagen"
                  />
                )
              ) : (
                <div className="share-preview-placeholder">
                  <Share2 width={48} height={48} />
                </div>
              )}
              {!isWallPost && item && (
                <div className="share-preview-info">
                  <span className="share-preview-name">{item.name}</span>
                  <span className="share-preview-price">$ {Number(item.price || 0).toLocaleString('es-CO')}</span>
                </div>
              )}
            </div>
          </div>

          {/* R5 — Multi-image selector */}
          {!isWallPost && !aiVideoUrl && (
            <div className="share-multi-img mt-3">
              <div className="share-multi-img-header">
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Imágenes adicionales
                </label>
                {hasTikTokSelected ? (
                  <span className="share-multi-img-tiktok-warn">⚠️ TikTok solo permite 1 imagen</span>
                ) : (
                  <span className="share-multi-img-count">
                    {additionalImages.length > 0 ? `${additionalImages.length + 1} imágenes (carousel)` : 'Agrega hasta 9'}
                  </span>
                )}
              </div>

              <div className="share-multi-img-strip">
                {/* Primary image thumbnail */}
                {previewUrl && (
                  <div className="share-multi-img-thumb share-multi-img-thumb--primary" title="Imagen principal">
                    <img src={previewUrl} alt="Principal" />
                    <span className="share-multi-img-thumb-badge">1</span>
                  </div>
                )}

                {/* Additional images */}
                {additionalImages.map((img, idx) => (
                  <div key={idx} className="share-multi-img-thumb">
                    <img src={img.previewUrl} alt={`Imagen ${idx + 2}`} />
                    <button
                      type="button"
                      className="share-multi-img-remove"
                      onClick={() => removeAdditionalImage(idx)}
                      title="Quitar imagen"
                    >
                      ×
                    </button>
                    <span className="share-multi-img-thumb-badge">{idx + 2}</span>
                  </div>
                ))}

                {/* Add button */}
                {!hasTikTokSelected && additionalImages.length < 9 && (
                  <button
                    type="button"
                    className="share-multi-img-add"
                    onClick={() => additionalImageInputRef.current?.click()}
                    title="Agregar imagen al carousel"
                  >
                    <span className="share-multi-img-add-plus">+</span>
                    <span className="share-multi-img-add-label">Agregar</span>
                  </button>
                )}
              </div>

              <input
                ref={additionalImageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={addAdditionalImage}
              />
            </div>
          )}
        </div>

        {/* Columna Derecha o bloque de Edición Real */}
        {!isWallPost && item && (
          <div className="share-sec-col-details">
            {isEditingItem ? (
              /* Formulario de Edición Real */
              <div className="share-product-details-card share-edit-form-card">
                <div className="share-details-header">
                  <Pencil width={16} height={16} className="text-gold" />
                  <span className="font-semibold text-sm">Editar información del ítem</span>
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
                    entityType={item.stock !== undefined ? 'product' : 'service'}
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

                  {item.stock !== undefined ? (
                    <div className="form-group">
                      <label className="form-label">Stock</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editingFields.stock !== undefined ? editingFields.stock : ''}
                        onChange={(e) => setEditingFields({ ...editingFields, stock: e.target.value })}
                      />
                    </div>
                  ) : (
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
                    {item.stock !== undefined && <option value="out_of_stock">Agotado</option>}
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
              /* Ficha técnica en modo lectura */
              isExpanded && (
                <div className="share-product-details-card">
                  <div className="share-details-header">
                    <Package width={18} height={18} className="text-gold" />
                    <span className="font-semibold text-sm">Ficha técnica del producto</span>
                  </div>

                  <div className="share-details-grid">
                    <div className="share-detail-item">
                      <span className="share-detail-label">Categoría</span>
                      <span className="share-detail-val">{item.category || 'General'}</span>
                    </div>
                    <div className="share-detail-item">
                      <span className="share-detail-label">Estado</span>
                      <span className="share-detail-val">
                        {item.status === 'active' ? '🟢 Activo' : item.status === 'inactive' ? '🔴 Inactivo' : '🟡 Agotado'}
                      </span>
                    </div>
                    {item.stock !== undefined && (
                      <div className="share-detail-item">
                        <span className="share-detail-label">Inventario</span>
                        <span className="share-detail-val">{item.stock} unidades</span>
                      </div>
                    )}
                    {item.duration && (
                      <div className="share-detail-item">
                        <span className="share-detail-label">Duración</span>
                        <span className="share-detail-val">{item.duration}</span>
                      </div>
                    )}
                    {item.created_at && (
                      <div className="share-detail-item">
                        <span className="share-detail-label">Creado el</span>
                        <span className="share-detail-val">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {item.description && (
                    <div className="share-detail-desc-block">
                      <span className="share-detail-label">Descripción completa:</span>
                      <p className="share-detail-desc">{item.description}</p>
                    </div>
                  )}
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
