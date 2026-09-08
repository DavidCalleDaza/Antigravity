import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, User, Mail, Shield, AlertTriangle, Share2, MessageCircle, MapPin, Map, Home, Compass, Navigation, Store, Lock, Sparkles, Briefcase, Phone } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { useStore } from '../../store/useStore';
import { authClient, locationClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import Helpers from '../../utils/helpers';
import Modal from '../../components/ui/Modal';
import ImageCropperModal from '../../components/ui/ImageCropperModal';
import SocialSettings from './SocialSettings';
import WhatsAppSettings from './WhatsAppSettings';
import LocationSelects from '../../components/ui/LocationSelects';
import Avatar from '../../components/common/Avatar';

const { ADMIN, SELLER, CLIENT } = APP_CONFIG.ROLES;
const ROLE_OPTIONS = Object.entries(APP_CONFIG.ROLES).map(([key, value]) => ({
  value,
  label: APP_CONFIG.ROLE_LABELS[value],
}));
export default function Profile() {
  const { currentUser, setCurrentUser, logout } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const userRole = currentUser?.role;
  const canManageIntegrations = userRole === SELLER || userRole === ADMIN;
  const roleSelectOptions = ROLE_OPTIONS;

  // Initialise tab from ?tab= query param (e.g. /profile?tab=social from ShareModal link)
  const initialTab = (() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'social' || tabParam === 'whatsapp') return tabParam;
    return 'personal';
  })();
  const [activeTab, setActiveTab] = useState(initialTab); // 'personal' | 'social' | 'whatsapp'

  const [formData, setFormData] = useState({
    full_name: currentUser?.name || '',
    email: currentUser?.email || '',
    role: currentUser?.role || '',
    business_name: currentUser?.businessName || '',
    password: '',
    confirmPassword: '',
    country: currentUser?.location?.country || '',
    countryCode: currentUser?.location?.country_code || '',
    state: currentUser?.location?.state || '',
    stateCode: currentUser?.location?.state_code || '',
    city: currentUser?.location?.city || '',
    neighborhood: currentUser?.location?.neighborhood || '',
    address: currentUser?.location?.address || '',
  });
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Solicitud de cambio de correo
  const [isEmailChangeModalOpen, setIsEmailChangeModalOpen] = useState(false);
  const [emailChangeData, setEmailChangeData] = useState({ new_email: '', reason: '' });
  const [sendingEmailChange, setSendingEmailChange] = useState(false);

  // Modal de activación / upgrade a vendedor
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeData, setUpgradeData] = useState({
    business_name: '',
    category: '',
    phone: '',
  });
  const [upgradingSeller, setUpgradingSeller] = useState(false);

  const handleUpgradeToSeller = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!upgradeData.business_name.trim()) {
      toast.error('Por favor ingresa el nombre de tu negocio o actividad comercial');
      return;
    }
    setUpgradingSeller(true);
    try {
      const updatedUser = await authClient.upgradeToSeller(upgradeData);
      setCurrentUser({
        ...currentUser,
        role: updatedUser.role || 'seller',
        name: updatedUser.full_name || currentUser.name,
      });
      useStore.getState().setActiveViewMode('seller');
      setIsUpgradeModalOpen(false);
      toast.success('¡Felicidades!', 'Tu cuenta ha sido promovida a Vendedor con éxito.');
    } catch (err) {
      toast.error('Error al activar perfil de vendedor', err.message || 'Inténtalo de nuevo');
    } finally {
      setUpgradingSeller(false);
    }
  };

  const processAvatarFileRef = useRef(null);

  useEffect(() => {
    const avatarUrl = currentUser?.avatar_url || currentUser?.avatar;
    if (avatarUrl) {
      setPreviewUrl(Helpers.resolveMediaUrl(avatarUrl));
    } else {
      setPreviewUrl(null);
    }
  }, [currentUser?.avatar_url, currentUser?.avatar]);

  useEffect(() => {
    window.__testProcessAvatar = (file) => processAvatarFileRef.current?.(file);
    return () => { delete window.__testProcessAvatar; };
  }, []);

  useEffect(() => {
    if (currentUser?.needsOnboarding && activeTab !== 'personal') {
      setActiveTab('personal');
    }
  }, [currentUser?.needsOnboarding, activeTab]);

  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        full_name: currentUser.name || '',
        email: currentUser.email || '',
        role: currentUser.role || '',
        business_name: currentUser.businessName || '',
        country: currentUser.location?.country || '',
        countryCode: currentUser.location?.country_code || '',
        state: currentUser.location?.state || '',
        stateCode: currentUser.location?.state_code || '',
        city: currentUser.location?.city || '',
        neighborhood: currentUser.location?.neighborhood || '',
        address: currentUser.location?.address || '',
      }));
    }
  }, [currentUser]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (formData.role === 'seller' && !formData.business_name.trim()) {
      toast.error('El nombre del negocio es obligatorio.', 'Error');
      setLoading(false);
      return;
    }
    if (!currentUser?.hasPassword && formData.password) {
      if (formData.password.length < 8) {
        toast.error('La contraseña debe tener al menos 8 caracteres.', 'Error');
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Las contraseñas no coinciden.', 'Error');
        setLoading(false);
        return;
      }
    }
    if (currentUser?.needsOnboarding && !currentUser?.hasPassword && !formData.password) {
      toast.error('Debes definir una contraseña para continuar.', 'Error');
      setLoading(false);
      return;
    }

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

      const payload = {
        full_name: formData.full_name,
        business_name: formData.role === 'seller' ? formData.business_name : undefined,
        location: {
          country: formData.country,
          country_code: formData.countryCode,
          state: formData.state,
          state_code: formData.stateCode,
          city: formData.city,
          neighborhood: finalNeighborhood,
          address: formData.address,
        }
      };
      if (currentUser?.needsOnboarding) {
        payload.role = formData.role;
      }
      if (formData.password) {
        payload.password = formData.password;
      }

      const response = await authClient.updateMe(payload);
      setCurrentUser({
        ...currentUser,
        name: response.full_name,
        email: response.email,
        role: response.role,
        avatar_url: response.avatar_url,
        location: response.location,
        businessName: response.business_name,
        needsOnboarding: response.needs_onboarding,
        hasPassword: response.has_password,
      });
      if (currentUser?.needsOnboarding && !response.needs_onboarding) {
        toast.success('¡Perfil completado! Bienvenido a DonApp.', 'Éxito');
        navigate('/wall');
      } else {
        toast.success('Perfil actualizado correctamente.', 'Éxito');
      }
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
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`, {
            headers: { 'User-Agent': 'DonApp/1.0' },
          });
          const data = await response.json();
          if (data && data.address) {
            setFormData(prev => ({
              ...prev,
              country: data.address.country || prev.country,
              countryCode: data.address.country_code ? data.address.country_code.toUpperCase() : prev.countryCode,
              state: data.address.state || data.address.region || prev.state,
              stateCode: '',
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

  const processAvatarFile = (file) => {
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
  };
  processAvatarFileRef.current = processAvatarFile;

  const handleAvatarClick = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        startIn: 'desktop',
        types: [{
          description: 'Imágenes',
          accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
        }],
      });
      const file = await fileHandle.getFile();
      processAvatarFile(file);
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'SecurityError') {
        fileInputRef.current?.click();
        return;
      }
      fileInputRef.current?.click();
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processAvatarFile(file);

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
        avatar_url: response.avatar_url,
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

  const handleRequestEmailChange = async (e) => {
    if (e) e.preventDefault();
    const newEmailClean = (emailChangeData.new_email || '').trim().toLowerCase();
    const currentEmailClean = (currentUser?.email || '').trim().toLowerCase();

    if (!newEmailClean || !newEmailClean.includes('@')) {
      toast.error('Por favor ingresa un correo electrónico válido.', 'Correo Inválido');
      return;
    }
    if (newEmailClean === currentEmailClean) {
      toast.error('El nuevo correo no puede ser igual al correo actual.', 'Atención');
      return;
    }

    setSendingEmailChange(true);
    try {
      const res = await authClient.requestEmailChange({
        new_email: newEmailClean,
        reason: emailChangeData.reason?.trim() || null,
      });
      toast.success(
        res?.detail || 'Solicitud de cambio de correo enviada a administración.',
        'Solicitud Enviada'
      );
      setIsEmailChangeModalOpen(false);
      setEmailChangeData({ new_email: '', reason: '' });
    } catch (err) {
      toast.error(err.message || 'Error al enviar la solicitud de cambio de correo.', 'Error');
    } finally {
      setSendingEmailChange(false);
    }
  };

  return (
    <div className="page-content profile-bg-photo">
      <div className="page-header">
        <div>
          <h2 className="page-title">Configuración de Cuenta</h2>
          <p className="page-description">Gestiona tu identidad digital y preferencias de seguridad</p>
        </div>
      </div>

      {currentUser?.needsOnboarding && (
        <div className="onboarding-banner">
          <AlertTriangle width="18" height="18" />
          <span>Completa los campos obligatorios para continuar usando DonApp.</span>
        </div>
      )}

      <div className="profile-tabs mb-8">
        <button 
          className={`profile-tab ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          <User width="18" height="18" />
          Información Personal
        </button>
        {canManageIntegrations && !currentUser?.needsOnboarding && (
          <button 
            className={`profile-tab ${(activeTab === 'social' || activeTab === 'whatsapp') ? 'active' : ''}`}
            onClick={() => setActiveTab('social')}
          >
            <Share2 width="18" height="18" />
            Redes Sociales
          </button>
        )}
      </div>

      <div className="profile-layout">
        {activeTab === 'personal' ? (
          <>
            {/* ── Banner Upgrade a Vendedor (Solo para Clientes) ── */}
            {userRole === CLIENT && (
              <div className="profile-upgrade-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '260px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(212, 175, 55, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--gold, #d4af37)',
                      flexShrink: 0,
                    }}
                  >
                    <Store width="24" height="24" />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ¿Ofreces productos o servicios? Conviértete en Vendedor
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      Publica tu catálogo, recibe citas y pedidos, emite facturas y gestiona tu negocio en DonApp.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsUpgradeModalOpen(true)}
                  style={{ padding: '8px 18px', fontWeight: 700, borderRadius: '10px', fontSize: '0.85rem' }}
                >
                  <Sparkles width="15" height="15" />
                  Activar Perfil de Vendedor
                </button>
              </div>
            )}

            {/* ── Hero Section ── */}
        <div className="profile-hero-card">
          <div className="profile-avatar-wrapper" onClick={handleAvatarClick}>
            <Avatar
              author={currentUser}
              src={previewUrl}
              name={currentUser?.name}
              size={96}
              className="avatar avatar-xl"
            />
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                <label htmlFor="email" style={{ marginBottom: 0 }}>Correo Electrónico</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-primary"
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: '1px solid var(--primary-light, #dcfce7)',
                    borderRadius: '6px',
                    background: 'var(--primary-subtle, rgba(46, 125, 50, 0.08))',
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsEmailChangeModalOpen(true)}
                  title="Solicitar cambio de correo electrónico a administración"
                >
                  <Mail width="12" height="12" />
                  Solicitar cambio
                </button>
              </div>
              <div className="input-with-icon">
                <Mail width="18" height="18" />
                <input
                  type="email"
                  className="form-input"
                  id="email"
                  placeholder="ejemplo@correo.com"
                  value={formData.email}
                  readOnly
                  disabled
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    cursor: 'not-allowed',
                    color: 'var(--text-secondary, #a098b0)',
                  }}
                />
              </div>
              <p className="text-xs text-tertiary mt-1">
                Por seguridad, el correo no es editable directamente. Usa «Solicitar cambio» para notificar a administración.
              </p>
            </div>

            <div className="profile-field full-width">
              <label htmlFor="role">Rol en la Plataforma</label>
              <div className="input-with-icon">
                <Shield width="18" height="18" />
                <select
                  className="form-select"
                  id="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={!currentUser?.needsOnboarding}
                >
                  {roleSelectOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-tertiary mt-1">
                {currentUser?.needsOnboarding
                  ? 'Selecciona el tipo de cuenta que mejor describe tu uso de DonApp (Vendedor, Cliente o Administrador).'
                  : currentUser?.role === ADMIN
                  ? 'Cuenta con rol y privilegios de Administrador del sistema.'
                  : 'El rol es asignado por administración y no puede ser cambiado por el usuario.'}
              </p>
            </div>

            {formData.role === 'seller' && (
              <div className="profile-field full-width">
                <label htmlFor="business_name">Nombre del Negocio</label>
                <div className="input-with-icon">
                  <Store width="18" height="18" />
                  <input
                    type="text"
                    className="form-input"
                    id="business_name"
                    placeholder="Mi Tienda de Barrio"
                    value={formData.business_name}
                    onChange={handleChange}
                    required={currentUser?.needsOnboarding}
                  />
                </div>
              </div>
            )}

            {!currentUser?.hasPassword && (
              <>
                <div className="profile-field">
                  <label htmlFor="password">Nueva Contraseña</label>
                  <div className="input-with-icon">
                    <Lock width="18" height="18" />
                    <input
                      type="password"
                      className="form-input"
                      id="password"
                      placeholder="Mínimo 8 caracteres"
                      value={formData.password}
                      onChange={handleChange}
                      minLength={8}
                      required={currentUser?.needsOnboarding}
                    />
                  </div>
                </div>
                <div className="profile-field">
                  <label htmlFor="confirmPassword">Repetir Contraseña</label>
                  <div className="input-with-icon">
                    <Lock width="18" height="18" />
                    <input
                      type="password"
                      className="form-input"
                      id="confirmPassword"
                      placeholder="Repite la contraseña"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required={currentUser?.needsOnboarding}
                    />
                  </div>
                </div>
              </>
            )}

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
              onLocationChange={({ country, countryCode, state, stateCode, city, neighborhood, isNewNeighborhood }) => {
                setFormData(prev => ({ 
                  ...prev, 
                  country, 
                  countryCode,
                  state, 
                  stateCode,
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
    ) : (activeTab === 'social' || activeTab === 'whatsapp') && canManageIntegrations ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', width: '100%' }}>
        <div className="profile-section-card">
          <SocialSettings />
        </div>
        <div className="profile-section-card">
          <WhatsAppSettings />
        </div>
      </div>
    ) : null}
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

      {/* ── Modal Solicitar Cambio de Correo ── */}
      <Modal
        isOpen={isEmailChangeModalOpen}
        onClose={() => !sendingEmailChange && setIsEmailChangeModalOpen(false)}
        title="Solicitar Cambio de Correo Electrónico"
        size="md"
        actions={[
          {
            label: 'Cancelar',
            onClick: () => setIsEmailChangeModalOpen(false),
            disabled: sendingEmailChange,
          },
          {
            label: sendingEmailChange ? 'Enviando...' : 'Enviar Solicitud',
            className: 'btn-primary',
            onClick: handleRequestEmailChange,
            disabled: sendingEmailChange,
          },
        ]}
      >
        <form onSubmit={handleRequestEmailChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          <div style={{
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            lineHeight: '1.5',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            Por motivos de seguridad, la modificación de correo debe ser validada por administración. Al enviar la solicitud, el administrador recibirá una notificación para su aprobación.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Correo Actual
            </label>
            <div className="input-with-icon" style={{ width: '100%' }}>
              <Mail width="18" height="18" />
              <input
                type="email"
                className="form-input"
                value={currentUser?.email || ''}
                disabled
                readOnly
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-secondary, #f8fafc)',
                  cursor: 'not-allowed',
                  color: 'var(--text-secondary, #64748b)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <label htmlFor="new_email_input" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Nuevo Correo Electrónico <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
            </label>
            <div className="input-with-icon" style={{ width: '100%' }}>
              <Mail width="18" height="18" />
              <input
                type="email"
                id="new_email_input"
                className="form-input"
                placeholder="nuevo_correo@ejemplo.com"
                value={emailChangeData.new_email}
                onChange={(e) => setEmailChangeData((prev) => ({ ...prev, new_email: e.target.value }))}
                required
                disabled={sendingEmailChange}
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <label htmlFor="reason_input" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Motivo del Cambio (Opcional)
            </label>
            <textarea
              id="reason_input"
              className="form-input"
              rows={3}
              placeholder="Explica brevemente la razón de este cambio..."
              value={emailChangeData.reason}
              onChange={(e) => setEmailChangeData((prev) => ({ ...prev, reason: e.target.value }))}
              maxLength={500}
              disabled={sendingEmailChange}
              style={{ width: '100%', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box' }}
            />
          </div>
        </form>
      </Modal>

      {/* ── Modal de Activación / Upgrade a Vendedor ── */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => !upgradingSeller && setIsUpgradeModalOpen(false)}
        title="Activar Perfil de Vendedor"
        size="md"
        actions={[
          {
            label: 'Cancelar',
            className: 'btn-ghost',
            onClick: () => setIsUpgradeModalOpen(false),
            disabled: upgradingSeller,
          },
          {
            label: upgradingSeller ? 'Activando...' : 'Activar Cuenta Comercial',
            className: 'btn-primary',
            onClick: handleUpgradeToSeller,
            disabled: upgradingSeller,
          },
        ]}
      >
        <form onSubmit={handleUpgradeToSeller} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          <div style={{
            backgroundColor: 'rgba(212, 175, 55, 0.1)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            borderRadius: '10px',
            padding: '14px 16px',
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            lineHeight: '1.5',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            🎉 <strong>¡Estás a un paso de comenzar a vender!</strong> Al activar tu perfil comercial se desbloquearán las herramientas de gestión de productos, servicios, facturación electrónica y agenda de clientes.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <label htmlFor="business_name_input" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Nombre de tu Negocio o Marca Comercial <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
            </label>
            <div className="input-with-icon" style={{ width: '100%' }}>
              <Store width="18" height="18" />
              <input
                type="text"
                id="business_name_input"
                className="form-input"
                placeholder="Ej: Barbería DonApp, Estética Bella, etc."
                value={upgradeData.business_name}
                onChange={(e) => setUpgradeData((prev) => ({ ...prev, business_name: e.target.value }))}
                required
                disabled={upgradingSeller}
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <label htmlFor="category_input" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Categoría o Especialidad Comercial
            </label>
            <div className="input-with-icon" style={{ width: '100%' }}>
              <Briefcase width="18" height="18" />
              <input
                type="text"
                id="category_input"
                className="form-input"
                placeholder="Ej: Belleza, Barbería, Gastronomía, Salud, Tecnología..."
                value={upgradeData.category}
                onChange={(e) => setUpgradeData((prev) => ({ ...prev, category: e.target.value }))}
                disabled={upgradingSeller}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <label htmlFor="phone_input" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Teléfono de Contacto Comercial
            </label>
            <div className="input-with-icon" style={{ width: '100%' }}>
              <Phone width="18" height="18" />
              <input
                type="tel"
                id="phone_input"
                className="form-input"
                placeholder="+57 300 123 4567"
                value={upgradeData.phone}
                onChange={(e) => setUpgradeData((prev) => ({ ...prev, phone: e.target.value }))}
                disabled={upgradingSeller}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
