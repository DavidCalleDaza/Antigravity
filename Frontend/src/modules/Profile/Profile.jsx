import { useState, useRef, useEffect } from 'react';
import { Camera, User, Mail, Shield, AlertTriangle } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { useStore } from '../../store/useStore';
import { authClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import Helpers from '../../utils/helpers';
import Modal from '../../components/ui/Modal';
import ImageCropperModal from '../../components/ui/ImageCropperModal';

const { ADMIN, SELLER, CLIENT } = APP_CONFIG.ROLES;
const ROLE_OPTIONS = Object.entries(APP_CONFIG.ROLES).map(([key, value]) => ({
  value,
  label: APP_CONFIG.ROLE_LABELS[value],
}));

export default function Profile() {
  const { currentUser, setCurrentUser, logout } = useStore();
  const toast = useToast();
  const userRole = currentUser?.role;

  const [formData, setFormData] = useState({
    full_name: currentUser?.name || '',
    email: currentUser?.email || '',
  });
  const [loading, setLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (currentUser?.avatar) {
      setPreviewUrl(Helpers.resolveMediaUrl(currentUser.avatar));
    } else {
      setPreviewUrl(null);
    }
  }, [currentUser?.avatar]);

  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        full_name: currentUser.name || '',
        email: currentUser.email || '',
      }));
    }
  }, [currentUser]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authClient.updateMe({
        full_name: formData.full_name,
        email: formData.email,
      });
      setCurrentUser({
        ...currentUser,
        name: response.full_name,
        email: response.email,
        avatar: response.avatar_url,
      });
      toast.success('Perfil actualizado correctamente.', 'Éxito');
    } catch (error) {
      toast.error(error.message || 'No se pudo actualizar el perfil.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido. Usa JPG, PNG, GIF o WEBP.', 'Error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo excede el tamaño máximo de 2MB.', 'Error');
      return;
    }

    setSelectedImage(file);
    setCropModalOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedFile) => {
    try {
      const response = await authClient.uploadAvatar(croppedFile);
      const latestUser = useStore.getState().currentUser;
      const updatedUser = {
        ...latestUser,
        avatar: response.avatar_url,
      };
      setCurrentUser(updatedUser);
      toast.success('Foto de perfil actualizada.', 'Éxito');
    } catch (error) {
      toast.error(error.message || 'No se pudo subir la imagen.', 'Error');
    }
  };

  const handleCropClose = () => {
    setCropModalOpen(false);
    setSelectedImage(null);
  };

  const handleDeleteClick = (permanent) => {
    setDeleteAction(permanent ? 'permanent' : 'deactivate');
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsConfirmOpen(false);
    setLoading(true);
    try {
      await authClient.deleteAccount(deleteAction === 'permanent');
      toast.success(
        deleteAction === 'permanent'
          ? 'Cuenta eliminada permanentemente.'
          : 'Cuenta desactivada.',
        deleteAction === 'permanent' ? 'Cuenta eliminada' : 'Cuenta desactivada'
      );
      logout();
    } catch (error) {
      toast.error(error.message || 'No se pudo procesar la solicitud.', 'Error');
    } finally {
      setLoading(false);
      setDeleteAction(null);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Configuración de Cuenta</h2>
          <p className="page-description">Gestiona tu información personal y preferencias</p>
        </div>
      </div>

      <div className="profile-layout">
        <div className="profile-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar-wrapper" onClick={handleAvatarClick} title="Clic para cambiar foto">
              <div className="avatar avatar-xl">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={currentUser?.name}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span style={{ display: previewUrl ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: 'inherit' }}>
                  {(currentUser?.name || 'U').substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="avatar-overlay">
                <Camera width="24" height="24" />
                <span>Cambiar</span>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
            <div className="profile-avatar-info">
              <h3 className="profile-name">{currentUser?.name}</h3>
              <span className="badge badge-primary">{APP_CONFIG.ROLE_LABELS[userRole]}</span>
            </div>
          </div>
        </div>

        <div className="profile-card">
          <h3 className="card-title">Información Personal</h3>
          <form className="d-flex flex-col gap-5" onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label" htmlFor="full_name">
                <User width="16" height="16" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Nombre completo
              </label>
              <input
                type="text"
                className="form-input"
                id="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                minLength={2}
                maxLength={150}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                <Mail width="16" height="16" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Correo electrónico
              </label>
              <input
                type="email"
                className="form-input"
                id="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="role">
                <Shield width="16" height="16" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Rol de cuenta
              </label>
              <select
                className="form-select"
                id="role"
                value={userRole || ''}
                disabled
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>

        <div className="profile-card danger-zone">
          <h3 className="card-title danger-title">
            <AlertTriangle width="20" height="20" />
            Zona de Peligro
          </h3>
          <p className="danger-description">
            Estas acciones son irreversibles. Por favor, actúa con precaución.
          </p>
          <div className="danger-actions">
            <div className="danger-item">
              <div>
                <div className="danger-item-title">Desactivar cuenta</div>
                <div className="danger-item-desc">Tu cuenta quedará inactiva. Podrás recuperarla contactando a un administrador.</div>
              </div>
              <button
                className="btn btn-outline"
                onClick={() => handleDeleteClick(false)}
                disabled={loading}
              >
                Desactivar
              </button>
            </div>
            <div className="danger-item">
              <div>
                <div className="danger-item-title">Eliminar cuenta permanentemente</div>
                <div className="danger-item-desc">Elimina tu cuenta y todos los datos asociados de forma permanente.</div>
              </div>
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteClick(true)}
                disabled={loading}
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={deleteAction === 'permanent' ? 'Eliminar Cuenta' : 'Desactivar Cuenta'}
        size="sm"
        actions={[
          { label: 'Cancelar', onClick: () => setIsConfirmOpen(false) },
          {
            label: deleteAction === 'permanent' ? 'Eliminar Permanentemente' : 'Desactivar',
            className: deleteAction === 'permanent' ? 'btn-danger' : 'btn-outline',
            onClick: handleConfirmDelete,
          },
        ]}
      >
        <p style={{ color: 'var(--text-secondary)' }}>
          {deleteAction === 'permanent'
            ? '¿Estás seguro de que deseas eliminar tu cuenta permanentemente? Esta acción no se puede deshacer.'
            : '¿Estás seguro de que deseas desactivar tu cuenta? Podrás recuperarla contactando a un administrador.'}
        </p>
      </Modal>

      <ImageCropperModal
        isOpen={cropModalOpen}
        onClose={handleCropClose}
        imageFile={selectedImage}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
