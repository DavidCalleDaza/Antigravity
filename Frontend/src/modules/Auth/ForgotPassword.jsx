import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, HeartHandshake, KeyRound } from 'lucide-react';
import { authClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import ServinowLogo from '../../components/ui/ServinowLogo';

export default function ForgotPassword() {
  const [phase, setPhase] = useState(1); // 1 = Request code, 2 = Verify code & reset
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authClient.requestPasswordReset(email);
      toast.success('Código de verificación enviado', 'Revisa tu correo electrónico.');
      setPhase(2);
    } catch (error) {
      toast.error(error.message || 'No se pudo enviar el código de recuperación.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email || !code || !newPassword) return;
    if (code.length !== 6) {
      toast.error('El código debe tener 6 dígitos.', 'Error');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres.', 'Error');
      return;
    }
    setLoading(true);
    try {
      await authClient.resetPassword(email, code, newPassword);
      toast.success('Contraseña restablecida con éxito', 'Ya puedes iniciar sesión con tu nueva contraseña.');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Código de verificación inválido o expirado.', 'Error');
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
          <h2 className="auth-left-title">Recupera tu<br/>acceso</h2>
          <p className="auth-left-text">Estamos aquí para ayudarte a volver a gestionar tu negocio y seguir sirviendo a tu comunidad.</p>
          <div className="auth-left-quote">
            "El servicio no se detiene por un olvido. Restablece tu cuenta y continúa transformando vidas hoy."
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <Link to="/" className="auth-logo">
            <ServinowLogo width={52} height={52} variant="gold" />
          </Link>

          {phase === 1 ? (
            <>
              <div className="auth-header">
                <h1 className="auth-title">¿Olvidaste tu contraseña?</h1>
                <p className="auth-subtitle">Ingresa tu correo para recibir un código de seguridad de 6 dígitos.</p>
              </div>

              <form className="auth-form" onSubmit={handleRequestCode}>
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
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{ marginTop: '20px' }}>
                  {loading ? 'Enviando código...' : 'Enviar Código'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="auth-header">
                <h1 className="auth-title">Restablecer Contraseña</h1>
                <p className="auth-subtitle">Ingresa el código que enviamos a tu correo y tu nueva contraseña.</p>
              </div>

              <form className="auth-form" onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label htmlFor="email-disabled">Correo electrónico</label>
                  <div className="input-group">
                    <span className="input-icon"><Mail width="18" height="18" /></span>
                    <input 
                      type="email" 
                      className="form-input" 
                      id="email-disabled" 
                      disabled 
                      value={email} 
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label htmlFor="code">Código de verificación</label>
                  <div className="input-group">
                    <span className="input-icon"><KeyRound width="18" height="18" /></span>
                    <input 
                      type="text" 
                      className="form-input" 
                      id="code" 
                      placeholder="Ingresa el código de 6 dígitos" 
                      required 
                      maxLength="6"
                      pattern="[0-9]{6}"
                      value={code} 
                      onChange={(e) => setCode(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label htmlFor="password">Nueva contraseña</label>
                  <div className="input-group password-group">
                    <span className="input-icon"><Lock width="18" height="18" /></span>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-input"
                      id="password"
                      placeholder="Mínimo 8 caracteres"
                      required
                      minLength="8"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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

                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{ marginTop: '25px' }}>
                  {loading ? 'Restableciendo...' : 'Validar y Restablecer'}
                </button>

                <div className="text-center" style={{ marginTop: '15px' }}>
                  <button 
                    type="button" 
                    className="auth-link" 
                    onClick={handleRequestCode}
                    disabled={loading}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    ¿No recibiste el código? Reenviar
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="auth-footer" style={{ marginTop: '20px' }}>
            ¿Recordaste tu contraseña? <Link to="/login">Inicia sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
