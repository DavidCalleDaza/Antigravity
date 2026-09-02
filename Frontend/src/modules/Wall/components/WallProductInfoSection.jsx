import React, { useState, useEffect } from 'react';
import { Boxes, Package, Wrench, Search, Plus, X } from 'lucide-react';
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

  // Mode: null (initial state) | 'search' | 'create'
  const [activeMode, setActiveMode] = useState(() => {
    if (linkSearchActive) return 'search';
    if (entityKind) return 'create';
    return null;
  });

  // Filtro de búsqueda por tipo: 'all' | 'product' | 'service'
  const [searchTypeFilter, setSearchTypeFilter] = useState('all');

  useEffect(() => {
    if (linkedItem) {
      setActiveMode(null);
      setSearchTypeFilter('all');
    } else if (linkSearchActive) {
      setActiveMode('search');
    } else if (entityKind) {
      setActiveMode('create');
    } else if (!entityFormData.name?.trim()) {
      setActiveMode(null);
      setSearchTypeFilter('all');
    }
  }, [linkedItem, linkSearchActive, entityKind, entityFormData.name]);

  const handleSelectSearchMode = () => {
    if (activeMode === 'search') {
      setActiveMode(null);
      setLinkSearchActive(false);
      setSearchTypeFilter('all');
    } else {
      setActiveMode('search');
      setLinkSearchActive(true);
      setEntityKind(null);
      setSearchTypeFilter('all');
    }
  };

  const handleSelectCreateMode = () => {
    if (activeMode === 'create') {
      setActiveMode(null);
      setLinkSearchActive(false);
      setEntityKind(null);
    } else {
      setActiveMode('create');
      setLinkSearchActive(false);
      setSearchTypeFilter('all');
      setEntityKind((prev) => prev || 'product');
    }
  };

  const handleSelectKind = (kind) => {
    setActiveMode('create');
    setLinkSearchActive(false);
    setEntityKind(kind);
  };

  const handleUnlink = () => {
    setLinkedItem(null);
    setActiveMode(null);
    setEntityKind(null);
    setLinkSearchActive(false);
    setSearchTypeFilter('all');
  };

  const summary =
    entityMode === 'edit' && linkedItem
      ? `Vinculado: ${linkedItem?.name || ''}`
      : entityFormData.name?.trim()
      ? `Nuevo ${entityKind === 'service' ? 'servicio' : 'producto'}: ${entityFormData.name}`
      : 'Sin datos';

  // Filtrado de resultados en modo búsqueda
  const displayedOptions = linkOptions.filter((opt) => {
    if (activeMode === 'search') {
      if (searchTypeFilter === 'product') return opt.kind === 'product';
      if (searchTypeFilter === 'service') return opt.kind === 'service';
    }
    return true;
  });

  return (
    <AccordionSection
      icon={<Boxes width={16} height={16} />}
      title="INFORMACIÓN DE PRODUCTOS Y SERVICIOS"
      isOpen={isOpen}
      onToggle={onToggle}
      summary={summary}
    >
      {/* 1. Item vinculado previamente */}
      {linkedItem && (
        <div className="wall-linked-card">
          <div className="wall-linked-card-media">
            {linkedItem.image_url ? (
              <img src={Helpers.resolveMediaUrl(linkedItem.image_url)} alt="" />
            ) : linkedItem.kind === 'service' ? (
              <Wrench size={18} />
            ) : (
              <Package size={18} />
            )}
          </div>
          <div className="wall-linked-card-info">
            <span className="wall-linked-card-kind">
              {linkedItem.kind === 'product' ? 'Producto vinculado' : 'Servicio vinculado'}
            </span>
            <span className="wall-linked-card-name">{linkedItem.name}</span>
            {linkedItem.price != null && (
              <span className="wall-picker-item-price">${Number(linkedItem.price).toLocaleString('es-CO')}</span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm wall-unlink-btn"
            onClick={handleUnlink}
            title="Quitar vínculo"
          >
            <X size={14} />
            <span>Quitar</span>
          </button>
        </div>
      )}

      {/* 2. Barra de acciones: BUSCAR, CREAR y fila de íconos (Producto / Servicio) ubicada abajo */}
      {!linkedItem && (
        <div className="wall-product-action-container">
          <div className="wall-product-action-bar">
            <button
              type="button"
              className={`wall-action-pill ${activeMode === 'search' ? 'active' : ''}`}
              onClick={handleSelectSearchMode}
            >
              <Search size={14} className="wall-action-icon" />
              <span>BUSCAR</span>
            </button>

            <button
              type="button"
              className={`wall-action-pill ${activeMode === 'create' ? 'active' : ''}`}
              onClick={handleSelectCreateMode}
            >
              <Plus size={15} className="wall-action-icon" />
              <span>CREAR</span>
            </button>
          </div>

          {/* Íconos de producto y servicio abajo de los botones:
              - En modo BUSCAR: funcionan como filtros de tipo (Producto / Servicio)
              - En modo CREAR / Inicial: funcionan para seleccionar el tipo a crear */}
          <div className="wall-product-type-bar">
            <button
              type="button"
              className={`wall-icon-pill ${
                activeMode === 'search'
                  ? searchTypeFilter === 'product' ? 'active' : ''
                  : activeMode === 'create' && entityKind === 'product' ? 'active' : ''
              }`}
              onClick={() => {
                if (activeMode === 'search') {
                  setSearchTypeFilter((prev) => (prev === 'product' ? 'all' : 'product'));
                } else {
                  handleSelectKind('product');
                }
              }}
              title={activeMode === 'search' ? (searchTypeFilter === 'product' ? 'Quitar filtro de Producto' : 'Filtrar solo Productos') : 'Crear Producto'}
              aria-label="Producto"
            >
              <Package size={15} />
            </button>
            <button
              type="button"
              className={`wall-icon-pill ${
                activeMode === 'search'
                  ? searchTypeFilter === 'service' ? 'active' : ''
                  : activeMode === 'create' && entityKind === 'service' ? 'active' : ''
              }`}
              onClick={() => {
                if (activeMode === 'search') {
                  setSearchTypeFilter((prev) => (prev === 'service' ? 'all' : 'service'));
                } else {
                  handleSelectKind('service');
                }
              }}
              title={activeMode === 'search' ? (searchTypeFilter === 'service' ? 'Quitar filtro de Servicio' : 'Filtrar solo Servicios') : 'Crear Servicio'}
              aria-label="Servicio"
            >
              <Wrench size={15} />
            </button>
          </div>
        </div>
      )}

      {/* 3. Panel de Búsqueda (cuando activeMode === 'search') */}
      {!linkedItem && activeMode === 'search' && (
        <div className="wall-picker-panel">
          <div className="wall-picker-toolbar">
            <Search size={15} className="text-secondary ml-1" />
            <input
              className="form-input wall-picker-search"
              placeholder={
                searchTypeFilter === 'product'
                  ? 'Buscar producto por nombre...'
                  : searchTypeFilter === 'service'
                  ? 'Buscar servicio por nombre...'
                  : 'Buscar producto o servicio por nombre...'
              }
              value={linkQuery}
              onChange={(e) => setLinkQuery(e.target.value)}
              autoFocus
            />
            {linkQuery && (
              <button
                type="button"
                className="btn-icon-only text-tertiary hover:text-primary"
                onClick={() => setLinkQuery('')}
                title="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="wall-picker-list">
            {linkLoading ? (
              <div className="wall-picker-empty">Buscando elementos...</div>
            ) : displayedOptions.length === 0 ? (
              <div className="wall-picker-empty">
                {searchTypeFilter === 'product'
                  ? 'No se encontraron productos.'
                  : searchTypeFilter === 'service'
                  ? 'No se encontraron servicios.'
                  : linkQuery.trim()
                  ? 'No se encontraron resultados.'
                  : 'Escribe para buscar productos o servicios.'}
              </div>
            ) : (
              displayedOptions.map((opt) => (
                <button
                  key={`${opt.kind}-${opt.id}`}
                  type="button"
                  className="wall-picker-item"
                  onClick={() => {
                    setLinkedItem(opt);
                    setLinkSearchActive(false);
                    setLinkQuery('');
                    setActiveMode(null);
                    setSearchTypeFilter('all');
                  }}
                >
                  <div className="wall-picker-item-media">
                    {opt.image_url ? (
                      <img src={Helpers.resolveMediaUrl(opt.image_url)} alt="" />
                    ) : opt.kind === 'service' ? (
                      <Wrench width="16" height="16" />
                    ) : (
                      <Package width="16" height="16" />
                    )}
                  </div>
                  <div className="wall-picker-item-info">
                    <span className="wall-picker-item-kind">{opt.kind === 'product' ? 'Producto' : 'Servicio'}</span>
                    <span className="wall-picker-item-name">{opt.name}</span>
                    {opt.price != null && (
                      <span className="wall-picker-item-price">${Number(opt.price).toLocaleString('es-CO')}</span>
                    )}
                  </div>
                  <span className="wall-picker-item-action">Vincular →</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. Formulario de creación (cuando activeMode === 'create' y se tiene seleccionado tipo de entidad) */}
      {!linkedItem && activeMode === 'create' && entityKind && (
        <div className="wall-create-form-body">
          <div className="wall-form-divider" />

          <MediaUploader
            preview={entityPreview || Helpers.resolveMediaUrl(entityFormData.image_url)}
            uploading={entityUploading}
            compressing={entityCompressing}
            progress={entityProgress}
            onSelect={handleEntityFileSelect}
            onClear={handleEntityMediaClear}
            error={entityMediaError}
          />

          <div className="form-group mt-3">
            <label className="form-label">
              Nombre del {entityKind === 'service' ? 'Servicio' : 'Producto'} <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={entityFormData.name || ''}
              onChange={(e) => setEntityField('name', e.target.value)}
              placeholder={entityKind === 'service' ? 'Ej: Corte de cabello o Taller' : 'Ej: Camiseta de Algodón o Vestido'}
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
              <label className="form-label">Precio ($)</label>
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
        </div>
      )}
    </AccordionSection>
  );
}
