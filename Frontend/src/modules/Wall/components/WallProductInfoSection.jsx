import React from 'react';
import { Package, Wrench, X } from 'lucide-react';
import AccordionSection from '../../../components/ui/AccordionSection';
import MediaUploader from '../../../components/ui/MediaUploader';
import CategorySelect from '../../../components/ui/CategorySelect';
import MarkdownEditor from '../../../components/ui/MarkdownEditor';
import Helpers from '../../../utils/helpers';

export default function WallProductInfoSection({ entity, isOpen, onToggle }) {
  const {
    entityKind,
    setEntityKind,
    entityMode,
    entityFormData,
    setEntityField,
    dbCategories,
    reloadCategories,
    entityMediaError,
    entityPreview,
    entityUploading,
    entityCompressing,
    entityProgress,
    handleEntityFileSelect,
    handleEntityMediaClear,
    linkedItem,
    setLinkedItem,
    linkQuery,
    setLinkQuery,
    linkOptions,
    linkLoading,
    linkSearchActive,
    setLinkSearchActive,
  } = entity;

  const summary =
    entityMode === 'edit'
      ? `Vinculado: ${linkedItem?.name || ''}`
      : entityFormData.name?.trim()
      ? 'Nuevo producto/servicio'
      : 'Sin datos';

  return (
    <AccordionSection
      icon={<Package width={16} height={16} />}
      title="INFORMACIÓN DEL PRODUCTO"
      isOpen={isOpen}
      onToggle={onToggle}
      summary={summary}
    >
      {linkedItem && (
        <div className="wall-linked-card">
          <div className="wall-linked-card-media">
            {linkedItem.image_url ? (
              <img src={Helpers.resolveMediaUrl(linkedItem.image_url)} alt="" />
            ) : (
              <Package size="18" />
            )}
          </div>
          <div className="wall-linked-card-info">
            <span className="wall-linked-card-kind">{linkedItem.kind === 'product' ? 'Producto' : 'Servicio'}</span>
            <span className="wall-linked-card-name">{linkedItem.name}</span>
          </div>
          <button type="button" className="btn-icon-only text-tertiary hover:text-danger" onClick={() => setLinkedItem(null)} title="Quitar vínculo">
            <X size="14" />
          </button>
        </div>
      )}

      {!linkedItem && (
        <div className="d-flex gap-2 mb-2">
          <button
            type="button"
            className={`btn btn-sm ${linkSearchActive ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setLinkSearchActive(true)}
          >
            Buscar existente
          </button>
          <button
            type="button"
            className={`btn btn-sm ${!linkSearchActive ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setLinkSearchActive(false)}
          >
            Crear nuevo
          </button>
        </div>
      )}

      {!linkedItem && linkSearchActive && (
        <div className="wall-picker-panel">
          <div className="wall-picker-toolbar">
            <span className="wall-picker-title"><Package width="14" height="14" /> Vincular producto o servicio</span>
            <input
              className="form-input wall-picker-search"
              placeholder="Buscar..."
              value={linkQuery}
              onChange={(e) => setLinkQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="wall-picker-list">
            {linkLoading ? (
              <div className="wall-picker-empty">Buscando...</div>
            ) : linkOptions.length === 0 ? (
              <div className="wall-picker-empty">Sin resultados</div>
            ) : (
              linkOptions.map((opt) => (
                <button
                  key={`${opt.kind}-${opt.id}`}
                  type="button"
                  className="wall-picker-item"
                  onClick={() => {
                    setLinkedItem(opt);
                    setLinkSearchActive(false);
                    setLinkQuery('');
                  }}
                >
                  <div className="wall-picker-item-media">
                    {opt.image_url ? <img src={Helpers.resolveMediaUrl(opt.image_url)} alt="" /> : <Package width="16" height="16" />}
                  </div>
                  <div className="wall-picker-item-info">
                    <span className="wall-picker-item-kind">{opt.kind === 'product' ? 'Producto' : 'Servicio'}</span>
                    <span className="wall-picker-item-name">{opt.name}</span>
                    {opt.price != null && (
                      <span className="wall-picker-item-price">${Number(opt.price).toLocaleString('es-CO')}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {!linkedItem && !linkSearchActive && (
        <div className="d-flex gap-2 mb-2">
          <button
            type="button"
            className={`btn btn-sm ${entityKind === 'product' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setEntityKind('product')}
          >
            <Package width={14} height={14} /> Producto
          </button>
          <button
            type="button"
            className={`btn btn-sm ${entityKind === 'service' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setEntityKind('service')}
          >
            <Wrench width={14} height={14} /> Servicio
          </button>
        </div>
      )}

      {entityKind && (
        <>
          <MediaUploader
            preview={entityPreview || Helpers.resolveMediaUrl(entityFormData.image_url)}
            uploading={entityUploading}
            compressing={entityCompressing}
            progress={entityProgress}
            onSelect={handleEntityFileSelect}
            onClear={handleEntityMediaClear}
            error={entityMediaError}
          />

          <div className="form-group">
            <label className="form-label">
              Nombre <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={entityFormData.name || ''}
              onChange={(e) => setEntityField('name', e.target.value)}
              placeholder={entityKind === 'service' ? 'Ej: Corte de cabello' : 'Ej: Camiseta de Algodón'}
            />
          </div>

          <CategorySelect
            value={entityFormData.category_id || ''}
            onChange={(categoryId) => setEntityField('category_id', categoryId)}
            entityType={entityKind}
            categories={dbCategories}
            onCategoryCreated={reloadCategories}
          />

          <div className="d-flex gap-3">
            <div className="form-group flex-1">
              <label className="form-label">Precio</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={entityFormData.price}
                onChange={(e) => setEntityField('price', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="form-group flex-1">
              {entityKind === 'service' ? (
                <>
                  <label className="form-label">Duración</label>
                  <input
                    type="text"
                    className="form-input"
                    value={entityFormData.duration}
                    onChange={(e) => setEntityField('duration', e.target.value)}
                    placeholder="Ej: 30 min"
                  />
                </>
              ) : (
                <>
                  <label className="form-label">Stock</label>
                  <input
                    type="number"
                    className="form-input"
                    value={entityFormData.stock}
                    onChange={(e) => setEntityField('stock', e.target.value)}
                    placeholder="0"
                  />
                </>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Estado</label>
            <select
              className="form-select"
              value={entityFormData.status || 'active'}
              onChange={(e) => setEntityField('status', e.target.value)}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              {entityKind !== 'service' && <option value="out_of_stock">Agotado</option>}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <MarkdownEditor
              value={entityFormData.description || ''}
              onChange={(val) => setEntityField('description', val)}
            />
          </div>
        </>
      )}
    </AccordionSection>
  );
}
