import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import ContactSection from './components/ContactSection';
import FeaturesSection from './components/FeaturesSection';
import SidePanel from './components/SidePanel';

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    console.log('Switching theme to:', theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = (e) => {
    e.preventDefault(); // Evitamos la navegación para asegurar que el tema cambie
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // State for Side Panel
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleFeatureClick = (feature) => {
    setSelectedFeature(feature);
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  return (
    <div className="landing-page">
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="landing-logo" onClick={toggleTheme}>
          Servi<span>now</span>
        </Link>

        <div className="landing-links">
          <a href="#servicios" className="landing-link">Servicios</a>
          <a href="#impacto" className="landing-link">Impacto</a>
          <a href="#contacto" className="landing-link">Contacto</a>
        </div>
        <div className="landing-cta">
          <Link to="/login" className="btn-gold">Entrar</Link>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="container">
            <h1 className="hero-title">
              Gestiona tu negocio. <span>Transforma tu comunidad.</span>
            </h1>
            <p className="hero-subtitle">
              Facturación, inventario y estadísticas en un solo lugar. La herramienta definitiva para negocios que sirven.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn-gold" style={{ fontSize: '1.1rem', padding: '16px 40px' }}>
                Comenzar Gratis <ArrowUpRight size={20} style={{ marginLeft: '8px' }} />
              </Link>
            </div>
          </div>
        </section>

        {/* Nueva Sección de Ventajas */}
        <FeaturesSection onFeatureClick={handleFeatureClick} />

        {/* Sección de Contacto Mejorada */}
        <ContactSection />
      </main>

      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={closePanel} 
        data={selectedFeature} 
      />

      <footer className="landing-footer" style={{ textAlign: 'center', padding: '40px', borderTop: '1px solid var(--line)', color: 'var(--muted)' }}>
        <p>&copy; 2026 DonApp. Servir es el único negocio donde todos ganan.</p>
      </footer>
    </div>
  );
}
