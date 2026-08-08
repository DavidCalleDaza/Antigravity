import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, List, Grid3X3, PackageX, Package, ShoppingCart, Power, Calendar, Loader2 } from 'lucide-react';
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
import { productClient, categoryClient, agendaClient, socialClient, ApiError } from '../../utils/apiClient';
import ShareModal from '../../components/ShareModal';
import CategorySelect from '../../components/ui/CategorySelect';
import Dropdown from '../../components/ui/Dropdown';
import ConfirmModal from '../../components/ui/ConfirmModal';
import ShareOnSaveSection from '../../components/ui/ShareOnSaveSection';

const { ADMIN, SELLER, CLIENT } = APP_CONFIG.ROLES;

export default function Products() {
  const { currentUser } = useStore();
  const userRole = currentUser?.role;
  const canManage = userRole === ADMIN || userRole === SELLER;
  const isClient = userRole === CLIENT;
  const navigate = useNavigate();

  const [view, setView] = useState('grid');
  const [products, setProducts] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [storeLocations, setStoreLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Estados de Main (Borrado duro)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Estados de Test (Alternancia de estado activo/inactivo)
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    price: 0,
    stock: 0,
    status: 'active',
    description: '',
    store_location_id: '',
  });
  
  const [mediaError, setMediaError] = useState(null);
  const [shareOnSave, setShareOnSave] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [shareModal, setShareModal] = useState({ isOpen: false, item: null });
  const [isSaving, setIsSaving] = useState(false);

  const categoryOptions = [
    { value: '', label: 'Todas las categorías' },
    ...dbCategories.map(c => ({ value: c.id, label: c.name })),
  ];

  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' },
    { value: 'out_of_stock', label: 'Agotado' },
  ];

  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle OAuth callback redirect status (desde main)
  useEffect(() => {
    const socialStatus = searchParams.get('social_status');
    const platform = searchParams.get('platform');
    const detail = searchParams.get('detail');

    if (socialStatus === 'success') {
      toast.success(`¡Cuenta de ${platform || 'red social'} conectada exitosamente!`);
    } else if (socialStatus === 'error') {
      toast.error(`Error al conectar ${platform || 'red social'}: ${detail || 'desconocido'}`);
    }

    if (socialStatus) {
      searchParams.delete('social_status');
      searchParams.delete('platform');
      searchParams.delete('detail');
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { upload, uploading, compressing, progress, preview, reset, validateFile } = useFileUpload({
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
    loadCategories();
    loadAccounts();
    if (isClient) {
      agendaClient.listSellers().then(setSellers).catch(() => {});
    } else {
      agendaClient.listStoreLocations().then(setStoreLocations).catch(() => {});
    }
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (isClient && sellerFilter) params.seller_id = sellerFilter;
      const data = await productClient.list(params);
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

  const loadCategories = async () => {
    try {
      const data = await categoryClient.list('product');
      setDbCategories(data);
    } catch (err) {
      console.error('Error cargando categorías:', err);
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await socialClient.listAccounts();
      setAccounts(data.filter(a => a.status === 'active') || []);
    } catch (err) {
      console.error('Error cargando cuentas:', err);
    }
  };

  useEffect(() => {
    if (isClient) loadProducts();
  }, [sellerFilter]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        if (categoryFilter && p.category_id !== categoryFilter) return false;
        if (statusFilter) {
          if (statusFilter === 'out_of_stock') {
            const isOutOfStock = (p.stock ?? 0) <= 0 || p.status === 'out_of_stock';
            if (!isOutOfStock) return false;
          } else if (p.status !== statusFilter) {
            return false;
          }
        }
        return true;
      })
      .map(p => ({
        ...p,
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
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = { 
        ...formData,
        category_id: formData.category_id || null,
        store_location_id: formData.store_location_id || null 
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
      const hasShareSelected = shareOnSave.length > 0;
      resetForm();
      if (hasShareSelected) {
        setTimeout(() => {
          setShareModal({ isOpen: true, item: { ...savedItem, imageUrl: savedItem.image_url || formData.image_url, type: 'producto' } });
        }, 100);
      }
    } catch (err) {
      toast.error(editingProduct ? 'Error al actualizar' : 'Error al crear');
    } finally {
      setIsSaving(false);
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

  const handleConfirmToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      const newStatus = toggleTarget.status === 'active' ? 'inactive' : 'active';
      const updated = await productClient.update(toggleTarget.id, { status: newStatus });
      
      setProducts(products.map(p => p.id === toggleTarget.id ? updated : p));
      toast.success(newStatus === 'active' ? 'Producto reactivado.' : 'Producto desactivado.');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cambiar el estado del producto.');
    } finally {
      setToggling(false);
      setToggleTarget(null);
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
      store_location_id: '',
    });
    setEditingProduct(null);
    setShareOnSave([]);
    setMediaError(null);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category_id: product.category_id || '',
      price: product.price,
      stock: product.stock,
      status: product.status,
      description: product.description || '',
      store_location_id: product.store_location_id || '',
    });
    setIsModalOpen(true);
  };

  const statusBadge = (s) => {
    const cls = { active: 'badge-success', inactive: 'badge-neutral', out_of_stock: 'badge-danger' };
    return <span className={`badge badge-dot ${cls[s] || 'badge-neutral'}`}>{APP_CONFIG.PRODUCT_STATUS_LABELS[s]}</span>;
  };

  const columns = [
    { key: 'name', label: 'Producto', sortable: true, width: '180px' },
    ...(isClient ? [
      { key: 'seller_name', label: 'Vendedor', sortable: true, width: '150px' },
      { key: 'seller_city', label: 'Ciudad', sortable: true, width: '120px' },
      { key: 'store_name', label: 'Tienda', sortable: true, width: '120px' },
    ] : []),
    { key: 'category', label: 'Categoría', sortable: true, width: '150px' },
    { key: 'price', label: 'Precio', sortable: true, width: '120px', render: (v) => Helpers.formatCurrency(v) },
    { key: 'stock', label: 'Stock', sortable: true, width: '90px' },
    { key: 'status', label: 'Estado', sortable: true, width: '110px', render: (v) => statusBadge(v) }
  ].flat();

  const tableActions = (row) => (
    <div className="d-flex gap-2">
      {canManage && (
        <>
          <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => openEditModal(row)} title="Editar">
            <PencilIcon />
          </button>
          <button 
            className={`btn btn-ghost btn-sm btn-icon-only ${row.status === 'active' ? 'text-danger' : 'text-success'}`} 
            onClick={() => setToggleTarget(row)}
            title={row.status === 'active' ? 'Desactivar' : 'Activar'}
          >
            <Power width="14" height="14" />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => setShareModal({ isOpen: true, item: row })} title="Compartir">
            <ShareIcon />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon-only" style={{ color: 'var(--danger)' }} onClick={() => { setDeletingId(row.id); setIsConfirmOpen(true); }}>
            <TrashIcon />
          </button>
        </>
      )}
      {isClient && (
        <>
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/agenda?seller_id=${row.user_id}`)}>
            <Calendar width="14" height="14" />
            Ver Agenda
          </button>
          <button className="btn btn-primary btn-sm">
            <CartIcon />
            Añadir
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <Package width="20" height="20" className="page-title-icon" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }} />
          <h2 className="page-title" style={{ display: 'inline-block', verticalAlign: 'middle' }}>Productos</h2>
          <p className="page-description">Gestiona tu inventario de productos</p>
        </div>
        <div className="page-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={() => { setEditingProduct(null); setFormData({ name: '', category_id: '', price: 0, stock: 0, status: 'active', description: '', store_location_id: '' }); setIsModalOpen(true); }}>
              <Plus width="18" height="18" />
              Nuevo Producto
            </button>
          )}
        </div>
      </div>

      <div className="products-toolbar">
        <div className="products-filters">
          {isClient && (
            <select
              className="form-select"
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
              style={{ width: 'auto', padding: 'var(--space-2) var(--space-4)' }}
            >
              <option value="">Todos los vendedores</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          )}
          <Dropdown
            options={categoryOptions}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
          <Dropdown
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
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
        <div className="products-table-wrapper">
          <Table
            columns={columns}
            data={filteredProducts}
            actions={tableActions}
          />
        </div>
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
            compressing={compressing}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', alignItems: 'end' }}>
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
            <button type="button" className="btn btn-outline" onClick={resetForm}>Cancelar</button>
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
        <div style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>¿Estás seguro de que deseas eliminar este producto permanentemente? Esta acción no se puede deshacer.</div>
      </Modal>

      <ConfirmModal
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleConfirmToggle}
        title={toggleTarget?.status === 'active' ? '¿Desactivar este producto?' : '¿Reactivar este producto?'}
        confirmText={toggleTarget?.status === 'active' ? 'Sí, Desactivar' : 'Sí, Reactivar'}
        isDanger={toggleTarget?.status === 'active'}
        loading={toggling}
      >
        {toggleTarget?.status === 'active' ? (
          <>¿Está seguro de que desea desactivar <strong>{toggleTarget?.name}</strong>? Este producto ya no aparecerá disponible para ser añadido al carrito.</>
        ) : (
          <>¿Está seguro de que desea reactivar <strong>{toggleTarget?.name}</strong>? Este producto volverá a estar disponible.</>
        )}
      </ConfirmModal>

      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ isOpen: false, item: null })}
        item={shareModal.item}
        onPublish={() => toast.success('¡Publicado exitosamente en redes sociales!')}
      />
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

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}