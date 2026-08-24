import React from 'react';
import { Video, Film, Zap, Clock, Wand2, PlayCircle } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export default function AiVideoGenerator({ item, imageBlob, onVideoGenerated }) {
  const toast = useToast();

  const handleDisabledClick = () => {
    toast.info(
      'La generación de video con IA estará disponible próximamente. Estamos trabajando en esta funcionalidad.',
      'Próximamente'
    );
  };

  const PLANNED_FEATURES = [
    { icon: Film,  text: 'Video de 5–8 segundos generado con Google Veo' },
    { icon: Zap,   text: 'Animaciones cinematográficas desde tu imagen' },
    { icon: Clock, text: 'Listo en 2–4 minutos en segundo plano' },
    { icon: Wand2, text: 'Caption y música generados automáticamente' },
  ];

  return (
    <div className="ai-video-preview-card">
      {/* Header */}
      <div className="ai-video-preview-header">
        <div className="ai-video-preview-icon">
          <Video width={22} height={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4 className="ai-video-preview-title">Video con IA</h4>
            <span className="ai-video-preview-engine">Google Veo</span>
            <span className="ai-video-preview-badge">Próximamente</span>
          </div>
          <p className="ai-video-preview-subtitle">
            Convierte tu imagen en un video corto y cinematográfico con inteligencia artificial generativa.
          </p>
        </div>
      </div>

      {/* Mockup player */}
      <div className="ai-video-preview-player" onClick={handleDisabledClick}>
        {imageBlob ? (
          <img
            src={URL.createObjectURL(imageBlob)}
            alt="Preview del video"
            className="ai-video-preview-thumb"
          />
        ) : (
          <div className="ai-video-preview-placeholder">
            <Video width={36} height={36} />
          </div>
        )}
        <div className="ai-video-preview-overlay">
          <div className="ai-video-preview-play">
            <PlayCircle width={48} height={48} />
          </div>
          <span className="ai-video-preview-coming-soon">Próximamente</span>
        </div>
      </div>

      {/* Planned features */}
      <div className="ai-video-preview-features">
        <div className="ai-video-preview-features-label">Qué podrás hacer</div>
        {PLANNED_FEATURES.map(({ icon: Icon, text }, i) => (
          <div key={i} className="ai-video-preview-feature">
            <div className="ai-video-preview-feature-icon">
              <Icon width={14} height={14} />
            </div>
            <span>{text}</span>
          </div>
        ))}
      </div>

      {/* CTA button (disabled) */}
      <button
        type="button"
        className="ai-video-preview-cta"
        onClick={handleDisabledClick}
        title="Próximamente — En desarrollo"
      >
        <Video width={16} height={16} />
        Generar video con IA
        <span className="ai-video-preview-cta-badge">Próximamente</span>
      </button>

      <style>{`
        .ai-video-preview-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px;
          background: var(--neutral-800);
          border: 1px solid var(--neutral-700);
          border-radius: 12px;
        }
        [data-theme="light"] .ai-video-preview-card {
          background: var(--gold-dim);
          border-color: var(--gold);
        }

        .ai-video-preview-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .ai-video-preview-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 10px;
          color: #fff;
        }
        .ai-video-preview-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        [data-theme="light"] .ai-video-preview-title { color: #121212; }
        .ai-video-preview-engine {
          font-size: 0.65rem;
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          padding: 2px 7px;
          border-radius: 999px;
          font-weight: 600;
          border: 1px solid rgba(99, 102, 241, 0.3);
          white-space: nowrap;
        }
        .ai-video-preview-badge {
          font-size: 0.65rem;
          background: var(--gold);
          color: #fff;
          padding: 2px 8px;
          border-radius: 999px;
          font-weight: 600;
          white-space: nowrap;
        }
        .ai-video-preview-subtitle {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 4px 0 0;
          line-height: 1.4;
        }

        /* Player mockup */
        .ai-video-preview-player {
          position: relative;
          width: 100%;
          height: 140px;
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          background: var(--neutral-900);
          border: 1px solid var(--neutral-700);
        }
        .ai-video-preview-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          filter: brightness(0.6) blur(1px);
          transition: filter 0.2s;
        }
        .ai-video-preview-player:hover .ai-video-preview-thumb {
          filter: brightness(0.5) blur(2px);
        }
        .ai-video-preview-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--neutral-800), var(--neutral-900));
          color: var(--text-tertiary);
        }
        .ai-video-preview-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .ai-video-preview-play {
          color: rgba(255,255,255,0.7);
          transition: color 0.2s, transform 0.2s;
        }
        .ai-video-preview-player:hover .ai-video-preview-play {
          color: rgba(255,255,255,0.9);
          transform: scale(1.1);
        }
        .ai-video-preview-coming-soon {
          font-size: 0.75rem;
          font-weight: 700;
          color: rgba(255,255,255,0.8);
          background: rgba(0,0,0,0.4);
          padding: 3px 10px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Features */
        .ai-video-preview-features {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 1px solid var(--neutral-700);
          padding-top: 12px;
        }
        [data-theme="light"] .ai-video-preview-features { border-color: var(--border-color); }
        .ai-video-preview-features-label {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-tertiary);
          margin-bottom: 2px;
        }
        .ai-video-preview-feature {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.78rem;
          color: var(--text-secondary);
        }
        .ai-video-preview-feature-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          flex-shrink: 0;
          background: rgba(99, 102, 241, 0.12);
          border-radius: 6px;
          color: #818cf8;
        }

        /* CTA */
        .ai-video-preview-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          border: 1px solid var(--neutral-700);
          background: var(--neutral-900);
          color: var(--text-tertiary);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: all 0.15s ease;
          opacity: 0.8;
        }
        .ai-video-preview-cta:hover {
          border-color: var(--gold);
          color: var(--gold);
          opacity: 1;
        }
        [data-theme="light"] .ai-video-preview-cta {
          background: #f9fafb;
          border-color: var(--border-color);
        }
        .ai-video-preview-cta-badge {
          font-size: 0.6rem;
          background: var(--gold);
          color: #fff;
          padding: 1px 6px;
          border-radius: 999px;
          font-weight: 700;
          margin-left: 4px;
        }
      `}</style>
    </div>
  );
}
