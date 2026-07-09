import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, List, Grid3X3, PackageX, ShoppingCart } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import Helpers from '../../utils/helpers';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Drawer from '../../components/ui/Drawer';
import MediaCard from '../../components/ui/MediaCard';
import { MediaCardSkeleton } from '../../components/ui/ItemCardSkeleton';
import MediaUploader from '../../components/ui/MediaUploader';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useToast } from '../../components/ui/Toast';
import { useStore } from '../../store/useStore';
import { productClient, categoryClient, ApiError } from '../../utils/apiClient';
import ShareModal from '../../components/ShareModal';
import CategorySelect from '../../components/ui/CategorySelect';

const { ADMIN, SELLER, CLIENT } = APP_CONFIG.ROLES;

export default function Products() {
  const { currentUser } = useStore();
  const userRole = currentUser?.role;
  const canManage = userRole === ADMIN || userRole === SELLER;

  const [view, setView] = useState('grid');
  const [products, setProducts] = useState([]);
  const [dbCategories, setDbCategories] = useState([]); // Nuevo estado para las categorías de la BD
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Se inicializa category_id en lugar de category
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    price: 0,
    stock: 0,
    status: 'active',
    description: '',
  });
  const [mediaError, setMediaError] = useState(null);
  const [shareOnSave, setShareOnSave] = useState({ facebook: false, instagram: false, tiktok: false });
  const [shareModal, setShareModal] = useState({ isOpen: false, item: null });

  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle OAuth callback redirect status
  useEffect(() => {
    const socialStatus = searchParams.get('social_status');
    const platform = searchParams.get('platform');
    const detail = searchParams.get('detail');

    if (socialStatus === 'success') {
      toast.success(`¡Cuenta de ${platform || 'red social'} conectada exitosamente!`);
    } else if (socialStatus === 'error') {
      toast.error(`Error al conectar ${platform || 'red social'}: ${detail || 'desconocido'}`);
    }

    // Clean up query params so they don't reappear on refresh
    if (socialStatus) {
      searchParams.delete('social_status');
      searchParams.delete('platform');
      searchParams.delete('detail');
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { upload, uploading, progress, preview, reset, validateFile } = useFileUpload({
    onSuccess: (data) => {
      setFormData(prev => ({ ...prev, image_url: data.url, video_url: data.type === 'video' ? data.url : prev.video_url }));
      toast.success('Media subido correctamente');
    },
    onError: (err) => {
      setMediaError(err);
      toast.error(err);
    },
  });

  useEffect(() => {
    loadProducts();
    loadCategories(); // Carga las categorías al iniciar
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productClient.list();
      setProducts(data);
    } catch (err) {
      const errorMessage = err instanceof ApiError && err.status === 500 && err.message?.includes('relation')
        ? 'La base de datos no está sincronizada. Contacta al administrador.'
        : err instanceof ApiError
          ? err.message
          : 'Error de conexión con el servidor.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener las categorías de la base de datos
  const loadCategories = async () => {
    try {
      const data = await categoryClient.list('product');
      console.log('Categorías recibidas:', data); // ← agrega esto
      setDbCategories(data);
    } catch (err) {
      console.error('Error cargando categorías:', err);
    }
  };

  // Se procesan los productos filtrados y se mapea "category" como string
  // para mantener la compatibilidad con componentes que usen .category (como MediaCard)
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        if (categoryFilter && p.category_id !== categoryFilter) return false;
        if (statusFilter && p.status !== statusFilter) return false;
        return true;
      })
      .map(p => ({
        ...p,
        // Si el backend incluye la relación cargada o la resolvemos localmente con dbCategories
        category: p.category?.name || dbCategories.find(c => c.id === p.category_id)?.name || 'Sin categoría'
      }));
  }, [products, categoryFilter, statusFilter, dbCategories]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError(null);
    const validation = validateFile(file);
    if (!validation.valid) {
      setMediaError(validation.error);
      return;
    }
    upload(file);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      // Se asegura de enviar null en lugar de un string vacío si no se selecciona categoría
      const payload = { 
        ...formData,
        category_id: formData.category_id || null 
      };
      let savedItem;
      if (editingProduct) {
        savedItem = await productClient.update(editingProduct.id, payload);
        setProducts(products.map(p => p.id === editingProduct.id ? savedItem : p));
        toast.success('Producto actualizado correctamente.');
      } else {
        savedItem = await productClient.create(payload);
        setProducts([savedItem, ...products]);
        toast.success('Producto creado exitosamente.');
      }
      const hasShareSelected = Object.values(shareOnSave).some(Boolean);
      resetForm();
      if (hasShareSelected) {
        const networks = Object.entries(shareOnSave)
          .filter(([, v]) => v)
          .map(([k]) => k);
        setTimeout(() => {
          setShareModal({ isOpen: true, item: { ...savedItem, type: 'producto' } });
        }, 100);
      }
    } catch (err) {
      toast.error(editingProduct ? 'Error al actualizar' : 'Error al crear');
    }
  };

  const handleDelete = async () => {
    try {
      await productClient.delete(deletingId);
      setProducts(products.filter(p => p.id !== deletingId));
      toast.success('Producto eliminado.');
    } catch (err) {
      toast.error('Error al eliminar');
    } finally {
      setIsConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      category_id: '',
      price: 0,
      stock: 0,
      status: 'active',
      description: '',
    });
    setShareOnSave({ facebook: false, instagram: false, tiktok: false });
    reset();
    setMediaError(null);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category_id: product.category_id || '', // Se asigna el ID de la categoría correspondiente
      price: product.price,
      stock: product.stock,
      status: product.status,
      description: product.description || '',
    });
    setIsModalOpen(true);
  };

  const statusBadge = (s) => {
    const cls = { active: 'badge-success', inactive: 'badge-neutral', out_of_stock: 'badge-danger' };
    return <span className={`badge badge-dot ${cls[s] || 'badge-neutral'}`}>{APP_CONFIG.PRODUCT_STATUS_LABELS[s]}</span>;
  };

  const columns = [
    { key: 'name', label: 'Producto', sortable: true },
    { key: 'category', label: 'Categoría', sortable: true }, // Muestra el string resuelto en filteredProducts
    { key: 'price', label: 'Precio', sortable: true, render: (v) => Helpers.formatCurrency(v) },
    { key: 'stock', label: 'Stock', sortable: true },
    { key: 'status', label: 'Estado', sortable: true, render: (v) => statusBadge(v) }
  ];

  const tableActions = (row) => (
    <div className="d-flex gap-2">
      {canManage && (
        <>
          <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => openEditModal(row)}>
            <PencilIcon />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon-only" style={{ color: 'var(--danger)' }} onClick={() => { setDeletingId(row.id); setIsConfirmOpen(true); }}>
            <TrashIcon />
          </button>
        </>
      )}
      {userRole === CLIENT && (
        <button className="btn btn-primary btn-sm">
          <CartIcon />
          Añadir
        </button>
      )}
    </div>
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Productos</h2>
          <p className="page-description">Gestiona tu inventario de productos</p>
        </div>
        <div className="page-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={() => { setEditingProduct(null); setFormData({ name: '', category_id: '', price: 0, stock: 0, status: 'active', description: '' }); setIsModalOpen(true); }}>
              <Plus width="18" height="18" />
              Nuevo Producto
            </button>
          )}
        </div>
      </div>

      <div className="products-toolbar">
        <div className="products-filters">
          {/* Selector de categorías dinámico para el filtro */}
          <select
            className="form-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: 'auto', padding: 'var(--space-2) var(--space-4)' }}
          >
            <option value="">Todas las categorías</option>
            {dbCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto', padding: 'var(--space-2) var(--space-4)' }}
          >
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="out_of_stock">Agotado</option>
          </select>
        </div>
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}
            onClick={() => setView('table')}
            title="Vista de tabla"
          >
            <List width="18" height="18" />
          </button>
          <button
            className={`view-toggle-btn ${view === 'grid' ? 'active' : ''}`}
            onClick={() => setView('grid')}
            title="Vista de grid"
          >
            <Grid3X3 width="18" height="18" />
          </button>
        </div>
      </div>

      {loading ? (
        <MediaCardSkeleton count={6} />
      ) : error ? (
        <div className="error-state">
          <div className="error-state-icon">⚠️</div>
          <div className="error-state-title">Error al cargar productos</div>
          <div className="error-state-text">{error}</div>
          <button className="btn btn-primary" onClick={loadProducts}>Reintentar</button>
        </div>
      ) : view === 'grid' ? (
        <div className="product-grid">
          {filteredProducts.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon"><PackageX width="48" height="48" /></div>
              <div className="empty-state-title">Sin productos</div>
              <div className="empty-state-text">No hay productos que coincidan con los filtros.</div>
            </div>
          ) : (
            filteredProducts.map(p => (
              <MediaCard
                key={p.id}
                item={p}
                variant="product"
                canManage={canManage}
                onEdit={openEditModal}
                onDelete={(item) => { setDeletingId(item.id); setIsConfirmOpen(true); }}
                onAction={(product) => toast.success(`${product.name} añadido`)}
                onShare={(item) => setShareModal({ isOpen: true, item })}
                actionLabel="Añadir"
                actionIcon={ShoppingCart}
              />
            ))
          )}
        </div>
      ) : (
        <Table
          columns={columns}
          data={filteredProducts}
          actions={tableActions}
        />
      )}

      <Drawer
        isOpen={isModalOpen}
        onClose={resetForm}
        position="right"
        title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
      >
        <form className="d-flex flex-col gap-5" onSubmit={handleSaveProduct}>
          <MediaUploader
            preview={preview || Helpers.resolveMediaUrl(editingProduct?.image_url)}
            uploading={uploading}
            progress={progress}
            onSelect={handleFileSelect}
            onClear={reset}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <CategorySelect
                value={formData.category_id}
                onChange={(val) => setFormData({ ...formData, category_id: val })}
                entityType="product"
                categories={dbCategories}
                onCategoryCreated={loadCategories}
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
              rows="3"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="share-on-save">
            <label className="form-label">Publicar al guardar (opcional)</label>
            <div className="share-networks-inline">
              {[
                { id: 'facebook', label: 'Facebook' },
                { id: 'instagram', label: 'Instagram' },
                { id: 'tiktok', label: 'TikTok' },
              ].map(({ id, label }) => (
                <label key={id} className="share-checkbox-label">
                  <input
                    type="checkbox"
                    checked={shareOnSave[id]}
                    onChange={(e) => setShareOnSave(prev => ({ ...prev, [id]: e.target.checked }))}
                    className="form-checkbox"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ border: 'none', padding: 0, marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
            <button type="button" className="btn btn-outline" onClick={resetForm}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              {editingProduct
                ? Object.values(shareOnSave).some(Boolean) ? 'Guardar y publicar' : 'Guardar Cambios'
                : Object.values(shareOnSave).some(Boolean) ? 'Crear y publicar' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </Drawer>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Eliminar Producto"
        size="sm"
        actions={[
          { label: 'Cancelar', onClick: () => setIsConfirmOpen(false) },
          { label: 'Confirmar', className: 'btn-danger', onClick: handleDelete }
        ]}
      >
        <p style={{ color: 'var(--text-secondary)' }}>¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.</p>
      </Modal>

      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ isOpen: false, item: null })}
        item={shareModal.item}
      />

      <style>{`
        .loading-state, .error-state {
          text-align: center;
          padding: var(--space-12);
          color: var(--text-secondary);
        }
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-4);
        }
        .error-state-icon {
          font-size: var(--text-4xl);
        }
        .error-state-title {
          font-size: var(--text-xl);
          font-weight: var(--font-semibold);
          color: var(--text-primary);
        }
        .error-state-text {
          max-width: 400px;
          color: var(--text-secondary);
        }

        .share-on-save {
          border-top: 1px solid var(--neutral-700);
          padding-top: var(--space-4);
          margin-top: var(--space-2);
        }

        .share-networks-inline {
          display: flex;
          gap: var(--space-4);
          margin-top: var(--space-2);
        }

        .share-checkbox-label {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          cursor: pointer;
          font-size: var(--text-sm);
        }

        .share-checkbox-label input {
          accent-color: var(--gold);
        }
      `}</style>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}