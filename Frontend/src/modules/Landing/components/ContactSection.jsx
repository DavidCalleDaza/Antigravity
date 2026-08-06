import { Mail, MessageCircle, Linkedin, MapPin, Send } from 'lucide-react';

export default function ContactSection() {
  return (
    <section className="contact-section" id="contacto">
      <div className="container">
        <span className="section-label">Contacto</span>
        <h2 className="hero-title">¿Tienes alguna duda? <span>Estamos aquí para escucharte</span></h2>
        
        <div className="contact-grid">
          <div className="contact-info">
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

          <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input type="text" className="form-input" placeholder="Ej. Juan Pérez" />
            </div>
            
            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input type="email" className="form-input" placeholder="tu@email.com" />
            </div>
            
            <div className="form-group">
              <label className="form-label">Mensaje</label>
              <textarea className="form-input" rows="4" placeholder="¿En qué podemos ayudarte?"></textarea>
            </div>
            
            <button type="submit" className="btn-gold btn-submit">
              Enviar Mensaje <Send size={18} style={{ marginLeft: '10px' }} />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
