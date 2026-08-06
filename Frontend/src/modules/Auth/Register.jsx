import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Store, User, Shield, HeartHandshake } from 'lucide-react';
import { authClient, apiClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import { useStore } from '../../store/useStore';
import ServinowLogo from '../../components/ui/ServinowLogo';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('seller');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [repeatPassword, setRepeatPassword] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    business: '',
    password: '',
  });
  const navigate = useNavigate();
  const toast = useToast();
  const { login } = useStore();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleRepeatPasswordChange = (e) => setRepeatPassword(e.target.value);

  const validateForGoogle = () => {
    if (!formData.firstName.trim()) {
      toast.error('El nombre es obligatorio', 'Error');
      return false;
    }
    if (!formData.lastName.trim()) {
      toast.error('El apellido es obligatorio', 'Error');
      return false;
    }
    if (!formData.business.trim()) {
      toast.error('El nombre del negocio es obligatorio', 'Error');
      return false;
    }
    if (!role) {
      toast.error('Debe seleccionar un tipo de cuenta', 'Error');
      return false;
    }
    if (!formData.password) {
      toast.error('La contraseña es obligatoria', 'Error');
      return false;
    }
    if (formData.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres', 'Error');
      return false;
    }
    return true;
  };

  const validateRepeatPassword = () => {
    if (!repeatPassword) {
      toast.error('Debes repetir la contraseña', 'Error');
      return false;
    }
    if (repeatPassword !== formData.password) {
      toast.error('Las contraseñas no coinciden', 'Error');
      return false;
    }
    return true;
  };

  const handleGoogleClick = async () => {
    if (!validateForGoogle()) return;

    if (!showRepeatPassword) {
      setShowRepeatPassword(true);
      return;
    }

    if (!validateRepeatPassword()) return;

    setGoogleLoading(true);
    try {
      const { staging_token } = await authClient.stageGoogleRegistration({
        first_name: formData.firstName,
        last_name: formData.lastName,
        business_name: formData.business,
        role,
        password: formData.password,
      });
      window.location.href = `${apiClient.baseUrl}/auth/google/authorize?role=${role}&staging=${staging_token}`;
    } catch (error) {
      toast.error(error.message || 'No se pudo iniciar el registro con Google.', 'Error');
      setGoogleLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      await authClient.register({
        email: formData.email,
        full_name: fullName,
        role: role === 'admin' ? 'admin' : role === 'seller' ? 'seller' : 'client',
        password: formData.password,
      });
      const response = await authClient.login({
        email: formData.email,
        password: formData.password,
      });
      login({
        id: response.user.id,
        name: response.user.full_name,
        email: response.user.email,
        role: response.user.role,
        avatar: response.user.avatar_url,
        token: response.access_token,
        location: response.user.location,
        is_staff: response.user.is_staff,
      });
      toast.success('¡Cuenta creada con éxito!', 'Bienvenido');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'No se pudo crear la cuenta.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-orb"></div>
        <div className="auth-left-content">
          <div className="auth-left-icon">
            <HeartHandshake width="28" height="28" />
          </div>
          <h2 className="auth-left-title">Únete a<br/>Servinow</h2>
          <p className="auth-left-text">Comienza a gestionar tu negocio y a impactar vidas hoy mismo.</p>
          <div className="auth-left-quote">
            "Cada negocio que se une es una semilla de cambio. Cada donación es un puente hacia la dignidad de alguien."
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <Link to="/" className="auth-logo">
            <ServinowLogo width={40} height={40} variant="gold" />
          </Link>

          <div className="auth-header">
            <h1 className="auth-title">Crear Cuenta</h1>
            <p className="auth-subtitle">Completa tus datos para comenzar</p>
          </div>

          <form className="auth-form" onSubmit={handleRegister}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">Nombre</label>
                <input type="text" className="form-input" id="firstName" placeholder="Tu nombre" required value={formData.firstName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Apellido</label>
                <input type="text" className="form-input" id="lastName" placeholder="Tu apellido" required value={formData.lastName} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <div className="input-group">
                <span className="input-icon"><Mail width="18" height="18" /></span>
                <input type="email" className="form-input" id="email" placeholder="tu@correo.com" required value={formData.email} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="business">Nombre del Negocio</label>
              <div className="input-group">
                <span className="input-icon"><Store width="18" height="18" /></span>
                <input type="text" className="form-input" id="business" placeholder="Mi Tienda de Barrio" value={formData.business} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label>Tipo de Cuenta</label>
              <div className="role-selector">
                <div className={`role-option ${role === 'seller' ? 'selected' : ''}`} onClick={() => setRole('seller')}>
                  <div className="role-option-icon"><Store width="20" height="20" /></div>
                  <span className="role-option-label">Vendedor</span>
                </div>
                <div className={`role-option ${role === 'client' ? 'selected' : ''}`} onClick={() => setRole('client')}>
                  <div className="role-option-icon"><User width="20" height="20" /></div>
                  <span className="role-option-label">Cliente</span>
                </div>
                <div className={`role-option ${role === 'admin' ? 'selected' : ''}`} onClick={() => setRole('admin')}>
                  <div className="role-option-icon"><Shield width="20" height="20" /></div>
                  <span className="role-option-label">Admin</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="input-group password-group">
                <span className="input-icon"><Lock width="18" height="18" /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  id="password"
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength="8"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button 
                  type="button" 
                  className="password-toggle" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff width="18" height="18" /> : <Eye width="18" height="18" />}
                </button>
              </div>
            </div>

            {showRepeatPassword && (
              <div className="form-group">
                <label htmlFor="repeatPassword">Repetir Contraseña</label>
                <div className="input-group password-group">
                  <span className="input-icon"><Lock width="18" height="18" /></span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-input"
                    id="repeatPassword"
                    placeholder="Repite tu contraseña"
                    required
                    value={repeatPassword}
                    onChange={handleRepeatPasswordChange}
                  />
                  <button 
                    type="button" 
                    className="password-toggle" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff width="18" height="18" /> : <Eye width="18" height="18" />}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{marginTop: '10px'}}>
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>

            <div className="auth-divider">
              <span>o regístrate con</span>
            </div>

            <button
              type="button"
              className="btn btn-outline w-full d-flex items-center justify-center gap-2"
              style={{ padding: '0.75rem', marginTop: '15px' }}
              onClick={handleGoogleClick}
              disabled={googleLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              {googleLoading ? 'Creando cuenta con Google...' : 'Continuar con Google'}
            </button>
          </form>

          <div className="auth-footer">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
