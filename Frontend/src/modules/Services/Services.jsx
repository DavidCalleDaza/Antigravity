import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Wrench, Loader2 } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { MediaCardSkeleton } from '../../components/ui/ItemCardSkeleton';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useToast } from '../../components/ui/Toast';
import { useStore } from '../../store/useStore';
import { serviceClient, categoryClient, agendaClient, socialClient, ApiError } from '../../utils/apiClient';
import ServicesToolbar from './components/ServicesToolbar';
import ServicesGrid from './components/ServicesGrid';
import ServicesTable from './components/ServicesTable';
import ServiceFormDrawer from './components/ServiceFormDrawer';
import ServiceModals from './components/ServiceModals';
import { filterServices } from './utils/serviceHelpers';

const { ADMIN, SELLER, CLIENT } = APP_CONFIG.ROLES;

export default function Services() {
  const { currentUser } = useStore();
  const userRole = currentUser?.role;
  const canManage = userRole === ADMIN || userRole === SELLER;
  const isAdmin = userRole === ADMIN;
  const isClient = userRole === 'client';
  const navigate = useNavigate();

  const [view, setView] = useState('grid');
  const [revealImages, setRevealImages] = useState(true);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  // Estados de Main (Borrado duro y filtros)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [dbCategories, setDbCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [storeLocations, setStoreLocations] = useState([]);

  // Estado para el control de activación/desactivación
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    price: 0,
    duration: '',
    status: 'active',
    description: '',
    store_location_id: '',
  });
  const [mediaError, setMediaError] = useState(null);
  const [shareOnSave, setShareOnSave] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [shareModal, setShareModal] = useState({ isOpen: false, item: null });
  const [isSaving, setIsSaving] = useState(false);

  const toast = useToast();
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

  const categoryOptions = [
    { value: '', label: 'Todas las categorías' },
    ...dbCategories.map(c => ({ value: c.id, label: c.name })),
  ];

  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' },
  ];

  useEffect(() => {
    loadServices();
    loadCategories();
    loadAccounts();
    if (isClient) {
      agendaClient.listSellers().then(setSellers).catch(() => {});
    } else {
      agendaClient.listStoreLocations().then(setStoreLocations).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isClient) loadServices();
  }, [sellerFilter]);

  const loadCategories = async () => {
    try {
      const data = await categoryClient.list('service');
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
 
  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (isClient && sellerFilter) params.seller_id = sellerFilter;
      const data = await serviceClient.list(params);
      setServices(data);
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

  const filteredServices = useMemo(() => {
    return filterServices(services, categoryFilter, statusFilter, dbCategories);
  }, [services, categoryFilter, statusFilter, dbCategories]);

  const isAllSelected = useMemo(() => {
    if (!filteredServices.length) return false;
    return filteredServices.every(s => selectedIds.includes(s.id));
  }, [filteredServices, selectedIds]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredServices.map(s => s.id));
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
        selectedIds.map(id => serviceClient.delete(id))
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (succeeded > 0) {
        toast.success(`${succeeded} servicio${succeeded > 1 ? 's' : ''} eliminado${succeeded > 1 ? 's' : ''} correctamente.`);
      }
      if (failed > 0) {
        toast.error(`No se pudieron eliminar ${failed} servicio${failed > 1 ? 's' : ''}.`);
      }

      setSelectedIds([]);
      setIsBulkConfirmOpen(false);
      loadServices();
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

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        price: formData.price,
        status: formData.status,
        description: String(formData.description || ''),
        // La duración se envía en minutos (Integer en el backend); null cuando no se define
        duration: formData.duration === '' ? null : Number(formData.duration),
        category_id: formData.category_id === '' ? null : formData.category_id,
        store_location_id: formData.store_location_id || null,
      };

      if (formData.image_url) payload.image_url = formData.image_url;
      if (formData.video_url) payload.video_url = formData.video_url;

      // Upload additional images first
      let extraUrls = [];
      if (formData.additionalImages && formData.additionalImages.length > 0) {
        const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';
        const token = useStore.getState().currentUser?.token;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const uploadPromises = formData.additionalImages.map(img => {
          const form = new FormData();
          form.append('file', img.blob, `service_gallery_${Date.now()}.png`);
          return fetch(`${API_BASE_URL}/uploads/media`, { method: 'POST', headers, body: form })
            .then(r => r.json())
            .then(data => data.url || null);
        });
        const uploaded = await Promise.all(uploadPromises);
        extraUrls = uploaded.filter(Boolean);
      }

      // Combine existing media_urls + extraUrls
      const existingMedia = formData.media_urls || [];
      const primary = formData.image_url || (editingService ? editingService.image_url : null);
      
      const allUrlsSet = new Set();
      if (primary) allUrlsSet.add(primary);
      existingMedia.forEach(url => allUrlsSet.add(url));
      extraUrls.forEach(url => allUrlsSet.add(url));

      const allUrls = Array.from(allUrlsSet);
      if (allUrls.length > 0) {
        payload.media_urls = allUrls;
      }

      let savedItem;
      if (editingService) {
        savedItem = await serviceClient.update(editingService.id, payload);
        setServices(services.map(s => s.id === editingService.id ? savedItem : s));
        toast.success('Servicio actualizado correctamente.');
      } else {
        savedItem = await serviceClient.create(payload);
        setServices([savedItem, ...services]);
        toast.success('Servicio creado exitosamente.');
      }

      const hasShareSelected = shareOnSave.length > 0;
      resetForm();
      if (hasShareSelected) {
        setTimeout(() => {
          setShareModal({ isOpen: true, item: { ...savedItem, imageUrl: savedItem.image_url || formData.image_url, type: 'servicio' } });
        }, 100);
      }
    } catch (err) {
      console.error("Error detallado al guardar el servicio:", err);

      const isApiError = err && (err.name === 'ApiError' || typeof err.status === 'number');

      if (isApiError) {
        if (err.status === 422) {
          const validationErrors = err.data?.detail;
          if (Array.isArray(validationErrors)) {
            const errorMessages = validationErrors.map(error => {
              const field = error.loc[error.loc.length - 1];
              return `"${field}": ${error.msg}`;
            }).join(', ');
            toast.error(`Error de validación en: ${errorMessages}`);
          } else {
            toast.error(err.message || 'Datos no procesables por el servidor.');
          }
        } else {
          toast.error(err.message || `Error del servidor (Código ${err.status})`);
        }
      } else {
        if (err instanceof TypeError && err.message?.includes('fetch')) {
          toast.error('No se pudo conectar con el servidor. ¿Está encendido el backend?');
        } else {
          toast.error('Error de conexión o fallo inesperado.');
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await serviceClient.delete(deletingId);
      setServices(services.filter(s => s.id !== deletingId));
      toast.success('Servicio eliminado.');
    } catch (err) {
      toast.error('Error al eliminar');
    } finally {
      setIsConfirmOpen(false);
      setDeletingId(null);
    }
  };

  // Función para activar o desactivar el servicio en base de datos
  const handleConfirmToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      const newStatus = toggleTarget.status === 'active' ? 'inactive' : 'active';
      const updated = await serviceClient.update(toggleTarget.id, { status: newStatus });
      
      setServices(services.map(s => s.id === toggleTarget.id ? updated : s));
      toast.success(newStatus === 'active' ? 'Servicio activado.' : 'Servicio desactivado.');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cambiar el estado del servicio.');
    } finally {
      setToggling(false);
      setToggleTarget(null);
    }
  };

  const resetForm = () => {
    setIsModalOpen(false);
    setEditingService(null);
    setFormData({
      name: '',
      category_id: '',
      price: 0,
      duration: '',
      status: 'active',
      description: '',
      image_url: '',
      video_url: '',
      store_location_id: '',
      additionalImages: [],
      media_urls: [],
    });
    setEditingService(null);
    reset();
    setMediaError(null);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name || '',
      category_id: service.category_id || '',
      price: service.price ?? 0,
      duration: service.duration != null ? String(service.duration) : '',
      status: service.status || 'active',
      description: service.description || '',
      image_url: service.image_url || null,
      video_url: service.video_url || null,
      store_location_id: service.store_location_id || '',
      additionalImages: [],
      media_urls: service.media_urls || [],
    });
    setIsModalOpen(true);
  };

  const handleDeleteRequest = (item) => {
    setDeletingId(item.id);
    setIsConfirmOpen(true);
  };



  const handleOpenNew = () => {
    setEditingService(null);
    setFormData({ 
      name: '', category_id: '', price: 0, duration: '', status: 'active', 
      description: '', image_url: '', video_url: '', store_location_id: '',
      additionalImages: [], media_urls: [] 
    });
    setIsModalOpen(true);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <Wrench width="20" height="20" className="page-title-icon" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }} />
          <h2 className="page-title" style={{ display: 'inline-block', verticalAlign: 'middle' }}>Servicios</h2>
          <p className="page-description">Gestiona los servicios que ofreces</p>
        </div>
        <div className="page-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={handleOpenNew}>
              <Plus width="18" height="18" />
              Nuevo Servicio
            </button>
          )}
        </div>
      </div>

      <ServicesToolbar
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
        hasItems={filteredServices.length > 0}
      />

      {loading ? (
        <MediaCardSkeleton count={6} />
      ) : error ? (
        <div className="error-state">
          <div className="error-state-icon">⚠️</div>
          <div className="error-state-title">Error al cargar servicios</div>
          <div className="error-state-text">{error}</div>
          <button className="btn btn-primary" onClick={loadServices}>Reintentar</button>
        </div>
      ) : view === 'grid' ? (
        <ServicesGrid
          filteredServices={filteredServices}
          canManage={canManage}
          isAdmin={isAdmin}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          openEditModal={openEditModal}
          onDeleteRequest={handleDeleteRequest}
          navigate={navigate}
          revealImages={revealImages}
        />
      ) : (
        <ServicesTable
          filteredServices={filteredServices}
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
          revealImages={revealImages}
        />
      )}

      <ServiceFormDrawer
        isOpen={isModalOpen}
        onClose={resetForm}
        editingService={editingService}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSaveService}
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

      <ServiceModals
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
          setServices((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
          loadServices();
        }}
      />
    </div>
  );
}
