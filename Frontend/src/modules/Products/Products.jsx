import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const isAdmin = userRole === ADMIN;
  const isClient = userRole === CLIENT;
  const navigate = useNavigate();

  const [view, setView] = useState('grid');
  const [revealImages, setRevealImages] = useState(false);
  const [products, setProducts] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [storeLocations, setStoreLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

  const promotingItemRef = useRef(null);

  const { upload, uploading, compressing, progress, preview, reset, validateFile } = useFileUpload({
    onSuccess: (data) => {
      const promoted = promotingItemRef.current;
      if (promoted) {
        setFormData(prev => {
          const prevMain = prev.image_url;
          const newMediaUrls = prev.media_urls ? [...prev.media_urls] : [];
          if (prevMain && !newMediaUrls.includes(prevMain)) {
            newMediaUrls.unshift(prevMain);
          }
          const newAdditional = (prev.additionalImages || []).filter((_, i) => i !== promoted.index);
          if (promoted.previewUrl) {
            URL.revokeObjectURL(promoted.previewUrl);
          }
          return {
            ...prev,
            image_url: data.url,
            media_urls: newMediaUrls,
            additionalImages: newAdditional,
          };
        });
        promotingItemRef.current = null;
        toast.success('Imagen promovida a principal');
      } else {
        setFormData(prev => ({ ...prev, image_url: data.url, video_url: data.type === 'video' ? data.url : prev.video_url }));
        toast.success('Media subido correctamente');
      }
    },
    onError: (err) => {
      promotingItemRef.current = null;
      setMediaError(err);
      toast.error(err);
    },
  });

  const handlePromoteNewImage = (index) => {
    const item = formData.additionalImages?.[index];
    if (!item || !item.blob) return;
    promotingItemRef.current = { index, previewUrl: item.previewUrl };
    upload(item.blob);
  };

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

  const isAllSelected = useMemo(() => {
    if (!filteredProducts.length) return false;
    return filteredProducts.every(p => selectedIds.includes(p.id));
  }, [filteredProducts, selectedIds]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length || isBulkDeleting) return;
    setIsBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map(id => productClient.delete(id))
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (succeeded > 0) {
        toast.success(`${succeeded} producto${succeeded > 1 ? 's' : ''} eliminado${succeeded > 1 ? 's' : ''} correctamente.`);
      }
      if (failed > 0) {
        toast.error(`No se pudieron eliminar ${failed} producto${failed > 1 ? 's' : ''}.`);
      }

      setSelectedIds([]);
      setIsBulkConfirmOpen(false);
      loadProducts();
    } catch (err) {
      toast.error('Error al realizar la eliminación masiva.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

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

      // Upload additional images first
      let extraUrls = [];
      if (formData.additionalImages && formData.additionalImages.length > 0) {
        const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';
        const token = useStore.getState().currentUser?.token;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const uploadPromises = formData.additionalImages.map(img => {
          const form = new FormData();
          form.append('file', img.blob, `product_gallery_${Date.now()}.png`);
          return fetch(`${API_BASE_URL}/uploads/media`, { method: 'POST', headers, body: form })
            .then(r => r.json())
            .then(data => data.url || null);
        });
        const uploaded = await Promise.all(uploadPromises);
        extraUrls = uploaded.filter(Boolean);
      }

      // Combine existing media_urls + extraUrls
      // If there's an image_url or formData.image_url, it should be the first element,
      // but only if we rely on the backend inferring it, or we explicitly build it.
      const existingMedia = formData.media_urls || [];
      const primary = formData.image_url || (editingProduct ? editingProduct.image_url : null);
      
      const allUrlsSet = new Set();
      if (primary) allUrlsSet.add(primary);
      existingMedia.forEach(url => allUrlsSet.add(url));
      extraUrls.forEach(url => allUrlsSet.add(url));

      const allUrls = Array.from(allUrlsSet);
      if (allUrls.length > 0) {
        payload.media_urls = allUrls;
      }
      
      delete payload.additionalImages; // don't send to backend
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
      additionalImages: [],
      media_urls: [],
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
      additionalImages: [],
      media_urls: product.media_urls || [],
    });
    setIsModalOpen(true);
  };

  const handleDeleteRequest = (item) => {
    setDeletingId(item.id);
    setIsConfirmOpen(true);
  };



  const handleOpenNew = () => {
    setEditingProduct(null);
    setFormData({ name: '', category_id: '', price: 0, stock: 0, status: 'active', description: '', store_location_id: '', additionalImages: [], media_urls: [] });
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
        isAdmin={isAdmin}
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
        revealImages={revealImages}
        setRevealImages={setRevealImages}
        isAllSelected={isAllSelected}
        onSelectAll={handleSelectAll}
        selectedCount={selectedIds.length}
        onBulkDeleteClick={() => setIsBulkConfirmOpen(true)}
        hasItems={filteredProducts.length > 0}
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
          isAdmin={isAdmin}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          openEditModal={openEditModal}
          onDeleteRequest={handleDeleteRequest}
          toast={toast}
          revealImages={revealImages}
        />
      ) : (
        <ProductsTable
          filteredProducts={filteredProducts}
          isClient={isClient}
          canManage={canManage}
          isAdmin={isAdmin}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          isAllSelected={isAllSelected}
          openEditModal={openEditModal}
          onToggleRequest={setToggleTarget}
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
        onPromoteNewImage={handlePromoteNewImage}
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
        isBulkConfirmOpen={isBulkConfirmOpen}
        setIsBulkConfirmOpen={setIsBulkConfirmOpen}
        selectedCount={selectedIds.length}
        onBulkDelete={handleBulkDelete}
        isBulkDeleting={isBulkDeleting}
        toggleTarget={toggleTarget}
        setToggleTarget={setToggleTarget}
        onConfirmToggle={handleConfirmToggle}
        toggling={toggling}
        shareModal={shareModal}
        setShareModal={setShareModal}
        onPublish={() => toast.success('¡Publicado exitosamente en redes sociales!')}
        view={view}
        setView={setView}
        dbCategories={dbCategories}
        onCategoryCreated={loadCategories}
        onItemUpdated={(updated) => {
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
          loadProducts();
        }}
      />
    </div>
  );
}
