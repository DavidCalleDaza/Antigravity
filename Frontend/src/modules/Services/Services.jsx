import React, { useState, useEffect } from 'react';
import { Plus, CalendarPlus } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import Helpers from '../../utils/helpers';
import Modal from '../../components/ui/Modal';
import Drawer from '../../components/ui/Drawer';
import MediaCard from '../../components/ui/MediaCard';
import { MediaCardSkeleton } from '../../components/ui/ItemCardSkeleton';
import MediaUploader from '../../components/ui/MediaUploader';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useToast } from '../../components/ui/Toast';
import { useStore } from '../../store/useStore';
import { serviceClient, ApiError } from '../../utils/apiClient';
import ShareModal from '../../components/ShareModal';

const { ADMIN, SELLER, CLIENT } = APP_CONFIG.ROLES;

export default function Services() {
  const { currentUser } = useStore();
  const userRole = currentUser?.role;
  const canManage = userRole === ADMIN || userRole === SELLER;

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: APP_CONFIG.CATEGORIES[0],
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
      const payload = { ...formData };
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
      toast.error(editingService ? 'Error al actualizar' : 'Error al crear');
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
      category: APP_CONFIG.CATEGORIES[0],
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
      category: service.category,
      price: service.price,
      duration: service.duration || '',
      status: service.status,
      description: service.description || '',
    });
    setIsModalOpen(true);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Servicios</h2>
          <p className="page-description">Gestiona los servicios que ofreces</p>
        </div>
        <div className="page-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={() => { setEditingService(null); setFormData({ name: '', category: APP_CONFIG.CATEGORIES[0], price: 0, duration: '', status: 'active', description: '' }); setIsModalOpen(true); }}>
              <Plus width="18" height="18" />
              Nuevo Servicio
            </button>
          )}
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
      ) : (
        <div className="product-grid">
          {services.map(s => (
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
          ))}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select
                className="form-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {APP_CONFIG.CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
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
        <p style={{ color: 'var(--text-secondary)' }}>¿Estás seguro de que deseas eliminar este servicio?</p>
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
          accent-color: var(--purple);
        }
      `}</style>
    </div>
  );
}