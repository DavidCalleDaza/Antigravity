import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Rocket, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import LandingNav from '../../components/layout/LandingNav';
import LandingFooter from '../../components/layout/LandingFooter';
import Helpers from '../../utils/helpers';
import { useStore } from '../../store/useStore';
import { FEATURE_CARDS, BENEFIT_CARDS } from './featureData';
import { contactClient, ApiError } from '../../utils/apiClient';

export default function Landing() {
  const canvasRef = useRef(null);
  const { theme } = useStore();
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactWebsite, setContactWebsite] = useState('');
  const [contactStatus, setContactStatus] = useState('idle');
  const [contactError, setContactError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (contactStatus === 'sending') return;
    setContactStatus('sending');
    setContactError('');
    contactClient
      .send({
        name: contactName,
        email: contactEmail,
        subject: contactSubject,
        message: contactMessage,
      })
      .then(() => {
        setContactStatus('success');
        setContactName('');
        setContactEmail('');
        setContactSubject('');
        setContactMessage('');
      })
      .catch((err) => {
        setContactStatus('error');
        setContactError(
          err instanceof ApiError && err.data?.detail
            ? err.data.detail
            : 'No pudimos enviar tu mensaje. Intenta de nuevo más tarde.'
        );
      });
  };

  useEffect(() => {
    try {
      Helpers.initRevealAnimations();
    } catch (e) {
      console.warn('[Landing] Reveal animations no disponibles:', e.message);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let particles = [];
    let animationFrameId;

    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const createParticle = (origin) => {
      const angle = origin ? Math.random() * Math.PI * 2 : Math.random() * Math.PI * 2;
      const speed = origin ? Math.random() * 0.5 + 0.2 : Math.random() * 0.8 + 0.2;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 0.5,
        baseSize: Math.random() * 3 + 0.5,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        opacity: Math.random() * 0.3 + 0.1,
        baseOpacity: Math.random() * 0.3 + 0.1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01
      };
    };

    const spawnParticle = (x, y) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.5 + 0.5;
      return {
        x: x || Math.random() * canvas.width,
        y: y || Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        baseSize: Math.random() * 2 + 1,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        opacity: Math.random() * 0.4 + 0.2,
        baseOpacity: Math.random() * 0.4 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.03 + 0.015,
        life: 1,
        decaying: true
      };
    };

    for (let i = 0; i < 120; i++) particles.push(createParticle(false));

    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    let mouseInCanvas = false;

    const heroSection = canvas.closest('.hero');
    if (heroSection) {
      heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        mouseInCanvas = true;
      });
      heroSection.addEventListener('mouseleave', () => {
        mouseInCanvas = false;
      });
    }

    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mouseInCanvas) {
        for (let i = 0; i < 2; i++) {
          if (Math.random() < 0.3) {
            particles.push(spawnParticle(mouseX, mouseY));
          }
        }
      }

      particles = particles.filter(p => {
        if (p.decaying) {
          p.life -= 0.015;
          return p.life > 0;
        }
        return true;
      });

      particles.forEach(p => {
        p.pulse += p.pulseSpeed;
        p.opacity = p.baseOpacity * (0.7 + Math.sin(p.pulse) * 0.3);
        p.size = p.baseSize * (0.8 + Math.sin(p.pulse) * 0.2);

        if (mouseInCanvas && !p.decaying) {
          const dx = mouseX - p.x;
          const dy = mouseY - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 150) {
            p.speedX += (dx / dist) * 0.02;
            p.speedY += (dy / dist) * 0.02;
            const maxSpeed = 2;
            const currentSpeed = Math.hypot(p.speedX, p.speedY);
            if (currentSpeed > maxSpeed) {
              p.speedX = (p.speedX / currentSpeed) * maxSpeed;
              p.speedY = (p.speedY / currentSpeed) * maxSpeed;
            }
          }
        }

        p.x += p.speedX;
        p.y += p.speedY;

        const maxSpeed = 1.5;
        const currentSpeed = Math.hypot(p.speedX, p.speedY);
        if (currentSpeed > maxSpeed) {
          p.speedX = (p.speedX / currentSpeed) * maxSpeed;
          p.speedY = (p.speedY / currentSpeed) * maxSpeed;
        }

        const friction = 0.995;
        p.speedX *= friction;
        p.speedY *= friction;

        if (p.x < 0) { p.x = 0; p.speedX *= -0.5; }
        if (p.x > canvas.width) { p.x = canvas.width; p.speedX *= -0.5; }
        if (p.y < 0) { p.y = 0; p.speedY *= -0.5; }
        if (p.y > canvas.height) { p.y = canvas.height; p.speedY *= -0.5; }

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const accentRGB = isLight ? '62, 180, 137' : '201, 165, 90';
        const innerRGB = isLight ? '200, 255, 230' : '255, 235, 180';

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, `rgba(${accentRGB}, ${p.opacity})`);
        gradient.addColorStop(0.5, `rgba(${accentRGB}, ${p.opacity * 0.4})`);
        gradient.addColorStop(1, `rgba(${accentRGB}, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${innerRGB}, ${p.opacity})`;
        ctx.fill();
      });

      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const lineRGB = isLight ? '62, 180, 137' : '201, 165, 90';

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 120) {
            const opacity = (1 - dist / 120) * (isLight ? 0.25 : 0.15);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${lineRGB}, ${opacity})`;
            ctx.lineWidth = isLight ? 0.6 : 0.4;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animateParticles);
    };

    try {
      animateParticles();
    } catch (e) {
      console.warn('[Landing] Animación de partículas no disponible:', e.message);
    }

    try {
      Helpers.initRevealAnimations();
    } catch (e) {
      console.warn('[Landing] Reveal animations no disponibles:', e.message);
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <div className="grid-bg"></div>
      <LandingNav />

      <main>
        <section className="hero" id="hero">
            <div className="hero-bg"></div>
            <div className="hero-orb"></div>
            <div className="hero-orb-2"></div>
            <canvas className="hero-particles" id="hero-canvas" ref={canvasRef}></canvas>
            <div className="hero-content">
              <div className="hero-tag animate-fadeInDown">
                <span className="hero-tag-line"></span>
                Gestión empresarial para comunidades
              </div>
              <h1 className="hero-title animate-fadeInUp">
                Tu negocio merece<br/>
                una plataforma que <em>trabaje</em><br/>
                para ti
              </h1>
              <p className="hero-subtitle animate-fadeInUp delay-2">
                Facturación, inventario, estadísticas y marketing — todo en un solo lugar.
                Para negocios grandes y pequeños, porque todos merecen crecer.
              </p>
              <div className="hero-actions animate-fadeInUp delay-3">
                <Link to="/register" className="btn-primary">
                  Comenzar ahora →
                </Link>
                <a href="#features" className="btn-outline">
                  Conocer más
                </a>
              </div>
            </div>
          </section>

          <div className="marquee-section">
            <div className="marquee-track">
              <div className="marquee-item">Facturación Electrónica</div>
              <div className="marquee-item">Gestión de Inventario</div>
              <div className="marquee-item">Estadísticas en Tiempo Real</div>
              <div className="marquee-item">Agenda Inteligente</div>
              <div className="marquee-item">Estudio de Mercadeo</div>
              <div className="marquee-item">Muro de Impacto</div>
              <div className="marquee-item">Multi-negocio</div>
              <div className="marquee-item">Soporte 24/7</div>
              <div className="marquee-item">Facturación Electrónica</div>
              <div className="marquee-item">Gestión de Inventario</div>
              <div className="marquee-item">Estadísticas en Tiempo Real</div>
              <div className="marquee-item">Agenda Inteligente</div>
              <div className="marquee-item">Estudio de Mercadeo</div>
              <div className="marquee-item">Muro de Impacto</div>
              <div className="marquee-item">Multi-negocio</div>
              <div className="marquee-item">Soporte 24/7</div>
            </div>
          </div>

          <section className="section" id="features">
            <div className="container">
              <div className="features-header">
                <div>
                  <div className="section-label reveal">Funcionalidades</div>
                  <h2 className="reveal reveal-delay-1">Todo lo que tu<br/><em>negocio necesita</em></h2>
                </div>
                <p className="section-intro reveal reveal-delay-2">
                  Herramientas profesionales centralizadas para que te enfokes en lo que realmente importa: servir a tu comunidad y hacer crecer tu negocio.
                </p>
              </div>
              <div className="features-grid">
                {FEATURE_CARDS.map((card, index) => {
                  const IconComponent = card.icon;
                  const delayClass = index < 3 ? `reveal-delay-${index + 1}` : `reveal-delay-${(index % 3) + 1}`;
                  return (
                    <div
                      key={card.id}
                      className={`feature-card reveal ${delayClass}`}
                    >
                      <div className="feature-number">0{index + 1} — {card.title.split(' ')[0]}</div>
                      <div className="feature-icon">
                        <IconComponent width="28" height="28" />
                      </div>
                      <h3 className="feature-title">{card.title}</h3>
                      <p className="feature-text">{card.shortDescription}</p>
                      <div className="feature-tags">
                        {card.tags.map(tag => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="section model-section" id="model">
            <div className="container">
              <div className="model-grid">
                <div>
                  <div className="section-label reveal">Modelo de Negocio</div>
                  <h2 className="reveal reveal-delay-1">Cómo funciona<br/><em>DonApp</em></h2>
                  <p className="section-intro reveal reveal-delay-2" style={{marginBottom: 'clamp(28px,5vw,56px)'}}>
                    Un ecosistema donde crecer y dar van de la mano. Cada negocio que usa DonApp contribuye al bienestar de su comunidad.
                  </p>
                  <div className="model-steps">
                    <div className="model-step reveal reveal-delay-1">
                      <span className="step-num">01</span>
                      <div className="step-content">
                        <h4>Registro Gratuito</h4>
                        <p>Tu negocio de barrio, tu emprendimiento, tu tienda — accede gratis a herramientas profesionales de gestión.</p>
                      </div>
                    </div>
                    <div className="model-step reveal reveal-delay-2">
                      <span className="step-num">02</span>
                      <div className="step-content">
                        <h4>Gestiona sin complejidad</h4>
                        <p>Factura, controla inventario, analiza estadísticas y planifica tu crecimiento — todo en una sola plataforma.</p>
                      </div>
                    </div>
                    <div className="model-step reveal reveal-delay-3">
                      <span className="step-num">03</span>
                      <div className="step-content">
                        <h4>Dona lo que puedas</h4>
                        <p>Productos, servicios, tiempo — cada aporte cuenta. Sin montos mínimos, sin presiones. El impacto se construye con pequeños gestos.</p>
                      </div>
                    </div>
                    <div className="model-step reveal reveal-delay-4">
                      <span className="step-num">04</span>
                      <div className="step-content">
                        <h4>Impacto real en la comunidad</h4>
                        <p>Tus contribuciones llegan a quienes más lo necesitan. La comunidad crece contigo y DonApp crece con todos.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="model-visual reveal reveal-delay-3">
                  <div className="model-ring"><div className="orbit-dot"></div></div>
                  <div className="model-ring"><div className="orbit-dot"></div></div>
                  <div className="model-ring"><div className="orbit-dot"></div></div>
                  <div className="model-center">
                    <HeartHandshake width="32" height="32" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="section" id="benefits">
            <div className="container">
              <div className="benefits-header">
                <div className="section-label reveal">Ventajas</div>
                <h2 className="reveal reveal-delay-1">Por qué elegir<br/><em>DonApp</em></h2>
                <p className="section-intro reveal reveal-delay-2">
                  No es solo un software. Es una comunidad de negocios que demuestran que servir es el único negocio donde todos ganan.
                </p>
              </div>
              <div className="benefits-grid">
                {BENEFIT_CARDS.map((benefit, index) => {
                  const delayClass = `reveal-delay-${index + 1}`;
                  return (
                    <div
                      key={benefit.id}
                      className={`benefit-card reveal ${delayClass}`}
                    >
                      <div className="benefit-icon">
                        {benefit.icon === 'building' && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24"><path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>
                        )}
                        {benefit.icon === 'dollar' && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        )}
                        {benefit.icon === 'chart' && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24"><path d="M3 3v18h18M7 16l4-8 4 5 5-9"/></svg>
                        )}
                        {benefit.icon === 'users' && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        )}
                      </div>
                      <h4>{benefit.title}</h4>
                      <p>{benefit.shortDescription}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="section impact-section" id="impact">
            <div className="container">
              <div className="impact-header">
                <div className="section-label reveal">Impacto</div>
                <h2 className="reveal reveal-delay-1">El ciclo que<br/><em>transforma vidas</em></h2>
                <p className="section-intro reveal reveal-delay-2" style={{maxWidth: '580px', margin: '0 auto'}}>
                  No es caridad. Es un ecosistema donde crecer y dar van de la mano. Cada negocio que se une a DonApp fortalece este ciclo virtuoso.
                </p>
              </div>
              <div className="impact-cards">
                <div className="impact-card reveal reveal-delay-1">
                  <div className="impact-card-number">127+</div>
                  <div className="impact-card-label">Negocios activos en la plataforma</div>
                </div>
                <div className="impact-card reveal reveal-delay-2">
                  <div className="impact-card-number">340</div>
                  <div className="impact-card-label">Familias impactadas por donaciones</div>
                </div>
                <div className="impact-card reveal reveal-delay-3">
                  <div className="impact-card-number">2,150</div>
                  <div className="impact-card-label">Productos donados a comunidades</div>
                </div>
              </div>
            </div>
          </section>

          <section className="section philosophy-section" id="philosophy">
            <div className="container">
              <div className="philosophy-content reveal">
                <p className="philosophy-quote">
                  No buscamos aplausos. No buscamos vitrinas. DonApp existe porque servir es el único negocio donde todos ganan — incluso quienes nadie ve.
                </p>
                <p className="philosophy-author">— El equipo detrás de DonApp</p>
              </div>
            </div>
          </section>

          <section className="section team-section" id="team">
            <div className="container">
              <div className="team-header">
                <div className="section-label reveal">Colaboradores</div>
                <h2 className="reveal reveal-delay-1">El equipo detrás<br/><em>de DonApp</em></h2>
              </div>
              <div className="team-grid">
                <div className="team-card reveal reveal-delay-1">
                  <div className="team-photo">
                    <img src="/assets/foto_david.png" alt="David" loading="lazy" />
                  </div>
                  <h3 className="team-name">David</h3>
                  <p className="team-role">Fullstack Developer &amp; Senior QA Automation</p>
                </div>
                <div className="team-card reveal reveal-delay-2">
                  <div className="team-photo">
                    <img src="/assets/foto_rodrigo.png" alt="Rodrigo" loading="lazy" />
                  </div>
                  <h3 className="team-name">Rodrigo</h3>
                  <p className="team-role">Fullstack Developer — Estadísticas &amp; Facturación</p>
                </div>
                <div className="team-card reveal reveal-delay-3">
                  <div className="team-photo">
                    <img src="/assets/foto_pamela.png" alt="Pamela" loading="lazy" />
                  </div>
                  <h3 className="team-name">Pamela</h3>
                  <p className="team-role">Scrum Master</p>
                </div>
              </div>
            </div>
          </section>

          <section className="section cta-section" id="cta">
            <div className="container">
              <div className="cta-box reveal">
                <div className="section-label reveal">Únete</div>
                <h2 className="reveal reveal-delay-1">¿Listo para hacer<br/><em>crecer tu negocio</em>?</h2>
                <p className="section-intro reveal reveal-delay-2" style={{maxWidth: '500px', margin: '0 auto'}}>
                  Únete a la comunidad de negocios que demuestran que crecer y dar pueden ir de la mano. Comienza gratis hoy.
                </p>
                <div className="cta-actions reveal reveal-delay-3">
                  <Link to="/register" className="btn-primary btn-lg">
                    <Rocket width="18" height="18" />
                    Crear cuenta gratuita
                  </Link>
                  <a href="#features" className="btn-outline btn-lg">
                    Conocer más
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="section" id="contact">
            <div className="container">
              <div className="contact-wrap">
                <div className="contact-left">
                  <div className="section-label reveal">Contacto</div>
                  <h2 className="reveal reveal-delay-1">¿Tienes alguna<br/><em>duda</em>?</h2>
                  <p className="reveal reveal-delay-2">
                    Estamos aquí para escucharte y ayudarte a transformar tu comunidad. Escríbenos y te responderemos lo antes posible.
                  </p>
                  <div className="contact-detail reveal reveal-delay-3">
                    <div className="contact-item contact-item-disabled" aria-disabled="true" title="Próximamente">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" width="17" height="17"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      <span>hola@donapp.com</span>
                    </div>
                    <div className="contact-item contact-item-disabled" aria-disabled="true" title="Próximamente">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" width="17" height="17"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 12 19.79 19.79 0 0 1 1.27 3.18 2 2 0 0 1 3.24 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/></svg>
                      <span>+57 300 000 0000</span>
                    </div>
                  </div>
                </div>
                <div className="reveal reveal-delay-2">
                  <form className="contact-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Nombre</label>
                        <input
                          type="text"
                          placeholder="Tu nombre"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Correo electrónico</label>
                        <input
                          type="email"
                          placeholder="tu@correo.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Asunto</label>
                      <select
                        value={contactSubject}
                        onChange={(e) => setContactSubject(e.target.value)}
                        required
                      >
                        <option value="">Selecciona una opción...</option>
                        <option value="usar_donapp">Quiero usar DonApp</option>
                        <option value="integrar_negocio">Tengo un negocio y quiero integrarme</option>
                        <option value="donacion">Quiero hacer una donación</option>
                        <option value="modelo_impacto">Preguntas sobre el modelo de impacto</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Cuéntanos más</label>
                      <textarea
                        placeholder="¿Cómo podemos ayudarte?"
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        required
                      ></textarea>
                    </div>
                    <div className="form-group honeypot" aria-hidden="true">
                      <label>Tu sitio web</label>
                      <input
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={contactWebsite}
                        onChange={(e) => setContactWebsite(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="submit-btn" disabled={contactStatus === 'sending'}>
                      {contactStatus === 'sending' ? (
                        <>
                          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...
                        </>
                      ) : (
                        'Enviar mensaje →'
                      )}
                    </button>
                    {contactStatus === 'success' && (
                      <p className="form-feedback form-feedback-success">
                        <CheckCircle2 size={18} /> ¡Gracias! Recibimos tu mensaje y te responderemos pronto.
                      </p>
                    )}
                    {contactStatus === 'error' && (
                      <p className="form-feedback form-feedback-error">
                        <AlertCircle size={18} /> {contactError}
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </section>

          <LandingFooter />
        </main>
    </>
  );
}