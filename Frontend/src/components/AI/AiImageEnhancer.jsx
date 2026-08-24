import React, { useState } from 'react';
import { Sparkles, Zap, CheckCircle } from 'lucide-react';

/**
 * AiImageEnhancer — "Próximamente"
 *
 * El endpoint /ai/enhance-image existe y funciona, pero por decisión de producto
 * esta funcionalidad se presenta como "Próximamente" con un mockup visual.
 * El formulario funcional está comentado aquí para reactivarlo cuando se decida.
 */
export default function AiImageEnhancer({ imageBlob }) {
  const [previewSrc, setPreviewSrc] = useState(null);

  // Generate a preview URL from the imageBlob prop (the "before" side)
  React.useEffect(() => {
    if (!imageBlob) {
      setPreviewSrc(null);
      return;
    }
    const url = URL.createObjectURL(imageBlob);
    setPreviewSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [imageBlob]);

  const FEATURES = [
    'Nitidez y detalle mejorados automáticamente',
    'Corrección de iluminación y balance de blancos',
    'Eliminación de ruido digital',
    'Colores más vibrantes y naturales',
    'Formato optimizado para cada red social',
  ];

  return (
    <div className="ai-enhancer-card">
      {/* Header */}
      <div className="ai-enhancer-header">
        <div className="ai-enhancer-icon">
          <Sparkles width={20} height={20} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4 className="ai-enhancer-title">Mejorar imagen con IA</h4>
            <span className="ai-enhancer-badge">Próximamente</span>
          </div>
          <p className="ai-enhancer-subtitle">
            Gemini mejorará automáticamente la calidad visual de tu imagen antes de publicar.
          </p>
        </div>
      </div>

      {/* Before / After preview */}
      <div className="ai-enhancer-preview">
        {/* Before */}
        <div className="ai-enhancer-side">
          <div className="ai-enhancer-side-label">Antes</div>
          <div className="ai-enhancer-img-frame ai-enhancer-img-frame--before">
            {previewSrc ? (
              <img src={previewSrc} alt="Imagen actual" className="ai-enhancer-img" />
            ) : (
              <div className="ai-enhancer-img-placeholder">
                <Sparkles width={24} height={24} />
                <span>Sin imagen</span>
              </div>
            )}
          </div>
        </div>

        {/* Arrow separator */}
        <div className="ai-enhancer-arrow">
          <Zap width={20} height={20} />
        </div>

        {/* After — shimmer placeholder */}
        <div className="ai-enhancer-side">
          <div className="ai-enhancer-side-label">Después</div>
          <div className="ai-enhancer-img-frame ai-enhancer-img-frame--after">
            <div className="ai-enhancer-shimmer-img" />
            <div className="ai-enhancer-shimmer-overlay">
              <Sparkles width={18} height={18} />
              <span>IA mejorada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature list */}
      <div className="ai-enhancer-features">
        {FEATURES.map((feat, i) => (
          <div key={i} className="ai-enhancer-feature-row">
            <CheckCircle width={14} height={14} className="ai-enhancer-feature-icon" />
            <span>{feat}</span>
          </div>
        ))}
      </div>

      <style>{`
        .ai-enhancer-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px;
          background: var(--neutral-800);
          border: 1px solid var(--neutral-700);
          border-radius: 12px;
        }
        [data-theme="light"] .ai-enhancer-card {
          background: var(--gold-dim);
          border-color: var(--gold);
        }
        .ai-enhancer-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .ai-enhancer-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          background: linear-gradient(135deg, var(--gold), #b8860b);
          border-radius: 10px;
          color: #fff;
        }
        .ai-enhancer-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        [data-theme="light"] .ai-enhancer-title { color: #121212; }
        .ai-enhancer-badge {
          font-size: 0.65rem;
          background: var(--gold);
          color: #fff;
          padding: 2px 8px;
          border-radius: 999px;
          font-weight: 600;
          white-space: nowrap;
        }
        .ai-enhancer-subtitle {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 4px 0 0;
          line-height: 1.4;
        }

        /* Before/After */
        .ai-enhancer-preview {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ai-enhancer-side {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ai-enhancer-side-label {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-tertiary);
          text-align: center;
        }
        .ai-enhancer-img-frame {
          border-radius: 8px;
          overflow: hidden;
          height: 100px;
          border: 1px solid var(--neutral-700);
          position: relative;
        }
        .ai-enhancer-img-frame--after {
          border-style: dashed;
          border-color: var(--gold);
        }
        .ai-enhancer-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .ai-enhancer-img-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: var(--neutral-900);
          color: var(--text-tertiary);
          font-size: 0.7rem;
        }
        .ai-enhancer-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gold);
          flex-shrink: 0;
        }
        /* Shimmer for "After" */
        .ai-enhancer-shimmer-img {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            var(--neutral-700) 0%,
            var(--neutral-600) 40%,
            var(--neutral-700) 60%,
            var(--neutral-600) 100%
          );
          background-size: 200% 200%;
          animation: enhancer-shimmer 2s ease-in-out infinite;
        }
        @keyframes enhancer-shimmer {
          0%   { background-position: 0% 0%; }
          50%  { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }
        [data-theme="light"] .ai-enhancer-shimmer-img {
          background: linear-gradient(
            135deg,
            #e5e7eb 0%,
            #f3f4f6 40%,
            #e5e7eb 60%,
            #f3f4f6 100%
          );
          background-size: 200% 200%;
          animation: enhancer-shimmer 2s ease-in-out infinite;
        }
        .ai-enhancer-shimmer-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: var(--gold);
          font-size: 0.7rem;
          font-weight: 600;
        }

        /* Feature list */
        .ai-enhancer-features {
          display: flex;
          flex-direction: column;
          gap: 6px;
          border-top: 1px solid var(--neutral-700);
          padding-top: 12px;
        }
        [data-theme="light"] .ai-enhancer-features { border-color: var(--border-color); }
        .ai-enhancer-feature-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .ai-enhancer-feature-icon {
          color: var(--gold);
          flex-shrink: 0;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}
