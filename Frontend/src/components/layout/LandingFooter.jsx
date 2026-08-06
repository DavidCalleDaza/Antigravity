import { Link } from 'react-router-dom';
import DonAppLogo from '../ui/DonAppLogo';

export default function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="footer-grid">
        <div>
          <div className="landing-logo">
            <DonAppLogo width={40} height={40} variant="gold" />
          </div>
          <p className="footer-brand-text">Tecnología que sirve. Un gestor de productos y servicios pensado para los negocios que mueven la economía real de un país.</p>
        </div>
        <div>
          <h4 className="footer-section-title">Plataforma</h4>
          <div className="footer-links">
            <a href="#features" className="footer-link">Funcionalidades</a>
            <a href="#impact" className="footer-link">Modelo de Impacto</a>
            <Link to="/register" className="footer-link">Registrarse</Link>
          </div>
        </div>
        <div>
          <h4 className="footer-section-title">Recursos</h4>
          <div className="footer-links">
            <a href="#" className="footer-link">Documentación</a>
            <a href="#" className="footer-link">Guía de Inicio</a>
            <a href="#" className="footer-link">Soporte</a>
          </div>
        </div>
        <div>
          <h4 className="footer-section-title">Comunidad</h4>
          <div className="footer-links">
            <Link to="/wall" className="footer-link">Muro Social</Link>
            <a href="#" className="footer-link">Historias de Impacto</a>
            <a href="#" className="footer-link">Contacto</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} DonApp. Hecho con propósito desde Colombia.</p>
      </div>
    </footer>
  );
}
