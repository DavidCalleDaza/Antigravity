import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, List, Grid3X3, CalendarPlus, Wrench, WrenchIcon, Power } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import Helpers from '../../utils/helpers';
import Table from '../../components/ui/Table';
import Drawer from '../../components/ui/Drawer';
import MediaCard from '../../components/ui/MediaCard';
import { MediaCardSkeleton } from '../../components/ui/ItemCardSkeleton';
import MediaUploader from '../../components/ui/MediaUploader';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useToast } from '../../components/ui/Toast';
import { useStore } from '../../store/useStore';
import { serviceClient, categoryClient, ApiError } from '../../utils/apiClient';
import ShareModal from '../../components/ShareModal';
import CategorySelect from '../../components/ui/CategorySelect';
import Dropdown from '../../components/ui/Dropdown';
import ConfirmModal from '../../components/ui/ConfirmModal';

const { ADMIN, SELLER, CLIENT } = APP_CONFIG.ROLES;

const SERVICE_STATUS_LABELS = {
  active: 'Activo',
  inactive: 'Inactivo',
};

// ─── Sub-componente de Confirmación Estilo Estándar ───────────────────────────

export default function Services() {
  const { currentUser } = useStore();
  const userRole = currentUser?.role;
  const canManage = userRole === ADMIN || userRole === SELLER;

  const [view, setView] = useState('grid');
  const [services, setServices] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  
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
  });
  const [mediaError, setMediaError] = useState(null);
  const [shareOnSave, setShareOnSave] = useState({ facebook: false, instagram: false, tiktok: false });
  const [shareModal, setShareModal] = useState({ isOpen: false, item: null });

  const toast = useToast();

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
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await serviceClient.list();
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

  const loadCategories = async () => {
    try {
      const data = await categoryClient.list('service');
      setDbCategories(data);
    } catch (err) {}
  };

  const filteredServices = useMemo(() => {
    return services
      .filter(s => {
        if (categoryFilter && s.category_id !== categoryFilter) return false;
        if (statusFilter && s.status !== statusFilter) return false;
        return true;
      })
      .map(s => ({
        ...s,
        category: s.category?.name || dbCategories.find(c => c.id === s.category_id)?.name || 'Sin categoría'
      }));
  }, [services, categoryFilter, statusFilter, dbCategories]);

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
    try {
      const payload = {
        name: formData.name,
        price: formData.price,
        status: formData.status,
        description: String(formData.description || ''),
        duration: String(formData.duration || ''),
        category_id: formData.category_id === '' ? null : formData.category_id,
      };

      if (formData.image_url) payload.image_url = formData.image_url;
      if (formData.video_url) payload.video_url = formData.video_url;

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

      const hasShareSelected = Object.values(shareOnSave).some(Boolean);
      resetForm();
      if (hasShareSelected) {
        setTimeout(() => {
          setShareModal({ isOpen: true, item: { ...savedItem, type: 'servicio' } });
        }, 100);
      }
    } catch (err) {
      toast.error('Error al guardar el servicio.');
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
    });
    setShareOnSave({ facebook: false, instagram: false, tiktok: false });
    reset();
    setMediaError(null);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      category_id: service.category_id || '',
      price: service.price,
      duration: service.duration || '',
      status: service.status,
      description: service.description || '',
      image_url: service.image_url || null,
      video_url: service.video_url || null,
    });
    setIsModalOpen(true);
  };

  const statusBadge = (s) => {
    const cls = { active: 'badge-success', inactive: 'badge-neutral' };
    return <span className={`badge badge-dot ${cls[s] || 'badge-neutral'}`}>{SERVICE_STATUS_LABELS[s] || s}</span>;
  };

  const columns = [
    { key: 'name', label: 'Servicio', sortable: true },
    { key: 'category', label: 'Categoría', sortable: true },
    { key: 'price', label: 'Precio', sortable: true, render: (v) => Helpers.formatCurrency(v) },
    { key: 'duration', label: 'Duración', sortable: true },
    { key: 'status', label: 'Estado', sortable: true, render: (v) => statusBadge(v) }
  ];

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
        </>
      )}
      {userRole === CLIENT && (
        <button className="btn btn-primary btn-sm">
          <CalendarPlus width="14" height="14" />
          Agendar
        </button>
      )}
    </div>
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <Wrench width="20" height="20" className="page-title-icon" />
          <h2 className="page-title">Servicios</h2>
          <p className="page-description">Gestiona los servicios que ofreces</p>
        </div>
        <div className="page-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={() => { setEditingService(null); setFormData({ name: '', category_id: '', price: 0, duration: '', status: 'active', description: '' }); setIsModalOpen(true); }}>
              <Plus width="18" height="18" />
              Nuevo Servicio
            </button>
          )}
        </div>
      </div>

      <div className="products-toolbar">
        <div className="products-filters">
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
          <div className="error-state-title">Error al cargar servicios</div>
          <div className="error-state-text">{error}</div>
          <button className="btn btn-primary" onClick={loadServices}>Reintentar</button>
        </div>
      ) : view === 'grid' ? (
        <div className="product-grid">
          {filteredServices.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon"><WrenchIcon width="48" height="48" /></div>
              <div className="empty-state-title">Sin servicios</div>
              <div className="empty-state-text">No hay servicios que coincidan con los filtros.</div>
            </div>
          ) : (
            filteredServices.map(s => (
              <MediaCard
                key={s.id}
                item={s}
                variant="service"
                canManage={canManage}
                onEdit={openEditModal}
                onDelete={(item) => setToggleTarget(item)} // Reutilizamos onDelete de MediaCard para abrir el toggle modal
                onAction={(service) => toast.success(`Cita para ${service.name} solicitada`)}
                onShare={(item) => setShareModal({ isOpen: true, item })}
                actionLabel="Agendar"
                actionIcon={CalendarPlus}
              />
            ))
          )}
        </div>
      ) : (
         <div className="services-table-wrapper">
          <Table
            columns={columns}
            data={filteredServices}
            actions={tableActions}
          />
        </div>
      )}

      <Drawer
        isOpen={isModalOpen}
        onClose={resetForm}
        position="right"
        title={editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
      >
        <form className="d-flex flex-col gap-5" onSubmit={handleSaveService}>
          <MediaUploader
            preview={preview || Helpers.resolveMediaUrl(editingService?.image_url)}
            uploading={uploading}
            progress={progress}
            onSelect={handleFileSelect}
            onClear={reset}
            error={mediaError}
          />

          <div className="form-group">
            <label className="form-label">Nombre <span className="required">*</span></label>
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
                entityType="service"
                categories={dbCategories}
                onCategoryCreated={loadCategories}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Precio</label>
              <input
                type="number"
                className="form-input"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                min="0"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Duración</label>
              <input
                type="text"
                className="form-input"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="30 min, 1 hora..."
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
              {editingService
                ? Object.values(shareOnSave).some(Boolean) ? 'Guardar y publicar' : 'Guardar Cambios'
                : Object.values(shareOnSave).some(Boolean) ? 'Crear y publicar' : 'Crear Servicio'}
            </button>
          </div>
        </form>
      </Drawer>

      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ isOpen: false, item: null })}
        item={shareModal.item}
      />

      {/* MODAL DE CONFIRMACIÓN MODERNO (Toggle de Estado) */}
        <ConfirmModal
          isOpen={!!toggleTarget}
          onClose={() => setToggleTarget(null)}
          onConfirm={handleConfirmToggle}
          title={toggleTarget?.status === 'active' ? '¿Desactivar este servicio?' : '¿Reactivar este servicio?'}
          confirmText={toggleTarget?.status === 'active' ? 'Sí, Desactivar' : 'Sí, Reactivar'}
          isDanger={toggleTarget?.status === 'active'}
          loading={toggling}
        >
          {toggleTarget?.status === 'active' ? (
            <>¿Está seguro de que desea desactivar <strong>{toggleTarget?.name}</strong>? Este servicio ya no aparecerá disponible para ser agendado.</>
          ) : (
            <>¿Está seguro de que desea reactivar <strong>{toggleTarget?.name}</strong>? Este servicio volverá a estar disponible.</>
          )}
        </ConfirmModal>
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