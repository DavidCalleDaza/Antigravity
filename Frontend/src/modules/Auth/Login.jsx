import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';
import { authClient, apiClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import { useStore } from '../../store/useStore';
import DonAppLogo from '../../components/ui/DonAppLogo';
import ParticleNetwork from '../../components/ui/ParticleNetwork';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requiresActivation, setRequiresActivation] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', activationCode: '' });
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { login } = useStore();

  useEffect(() => {
    if (location.state?.email) {
      setFormData((prev) => ({ ...prev, email: location.state.email }));
    }
  }, [location.state]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authClient.login({
        email: formData.email.trim(),
        password: formData.password,
        activation_code: requiresActivation ? formData.activationCode.trim().toUpperCase() : undefined,
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
      toast.success(requiresActivation ? '¡Cuenta activada con éxito!' : 'Sesión iniciada', 'Bienvenido');
      navigate('/wall');
    } catch (error) {
      const errorMsg = error.message || '';
      if (
        error.status === 403 ||
        errorMsg.toLowerCase().includes('código de activación') ||
        errorMsg.toLowerCase().includes('proceso de validación')
      ) {
        setRequiresActivation(true);
        toast.info(errorMsg || 'Esta cuenta requiere un código de activación para el primer ingreso.', 'Código Requerido');
      } else {
        toast.error(errorMsg || 'Credenciales inválidas.', 'Error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-orb"></div>
        <ParticleNetwork particleCount={60} connectionDistance={110} />
        <div className="auth-left-content">
          <div className="auth-left-card">
            <Link to="/" className="auth-left-icon-link">
              <DonAppLogo width={58} height={58} variant="auto" className="auth-left-icon" />
            </Link>
            <h2 className="auth-left-title">Bienvenido<br/>de nuevo</h2>
            <p className="auth-left-text">Gestiona tu negocio y transforma tu comunidad desde un solo lugar.</p>
          </div>
          <div className="auth-left-quote auth-left-card">
            "No buscamos aplausos. DonApp existe porque servir es el único negocio donde todos ganan."
          </div>
        </div>

        <div className="auth-left-orbit model-visual">
          <div className="model-ring"><div className="orbit-dot"></div></div>
          <div className="model-ring"><div className="orbit-dot"></div></div>
          <div className="model-ring"><div className="orbit-dot"></div></div>
          <div className="model-center"></div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-header-row">
            <div className="auth-header">
              <h1 className="auth-title">Iniciar Sesión</h1>
              <p className="auth-subtitle">Ingresa tus datos para acceder a tu cuenta</p>
            </div>
            <Link to="/" className="auth-logo">
              <DonAppLogo width={68} height={68} variant="auto" />
            </Link>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <div className="input-group">
                <span className="input-icon"><Mail width="18" height="18" /></span>
                <input 
                  type="email" 
                  className="form-input" 
                  id="email" 
                  placeholder="tu@correo.com" 
                  required 
                  value={formData.email} 
                  onChange={handleChange} 
                />
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
                  placeholder="••••••••"
                  required
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

            {requiresActivation && (
              <div style={{
                background: 'rgba(46, 125, 50, 0.08)',
                border: '1px solid rgba(46, 125, 50, 0.25)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                animation: 'fadeIn 0.3s ease-in-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontWeight: '600', fontSize: '13px', marginBottom: '8px' }}>
                  <ShieldAlert size={18} /> Validación de Primer Acceso
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                  Introduce el <strong>código de activación</strong> que te proporcionó el administrador para desbloquear tu cuenta.
                </p>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="activationCode" style={{ fontSize: '12px' }}>Código de Activación</label>
                  <div className="input-group">
                    <span className="input-icon"><KeyRound width="18" height="18" /></span>
                    <input
                      type="text"
                      className="form-input"
                      id="activationCode"
                      placeholder="Ej: DON-123456"
                      required
                      value={formData.activationCode}
                      onChange={handleChange}
                      style={{ letterSpacing: '2px', fontWeight: '700', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="auth-actions">
              <label className="d-flex items-center gap-2 cursor-pointer text-muted">
                <input type="checkbox" className="custom-checkbox" /> Recordarme
              </label>
              <Link to="/forgot-password" className="auth-link">¿Olvidaste tu contraseña?</Link>
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{marginTop: '10px'}}>
              {loading
                ? (requiresActivation ? 'Activando cuenta...' : 'Iniciando sesión...')
                : (requiresActivation ? 'Activar e Iniciar Sesión →' : 'Iniciar Sesión')}
            </button>

            <div className="auth-divider">
              <span>o continúa con</span>
            </div>

            <a 
              href={`${apiClient.baseUrl}/auth/google/authorize?role=client`} 
              className="btn btn-outline w-full d-flex items-center justify-center gap-2"
              style={{ padding: '0.75rem', marginTop: '15px' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Iniciar sesión con Google
            </a>
          </form>

          <div className="auth-footer">
            ¿No tienes cuenta? <Link to="/register">Regístrate gratis</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
