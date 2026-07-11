import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authClient } from '../../utils/apiClient';
import { useStore } from '../../store/useStore';
import { useToast } from '../../components/ui/Toast';
import ServinowLogo from '../../components/ui/ServinowLogo';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useStore();
  const toast = useToast();
  const [error, setError] = useState(null);
  const hasExchanged = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const socialStatus = searchParams.get('social_status');
    const detail = searchParams.get('detail');

    if (socialStatus === 'error') {
      setError(detail || 'Ocurrió un error con el inicio de sesión de Google.');
      return;
    }

    if (!code) {
      setError('No se recibió el código de autorización.');
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
        });
        toast.success('Sesión iniciada con Google', 'Bienvenido');
        navigate('/dashboard');
      } catch (err) {
        setError(err.message || 'Error al validar credenciales con Google.');
      }
    };

    exchangeToken();
  }, [searchParams, navigate, login, toast]);

  if (error) {
    return (
      <div className="auth-page" style={{ justifyContent: 'center' }}>
        <div className="auth-form-container" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div className="auth-logo mx-auto">
            <ServinowLogo width={50} height={50} variant="gold" />
          </div>
          <h2 style={{ marginTop: '20px', color: 'var(--danger-color, #ef4444)' }}>Error de Autenticación</h2>
          <p style={{ marginTop: '10px', marginBottom: '20px' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="auth-logo mx-auto heartbeat" style={{ animation: 'pulse 1.5s infinite' }}>
          <ServinowLogo width={60} height={60} variant="gold" />
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
