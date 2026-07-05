import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Store, User, Shield, HeartHandshake } from 'lucide-react';
import { authClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import { useStore } from '../../store/useStore';
import ServinowLogo from '../../components/ui/ServinowLogo';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('seller');
  const [loading, setLoading] = useState(false);
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

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{marginTop: '10px'}}>
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
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
