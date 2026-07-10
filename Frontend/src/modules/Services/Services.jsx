import React, { useState, useEffect } from 'react';
import { Plus, CalendarPlus, List, Grid3X3 } from 'lucide-react';
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
import { serviceClient, categoryClient, ApiError } from '../../utils/apiClient';
import ShareModal from '../../components/ShareModal';
import CategorySelect from '../../components/ui/CategorySelect';

const { ADMIN, SELLER, CLIENT } = APP_CONFIG.ROLES;

export default function Services() {
  const { currentUser } = useStore();
  const userRole = currentUser?.role;
  const canManage = userRole === ADMIN || userRole === SELLER;

  const [view, setView] = useState('table');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [categories, setCategories] = useState([]);
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

  useEffect(() => {
    loadServices();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await categoryClient.list('service');
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

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

  const columns = [
    { key: 'name', label: 'Servicio', sortable: true },
    { key: 'category', label: 'Categoría', sortable: true },
    { key: 'price', label: 'Precio', sortable: true, render: (v) => Helpers.formatCurrency(v) },
    { key: 'duration', label: 'Duración', sortable: true },
    { key: 'status', label: 'Estado', sortable: true, render: (v) => statusBadge(v) }
  ];

  const statusBadge = (status) => {
    switch (status) {
      case 'active': return <span className="status-badge active">● Activo</span>;
      case 'inactive': return <span className="status-badge inactive">● Inactivo</span>;
      default: return <span className="status-badge">● {status}</span>;
    }
  };

  const tableActions = (row) => (
    <div className="d-flex gap-2">
      {canManage && (
        <>
          <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => openEditModal(row)} title="Editar">
            <PencilIcon />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => setShareModal({ isOpen: true, item: row })} title="Compartir">
            <ShareIcon />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon-only" style={{ color: 'var(--danger)' }} onClick={() => { setDeletingId(row.id); setIsConfirmOpen(true); }} title="Eliminar">
            <TrashIcon />
          </button>
        </>
      )}
      {userRole === CLIENT && (
        <button className="btn btn-primary btn-sm" onClick={() => toast.success(`Cita para ${row.name} solicitada`)}>
          <CalendarPlus width="14" height="14" />
          Agendar
        </button>
      )}
    </div>
  );

  const enrichedServices = services.map(s => ({
    ...s,
    category: categories.find(c => c.id === s.category_id)?.name || ''
  }));

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
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
          {enrichedServices.map(s => {
            return (
              <MediaCard
                key={s.id}
                item={s}
                variant="service"
                canManage={canManage}
                onEdit={openEditModal}
                onDelete={(item) => { setDeletingId(item.id); setIsConfirmOpen(true); }}
                onAction={(service) => toast.success(`Cita para ${service.name} solicitada`)}
                onShare={(item) => setShareModal({ isOpen: true, item })}
                actionLabel="Agendar"
                actionIcon={CalendarPlus}
              />
            );
          })}
        </div>
      ) : (
        <Table
          columns={columns}
          data={enrichedServices}
          actions={tableActions}
        />
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <CategorySelect
                value={formData.category_id}
                onChange={(val) => setFormData({ ...formData, category_id: val })}
                entityType="service"
                categories={categories}
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
            <label className="form-label">Descripción</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
            />
          </div>

          <div className="share-on-save">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Publicar al guardar (opcional)</label>
              <label className="share-checkbox-label" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={shareOnSave.facebook && shareOnSave.instagram && shareOnSave.tiktok}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShareOnSave({ facebook: checked, instagram: checked, tiktok: checked });
                  }}
                  className="form-checkbox"
                />
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Seleccionar todas</span>
              </label>
            </div>
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
                ? Object.values(shareOnSave).some(Boolean) ? 'Guardar y publicar' : 'Guardar'
                : Object.values(shareOnSave).some(Boolean) ? 'Crear y publicar' : 'Crear'}
            </button>
          </div>
        </form>
      </Drawer>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Eliminar Servicio"
        size="sm"
        actions={[
          { label: 'Cancelar', onClick: () => setIsConfirmOpen(false) },
          { label: 'Confirmar', className: 'btn-danger', onClick: handleDelete }
        ]}
      >
        <div style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>¿Estás seguro de que deseas eliminar este servicio?</div>
      </Modal>

      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ isOpen: false, item: null })}
        item={shareModal.item}
        onPublish={() => toast.success('¡Publicado exitosamente en redes sociales!')}
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
          accent-color: var(--purple);
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