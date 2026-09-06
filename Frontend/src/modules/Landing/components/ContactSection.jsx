import { useState } from 'react';
import { Mail, MessageCircle, Linkedin, MapPin, Send, CheckCircle, AlertCircle, Loader } from 'lucide-react';

import { getApiBaseUrl } from '../../../../utils/urlHelper';

const SUBJECTS = [
  { value: 'usar_donapp',       label: 'Quiero usar DonApp' },
  { value: 'integrar_negocio',  label: 'Tengo un negocio y quiero integrarme' },
  { value: 'donacion',          label: 'Quiero hacer una donación' },
  { value: 'modelo_impacto',    label: 'Preguntas sobre el modelo de impacto' },
  { value: 'otro',              label: 'Otro' },
];

export default function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [feedback, setFeedback] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = 'El nombre debe tener al menos 2 caracteres.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Ingresa un correo electrónico válido.';
    if (!form.subject)
      errs.subject = 'Selecciona un asunto.';
    if (!form.message.trim() || form.message.trim().length < 10)
      errs.message = 'El mensaje debe tener al menos 10 caracteres.';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setStatus('loading');
    setFeedback('');

    try {
      const res = await fetch(`${getApiBaseUrl()}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('success');
        setFeedback(data.detail || '¡Gracias! Recibimos tu mensaje y te responderemos pronto.');
        setForm({ name: '', email: '', subject: '', message: '', website: '' });
        setErrors({});
      } else {
        setStatus('error');
        setFeedback(data.detail || 'Ocurrió un error al enviar tu mensaje. Intenta de nuevo.');
      }
    } catch {
      setStatus('error');
      setFeedback('No pudimos conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
    }
  };

  return (
    <section className="contact-section" id="contacto">
      <div className="container">
        <span className="section-label">Contacto</span>
        <h2 className="hero-title">¿Tienes alguna <span>duda?</span></h2>

        <div className="contact-grid">
          <div className="contact-info">
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.7 }}>
              Estamos aquí para escucharte y ayudarte a transformar tu comunidad. Escríbenos y te responderemos lo antes posible.
            </p>

            <a href="mailto:hola@donapp.com" className="contact-card">
              <div className="contact-icon"><Mail size={24} /></div>
              <div className="contact-details">
                <h4>Email</h4>
                <p>hola@donapp.com</p>
              </div>
            </a>

            <a href="https://wa.me/573000000000" className="contact-card">
              <div className="contact-icon"><MessageCircle size={24} /></div>
              <div className="contact-details">
                <h4>WhatsApp</h4>
                <p>+57 300 000 0000</p>
              </div>
            </a>

            <a href="https://linkedin.com/in/davidcalle" className="contact-card">
              <div className="contact-icon"><Linkedin size={24} /></div>
              <div className="contact-details">
                <h4>LinkedIn</h4>
                <p>davidcalle</p>
              </div>
            </a>

            <div className="contact-card">
              <div className="contact-icon"><MapPin size={24} /></div>
              <div className="contact-details">
                <h4>Ubicación</h4>
                <p>Bogotá, Colombia</p>
              </div>
            </div>
          </div>

          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            {/* Honeypot — invisible para humanos */}
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={handleChange}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />

            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input
                type="text"
                name="name"
                className={`form-input${errors.name ? ' input-error' : ''}`}
                placeholder="Ej. Juan Pérez"
                value={form.name}
                onChange={handleChange}
                disabled={status === 'loading'}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input
                type="email"
                name="email"
                className={`form-input${errors.email ? ' input-error' : ''}`}
                placeholder="tu@email.com"
                value={form.email}
                onChange={handleChange}
                disabled={status === 'loading'}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Asunto</label>
              <select
                name="subject"
                className={`form-input${errors.subject ? ' input-error' : ''}`}
                value={form.subject}
                onChange={handleChange}
                disabled={status === 'loading'}
              >
                <option value="">Selecciona un asunto…</option>
                {SUBJECTS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {errors.subject && <span className="field-error">{errors.subject}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Cuéntanos más</label>
              <textarea
                name="message"
                className={`form-input${errors.message ? ' input-error' : ''}`}
                rows="4"
                placeholder="¿En qué podemos ayudarte?"
                value={form.message}
                onChange={handleChange}
                disabled={status === 'loading'}
              />
              {errors.message && <span className="field-error">{errors.message}</span>}
            </div>

            {feedback && (
              <div className={`contact-feedback ${status === 'success' ? 'feedback-success' : 'feedback-error'}`}>
                {status === 'success'
                  ? <CheckCircle size={18} style={{ flexShrink: 0 }} />
                  : <AlertCircle size={18} style={{ flexShrink: 0 }} />}
                <span>{feedback}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-gold btn-submit"
              disabled={status === 'loading' || status === 'success'}
            >
              {status === 'loading' ? (
                <><Loader size={18} className="spin" style={{ marginRight: '10px' }} /> Enviando…</>
              ) : status === 'success' ? (
                <><CheckCircle size={18} style={{ marginRight: '10px' }} /> ¡Mensaje enviado!</>
              ) : (
                <>Enviar Mensaje <Send size={18} style={{ marginLeft: '10px' }} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
