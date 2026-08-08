import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Package, Loader2 } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { MediaCardSkeleton } from '../../components/ui/ItemCardSkeleton';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useToast } from '../../components/ui/Toast';
import { useStore } from '../../store/useStore';
import { productClient, categoryClient, agendaClient, socialClient, ApiError } from '../../utils/apiClient';
import ProductsToolbar from './components/ProductsToolbar';
import ProductsGrid from './components/ProductsGrid';
import ProductsTable from './components/ProductsTable';
import ProductFormDrawer from './components/ProductFormDrawer';
import ProductModals from './components/ProductModals';
import { filterProducts } from './utils/productHelpers';

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
    return filterProducts(products, categoryFilter, statusFilter, dbCategories);
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

  const handleDeleteRequest = (item) => {
    setDeletingId(item.id);
    setIsConfirmOpen(true);
  };

  const handleOpenNew = () => {
    setEditingProduct(null);
    setFormData({ name: '', category_id: '', price: 0, stock: 0, status: 'active', description: '', store_location_id: '' });
    setIsModalOpen(true);
  };

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
            <button className="btn btn-primary" onClick={handleOpenNew}>
              <Plus width="18" height="18" />
              Nuevo Producto
            </button>
          )}
        </div>
      </div>

      <ProductsToolbar
        isClient={isClient}
        sellerFilter={sellerFilter}
        setSellerFilter={setSellerFilter}
        sellers={sellers}
        categoryOptions={categoryOptions}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        statusOptions={statusOptions}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        view={view}
        setView={setView}
      />

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
        <ProductsGrid
          filteredProducts={filteredProducts}
          canManage={canManage}
          openEditModal={openEditModal}
          onDeleteRequest={handleDeleteRequest}
          onShare={(item) => setShareModal({ isOpen: true, item })}
          toast={toast}
        />
      ) : (
        <ProductsTable
          filteredProducts={filteredProducts}
          isClient={isClient}
          canManage={canManage}
          openEditModal={openEditModal}
          onToggleRequest={setToggleTarget}
          onShare={(item) => setShareModal({ isOpen: true, item })}
          onDeleteRequest={handleDeleteRequest}
          navigate={navigate}
        />
      )}

      <ProductFormDrawer
        isOpen={isModalOpen}
        onClose={resetForm}
        editingProduct={editingProduct}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSaveProduct}
        isSaving={isSaving}
        preview={preview}
        uploading={uploading}
        compressing={compressing}
        progress={progress}
        onFileSelect={handleFileSelect}
        onMediaClear={reset}
        mediaError={mediaError}
        dbCategories={dbCategories}
        onCategoryCreated={loadCategories}
        storeLocations={storeLocations}
        accounts={accounts}
        shareOnSave={shareOnSave}
        setShareOnSave={setShareOnSave}
      />

      <ProductModals
        isConfirmOpen={isConfirmOpen}
        setIsConfirmOpen={setIsConfirmOpen}
        onDelete={handleDelete}
        toggleTarget={toggleTarget}
        setToggleTarget={setToggleTarget}
        onConfirmToggle={handleConfirmToggle}
        toggling={toggling}
        shareModal={shareModal}
        setShareModal={setShareModal}
        onPublish={() => toast.success('¡Publicado exitosamente en redes sociales!')}
      />
    </div>
  );
}
