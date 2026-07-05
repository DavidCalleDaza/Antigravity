import { Link, useLocation } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useStore } from '../../store/useStore';
import AstronautLogo from '../../components/ui/AstronautLogo';

export default function Unauthorized() {
  const { currentUser } = useStore();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-content animate-fadeInLeft">
          <div style={{ margin: '0 auto var(--space-6)', display: 'flex', justifyContent: 'center' }}>
            <AstronautLogo width={56} height={56} />
          </div>
          <h2 className="auth-left-title">Acceso Denegado</h2>
          <p className="auth-left-text">No tienes los permisos necesarios para ver esta página.</p>
          <div className="auth-left-quote">
            "Solo los administradores y vendedores pueden acceder a esta sección."
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container animate-fadeInRight">
          <Link to="/" className="auth-logo">
            <AstronautLogo width={36} height={36} />
            <span className="auth-logo-text">Anti<span>gravity</span></span>
          </Link>

          <div className="unauthorized-icon">
            <ShieldOff width="64" height="64" />
          </div>
          <h1 className="auth-title">Acceso Denegado</h1>
          <p className="auth-subtitle">
            Tu cuenta con rol <strong>{currentUser?.role || 'desconocido'}</strong> no tiene permisos para acceder a esta sección.
          </p>

          <div className="auth-form" style={{ gap: 'var(--space-4)' }}>
            <Link to={from} className="btn btn-primary btn-lg w-full">
              Volver al Dashboard
            </Link>
            <Link to="/" className="btn btn-outline btn-lg w-full">
              Ir al Inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
