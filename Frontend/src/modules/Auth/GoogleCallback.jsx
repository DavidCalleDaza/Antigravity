import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, KeyRound, AlertCircle } from 'lucide-react';
import { authClient } from '../../utils/apiClient';
import { useStore } from '../../store/useStore';
import { useToast } from '../../components/ui/Toast';
import DonAppLogo from '../../components/ui/DonAppLogo';

const ERROR_MESSAGES = {
  user_cancelled: 'Has cancelado el inicio de sesión con Google.',
  user_creation_failed: 'No se pudo crear la cuenta de usuario. Es posible que el correo ya esté registrado o los datos no sean válidos.',
  access_denied: 'Acceso denegado durante la autenticación con Google.',
  state_invalid: 'La sesión de autenticación caducó o no es válida. Por favor, intenta nuevamente.',
  state_expired: 'El tiempo de espera para autenticar con Google expiró. Inténtalo de nuevo.',
  pkce_missing: 'La sesión de seguridad expiró. Intenta iniciar sesión nuevamente.',
  google_exchange_failed: 'No se pudo validar el código de autorización con Google.',
  no_id_token: 'Google no entregó el token de identidad esperado.',
  google_jwks_failed: 'No se pudieron verificar las claves criptográficas de Google.',
  invalid_id_token: 'El token de Google recibido no es válido.',
  invalid_nonce: 'Error de verificación de seguridad. Por favor reintenta el acceso.',
  email_not_verified: 'Tu correo de Google no está verificado.',
  missing_params: 'Faltan parámetros requeridos para completar la autenticación.',
};

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useStore();
  const toast = useToast();
  const [error, setError] = useState(null);
  const [pendingApprovalEmail, setPendingApprovalEmail] = useState(null);
  const [activationCode, setActivationCode] = useState('');
  const [activating, setActivating] = useState(false);
  const hasExchanged = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const socialStatus = searchParams.get('social_status');
    const detail = searchParams.get('detail');
    const emailParam = searchParams.get('email');

    if (socialStatus === 'pending_approval') {
      setPendingApprovalEmail(emailParam || 'tu correo');
      return;
    }

    if (socialStatus === 'error') {
      setError(ERROR_MESSAGES[detail] || detail || 'Ocurrió un error con el inicio de sesión de Google.');
      return;
    }

    if (!code) {
      setError('No se recibió el código de autorización de Google.');
      return;
    }

    if (hasExchanged.current) return;
    hasExchanged.current = true;

    const exchangeToken = async () => {
      try {
        const response = await authClient.googleExchange(code);
        login({
          id: response.user.id,
          name: response.user.full_name,
          email: response.user.email,
          role: response.user.role,
          avatar: response.user.avatar_url,
          token: response.access_token,
          location: response.user.location,
          is_staff: response.user.is_staff,
          needsOnboarding: response.user.needs_onboarding,
          hasPassword: response.user.has_password,
          businessName: response.user.business_name,
        });
        if (response.user.needs_onboarding) {
          toast.success('¡Cuenta creada! Completa tu perfil para continuar.', 'Bienvenido');
          navigate('/profile');
        } else {
          toast.success('Sesión iniciada con Google', 'Bienvenido');
          navigate('/wall');
        }
      } catch (err) {
        setError(err.message || 'Error al validar credenciales con Google.');
      }
    };

    exchangeToken();
  }, [searchParams, navigate, login, toast]);

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!activationCode.trim()) return;
    setActivating(true);
    try {
      const response = await authClient.activate({
        email: pendingApprovalEmail,
        activation_code: activationCode.trim().toUpperCase(),
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
        needsOnboarding: response.user.needs_onboarding,
        hasPassword: response.user.has_password,
        businessName: response.user.business_name,
      });
      toast.success('¡Cuenta activada con éxito!', 'Bienvenido a DonApp');
      if (response.user.needs_onboarding) {
        navigate('/profile');
      } else {
        navigate('/wall');
      }
    } catch (err) {
      toast.error(err.message || 'Código de activación incorrecto.', 'Error');
    } finally {
      setActivating(false);
    }
  };

  if (pendingApprovalEmail) {
    return (
      <div className="auth-page" style={{ justifyContent: 'center', padding: '24px' }}>
        <div className="auth-form-container" style={{ maxWidth: '460px', textAlign: 'center', margin: 'auto' }}>
          <div className="auth-logo mx-auto">
            <DonAppLogo width={60} height={60} variant="auto" />
          </div>

          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(46, 125, 50, 0.12)',
            color: '#2e7d32',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '20px auto 16px auto'
          }}>
            <ShieldCheck size={32} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
            ¡Solicitud de Registro Enviada!
          </h2>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '20px' }}>
            Tu cuenta vinculada a <strong>{pendingApprovalEmail}</strong> está en proceso de validación.
            El administrador revisará tu solicitud y te compartirá personalmente el <strong>código de activación</strong> para desbloquear tu acceso.
          </p>

          <form onSubmit={handleActivate} style={{ textAlign: 'left', marginBottom: '16px' }}>
            <div className="form-group">
              <label htmlFor="googleActivationCode" style={{ fontSize: '12px', fontWeight: '600' }}>
                ¿Ya recibiste tu código de activación?
              </label>
              <div className="input-group">
                <span className="input-icon"><KeyRound width="18" height="18" /></span>
                <input
                  type="text"
                  className="form-input"
                  id="googleActivationCode"
                  placeholder="Ej: DON-123456"
                  required
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                  style={{ letterSpacing: '2px', fontWeight: '700', textTransform: 'uppercase' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={activating}>
              {activating ? 'Activando cuenta...' : 'Activar y Continuar →'}
            </button>
          </form>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            <Link to="/login" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-page" style={{ justifyContent: 'center', padding: '24px' }}>
        <div className="auth-form-container" style={{ maxWidth: '440px', textAlign: 'center', margin: 'auto', padding: '36px 32px' }}>
          <div className="auth-logo mx-auto">
            <DonAppLogo width={60} height={60} variant="auto" />
          </div>

          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '24px auto 16px auto',
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}>
            <AlertCircle size={34} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-primary)' }}>
            Error de Autenticación
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '28px' }}>
            {error}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              className="btn btn-primary btn-lg w-full"
              onClick={() => navigate('/login')}
              style={{ fontWeight: 600 }}
            >
              Volver al inicio de sesión
            </button>

            <Link
              to="/"
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                marginTop: '4px'
              }}
            >
              Ir a la página principal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="auth-logo mx-auto heartbeat" style={{ animation: 'pulse 1.5s infinite' }}>
          <DonAppLogo width={60} height={60} variant="dark" className="callback-logo-inverted" />
        </div>
        <h2 style={{ marginTop: '20px', color: 'var(--text-color)' }}>Validando cuenta...</h2>
        <p style={{ color: 'var(--text-muted)' }}>Por favor espera un momento.</p>
      </div>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
