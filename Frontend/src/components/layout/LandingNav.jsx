import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import ServinowLogo from '../ui/ServinowLogo';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const { toggleTheme: originalToggle } = useStore();
  const toggleTheme = () => {
    console.log("Logo clicked, toggling theme");
    originalToggle();
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.querySelector(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`} id="landing-nav">
      <div className="landing-logo" onClick={toggleTheme} style={{ cursor: "pointer" }}>
        <ServinowLogo width={56} height={56} variant="auto" />
      </div>

      <div className="landing-links">
        <a href="#features" className="landing-link" onClick={(e) => scrollToSection(e, '#features')}>Funcionalidades</a>
        <a href="#impact" className="landing-link" onClick={(e) => scrollToSection(e, '#impact')}>Impacto</a>
        <a href="#philosophy" className="landing-link" onClick={(e) => scrollToSection(e, '#philosophy')}>Filosofía</a>
        <a href="#contact" className="landing-link" onClick={(e) => scrollToSection(e, '#contact')}>Contactanos</a>
      </div>

      <div className="landing-cta-group">
        <Link to="/login" className="btn btn-ghost">Iniciar Sesión</Link>
        <Link to="/register" className="btn btn-primary">Comenzar Gratis</Link>
      </div>
    </nav>
  );
}
