import { useState, useRef, useEffect } from 'react';
import { Camera, User, Mail, Shield, AlertTriangle, Share2, MapPin, Map, Home, Compass, Navigation } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { useStore } from '../../store/useStore';
import { authClient, locationClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import Helpers from '../../utils/helpers';
import Modal from '../../components/ui/Modal';
import ImageCropperModal from '../../components/ui/ImageCropperModal';
import SocialSettings from './SocialSettings';
import LocationSelects from '../../components/ui/LocationSelects';

const { ADMIN, SELLER, CLIENT } = APP_CONFIG.ROLES;
const ROLE_OPTIONS = Object.entries(APP_CONFIG.ROLES).map(([key, value]) => ({
  value,
  label: APP_CONFIG.ROLE_LABELS[value],
}));

export default function Profile() {
  const { currentUser, setCurrentUser, logout } = useStore();
  const toast = useToast();
  const userRole = currentUser?.role;
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'social'

  const [formData, setFormData] = useState({
    full_name: currentUser?.name || '',
    email: currentUser?.email || '',
    country: currentUser?.country || '',
    state: currentUser?.state || '',
    city: currentUser?.city || '',
    neighborhood: currentUser?.neighborhood || '',
    address: currentUser?.address || '',
  });
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
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
        country: currentUser.country || '',
        state: currentUser.state || '',
        city: currentUser.city || '',
        neighborhood: currentUser.neighborhood || '',
        address: currentUser.address || '',
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
      let finalNeighborhood = formData.neighborhood;
      // If it's a new neighborhood, register it first
      if (formData.isNewNeighborhood && formData.city && formData.neighborhood) {
        try {
          const newNb = await locationClient.createNeighborhood({
            name: formData.neighborhood,
            city_identifier: formData.city
          });
          finalNeighborhood = newNb.name;
        } catch (err) {
          console.warn("Could not register custom neighborhood:", err);
        }
      }

      const response = await authClient.updateMe({
        full_name: formData.full_name,
        email: formData.email,
        country: formData.country,
        state: formData.state,
        city: formData.city,
        neighborhood: finalNeighborhood,
        address: formData.address,
      });
      setCurrentUser({
        ...currentUser,
        name: response.full_name,
        email: response.email,
        avatar: response.avatar_url,
        country: response.country,
        state: response.state,
        city: response.city,
        neighborhood: response.neighborhood,
        address: response.address,
      });
      toast.success('Perfil actualizado correctamente.', 'Éxito');
    } catch (error) {
      toast.error(error.message || 'No se pudo actualizar el perfil.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('La geolocalización no está soportada por tu navegador.', 'Error');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
          const data = await response.json();
          if (data && data.address) {
            setFormData(prev => ({
              ...prev,
              country: data.address.country || prev.country,
              state: data.address.state || data.address.region || prev.state,
              city: data.address.city || data.address.town || data.address.village || prev.city,
              neighborhood: data.address.suburb || data.address.neighbourhood || data.address.residential || data.address.quarter || data.address.hamlet || prev.neighborhood,
              address: data.address.road ? `${data.address.road} ${data.address.house_number || ''}`.trim() : prev.address
            }));
            toast.success('Ubicación obtenida con éxito.', 'GPS');
          } else {
            toast.error('No se pudo resolver la ubicación.', 'Error');
          }
        } catch (error) {
          toast.error('Error al conectarse al servicio de mapas.', 'Error');
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        setGettingLocation(false);
        toast.error('Permiso denegado o no se pudo obtener la ubicación.', 'Error GPS');
      }
    );
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
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo excede el tamaño máximo de 10MB.', 'Error');
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
          <p className="page-description">Gestiona tu identidad digital y preferencias de seguridad</p>
        </div>
      </div>

      <div className="profile-tabs mb-8">
        <button 
          className={`profile-tab ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          <User width="18" height="18" />
          Información Personal
        </button>
        <button 
          className={`profile-tab ${activeTab === 'social' ? 'active' : ''}`}
          onClick={() => setActiveTab('social')}
        >
          <Share2 width="18" height="18" />
          Redes Sociales
        </button>
      </div>

      <div className="profile-layout">
        {activeTab === 'personal' ? (
          <>
            {/* ── Hero Section ── */}
        <div className="profile-hero-card">
          <div className="profile-avatar-wrapper" onClick={handleAvatarClick}>
            <div className="avatar avatar-xl">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={currentUser?.name}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary-subtle text-primary font-bold">
                  {(currentUser?.name || 'U').substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="avatar-overlay">
              <Camera width="20" height="20" />
              <span>EDITAR</span>
            </div>
          </div>
          
          <div className="profile-hero-info">
            <h3>{currentUser?.name}</h3>
            <div className="flex items-center gap-2">
              <span className="badge badge-primary">{APP_CONFIG.ROLE_LABELS[userRole]}</span>
              <span className="text-sm text-tertiary">ID: #{currentUser?.id?.substring(0, 8)}</span>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>

        {/* ── Personal Info Section ── */}
        <div className="profile-section-card">
          <div className="section-header">
            <User width="20" height="20" />
            <h3>Información Personal</h3>
          </div>
          
          <form className="profile-form-grid" onSubmit={handleSave}>
            <div className="profile-field">
              <label htmlFor="full_name">Nombre Completo</label>
              <div className="input-with-icon">
                <User width="18" height="18" />
                <input
                  type="text"
                  className="form-input"
                  id="full_name"
                  placeholder="Tu nombre real"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  minLength={2}
                  maxLength={150}
                />
              </div>
            </div>

            <div className="profile-field">
              <label htmlFor="email">Correo Electrónico</label>
              <div className="input-with-icon">
                <Mail width="18" height="18" />
                <input
                  type="email"
                  className="form-input"
                  id="email"
                  placeholder="ejemplo@correo.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="profile-field full-width">
              <label htmlFor="role">Rol en la Plataforma</label>
              <div className="input-with-icon">
                <Shield width="18" height="18" />
                <select className="form-select" id="role" value={userRole || ''} disabled>
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-tertiary mt-1">El rol es asignado por administración y no puede ser cambiado por el usuario.</p>
            </div>

            {/* ── Location Fields ── */}
            <div className="profile-field full-width mt-4 mb-2">
              <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
                <h4 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin width="18" height="18" className="text-primary" /> Información de Ubicación
                </h4>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleGetLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? (
                    <><span className="animate-spin mr-2">◌</span> Buscando GPS...</>
                  ) : (
                    <><Navigation width="14" height="14" className="mr-1" /> Autocompletar con GPS</>
                  )}
                </button>
              </div>
              <p className="text-xs text-tertiary mt-1">Estos datos nos ayudan a mejorar las estadísticas y campañas de mercadeo.</p>
            </div>

            <LocationSelects 
              countryValue={formData.country}
              stateValue={formData.state}
              cityValue={formData.city}
              neighborhoodValue={formData.neighborhood}
              onLocationChange={({ country, state, city, neighborhood, isNewNeighborhood }) => {
                setFormData(prev => ({ 
                  ...prev, 
                  country, 
                  state, 
                  city,
                  neighborhood,
                  isNewNeighborhood
                }));
              }}
              disabled={gettingLocation}
            />

            <div className="profile-field full-width">
              <label htmlFor="address">Dirección (Residencia o Local)</label>
              <div className="input-with-icon">
                <Home width="18" height="18" />
                <input
                  type="text"
                  className="form-input"
                  id="address"
                  placeholder="Ej: Calle 10 # 40-50"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="full-width flex justify-end mt-4 pt-4 border-t border-[var(--border-color)]">
              <button type="submit" className="btn btn-primary btn-lg min-w-[200px]" disabled={loading || gettingLocation}>
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">◌</span>
                    Guardando...
                  </>
                ) : 'Actualizar Perfil'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Danger Zone ── */}
        <div className="profile-section-card danger-card">
          <div className="section-header danger-header">
            <AlertTriangle width="20" height="20" />
            <h3>Acciones Críticas</h3>
          </div>
          
          <div className="danger-items-list">
            <div className="danger-row">
              <div className="danger-info">
                <h4>Desactivar Cuenta</h4>
                <p>Tu información se conservará pero el acceso será restringido.</p>
              </div>
              <button
                className="btn btn-outline-danger"
                onClick={() => handleDeleteClick(false)}
                disabled={loading}
              >
                Desactivar
              </button>
            </div>

            <div className="danger-row">
              <div className="danger-info">
                <h4>Eliminar Permanentemente</h4>
                <p>Esta acción borrará todos tus datos y no se puede deshacer.</p>
              </div>
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteClick(true)}
                disabled={loading}
              >
                Borrar Cuenta
              </button>
            </div>
          </div>
        </div>
      </>
    ) : (
      <div className="profile-section-card">
        <SocialSettings />
      </div>
    )}
  </div>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={deleteAction === 'permanent' ? '¿Eliminar cuenta?' : '¿Desactivar cuenta?'}
        size="sm"
        actions={[
          { label: 'Cancelar', onClick: () => setIsConfirmOpen(false) },
          {
            label: deleteAction === 'permanent' ? 'Sí, eliminar todo' : 'Sí, desactivar',
            className: deleteAction === 'permanent' ? 'btn-danger' : 'btn-outline-danger',
            onClick: handleConfirmDelete,
          },
        ]}
      >
        <div className="text-center py-4">
          <AlertTriangle width="48" height="48" className="text-danger mx-auto mb-4" />
          <p className="text-secondary">
            {deleteAction === 'permanent'
              ? 'Estás a punto de borrar toda tu información. Esta acción es irreversible y perderás acceso a todos tus recursos.'
              : 'Tu cuenta dejará de ser visible en la plataforma. Podrás reactivarla solicitándolo a un administrador.'}
          </p>
        </div>
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
