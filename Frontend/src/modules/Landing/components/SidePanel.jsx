import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function SidePanel({ isOpen, onClose, data }) {
  // Prevent scrolling when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="side-panel-overlay" onClick={onClose} />
      <div className={`side-panel ${isOpen ? 'open' : ''}`}>
        <div className="side-panel-header">
          <button className="side-panel-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="side-panel-content">
          {data && (
            <>
              <div className="side-panel-icon">
                <data.icon size={48} />
              </div>
              <h2 className="side-panel-title">{data.title}</h2>
              <div className="side-panel-divider" />
              <p className="side-panel-description">{data.detailedInfo}</p>
              
              <div className="side-panel-benefits">
                <h3>Beneficios clave:</h3>
                <ul>
                  {data.benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
        
        <div className="side-panel-footer">
          <button className="btn-gold" onClick={onClose}>Entendido</button>
        </div>
      </div>
    </>
  );
}
