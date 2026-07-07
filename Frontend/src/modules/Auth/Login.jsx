import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, HeartHandshake } from 'lucide-react';
import { authClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import { useStore } from '../../store/useStore';
import ServinowLogo from '../../components/ui/ServinowLogo';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const navigate = useNavigate();
  const toast = useToast();
  const { login } = useStore();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
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
      });
      toast.success('Sesión iniciada', 'Bienvenido');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Credenciales inválidas.', 'Error');
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
          <h2 className="auth-left-title">Bienvenido<br/>de nuevo</h2>
          <p className="auth-left-text">Gestiona tu negocio y transforma tu comunidad desde un solo lugar.</p>
          <div className="auth-left-quote">
            "No buscamos aplausos. Servinow existe porque servir es el único negocio donde todos ganan."
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <Link to="/" className="auth-logo">
            <ServinowLogo width={40} height={40} variant="gold" />
          </Link>

          <div className="auth-header">
            <h1 className="auth-title">Iniciar Sesión</h1>
            <p className="auth-subtitle">Ingresa tus datos para acceder a tu cuenta</p>
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

            <div className="auth-actions">
              <label className="d-flex items-center gap-2 cursor-pointer text-muted">
                <input type="checkbox" className="custom-checkbox" /> Recordarme
              </label>
              <Link to="/forgot-password" title="Proximamente" className="auth-link">¿Olvidaste tu contraseña?</Link>
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{marginTop: '10px'}}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="auth-footer">
            ¿No tienes cuenta? <Link to="/register">Regístrate gratis</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
