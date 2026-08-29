import React, { useState } from 'react';
import { Sparkles, Loader2, Wand2, Check } from 'lucide-react';
import { aiClient } from '../../utils/apiClient';

const TONES = [
  { value: 'persuasivo', label: '🎯 Persuasivo', desc: 'Convierte y vende' },
  { value: 'formal',     label: '💼 Formal',     desc: 'Profesional y serio' },
  { value: 'divertido',  label: '🎉 Divertido',  desc: 'Ligero y cercano' },
  { value: 'urgente',    label: '⚡ Urgente',    desc: 'Genera FOMO' },
];

export default function AiCopyGenerator({ item, onGenerated }) {
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState('persuasivo');
  const [variants, setVariants] = useState([]);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!item) return;
    setLoading(true);
    setError(null);
    setVariants([]);

    try {
      const promises = [
        aiClient.generateCopy({ product_name: item.name, description: item.description || '', tone }),
        aiClient.generateCopy({ product_name: item.name, description: item.description || '', tone }),
        aiClient.generateCopy({ product_name: item.name, description: item.description || '', tone }),
      ];

      const results = await Promise.allSettled(promises);
      const successfulTexts = results
        .filter((r) => r.status === 'fulfilled' && r.value?.text)
        .map((r) => r.value.text);

      if (successfulTexts.length > 0) {
        setVariants(successfulTexts);
      } else {
        setError('No se pudieron generar opciones de texto. Intenta de nuevo.');
      }
    } catch (err) {
      console.error('Error generating AI copy variants:', err);
      setError(err.detail || err.message || 'Error al conectar con la IA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-copy-card">
      {/* Header */}
      <div className="ai-copy-header">
        <div className="ai-copy-header-icon">
          <Sparkles width={18} height={18} />
        </div>
        <div>
          <h4 className="ai-copy-title">Generar textos con IA</h4>
          <p className="ai-copy-subtitle">
            Selecciona un tono y la IA creará 3 variantes de caption para tus redes.
          </p>
        </div>
      </div>

      {/* Tone selector — subtle chip pills */}
      <div className="ai-copy-tone-label">Tono del mensaje</div>
      <div className="ai-copy-tones">
        {TONES.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`ai-copy-tone-chip ${tone === t.value ? 'ai-copy-tone-chip--active' : ''}`}
            onClick={() => setTone(t.value)}
            disabled={loading}
            title={t.desc}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Generate button */}
      <button
        type="button"
        className="ai-copy-generate-btn"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 width={16} height={16} className="spin" />
            Generando 3 opciones con IA…
          </>
        ) : (
          <>
            <Wand2 width={16} height={16} />
            Generar 3 opciones
          </>
        )}
      </button>

      {/* Loading shimmer */}
      {loading && (
        <div className="ai-copy-shimmer">
          <div className="ai-copy-shimmer-line ai-copy-shimmer-line--long" />
          <div className="ai-copy-shimmer-line ai-copy-shimmer-line--mid" />
          <div className="ai-copy-shimmer-line ai-copy-shimmer-line--short" />
        </div>
      )}

      {/* Error */}
      {error && <div className="ai-copy-error">⚠️ {error}</div>}

      {/* Render 3 Variants */}
      {variants.length > 0 && !loading && (
        <div className="ai-copy-variants">
          <div className="text-xs font-semibold text-gold mb-2 uppercase tracking-wide">
            Selecciona la opción que prefieras:
          </div>
          <div className="flex flex-col gap-3">
            {variants.map((varText, idx) => (
              <div
                key={idx}
                className="ai-variant-card"
                onClick={() => onGenerated(varText)}
              >
                <div className="ai-variant-card-header">
                  <span className="ai-variant-badge">Opción {idx + 1}</span>
                  <span className="ai-variant-use-btn">
                    Usar esta opción <Check width={12} height={12} className="inline ml-1" />
                  </span>
                </div>
                <p className="ai-variant-text">{varText}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .ai-copy-card {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 14px;
          background: var(--surface-raised);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
        }

        .ai-copy-header {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .ai-copy-header-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          background: var(--gold-dim);
          border-radius: 8px;
          color: var(--gold);
        }

        [data-theme="light"] .ai-copy-header-icon {
          background: rgba(62, 180, 137, 0.15);
          color: var(--mint-green);
        }

        .ai-copy-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 2px;
        }

        .ai-copy-subtitle {
          font-size: 0.73rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.35;
        }

        .ai-copy-tone-label {
          font-size: 0.68rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-tertiary);
        }

        .ai-copy-tones {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        /* Subtle Pill Styling */
        .ai-copy-tone-chip {
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }

        .ai-copy-tone-chip:hover:not(:disabled) {
          border-color: var(--gold);
          color: var(--gold);
        }

        .ai-copy-tone-chip--active {
          border-color: var(--gold) !important;
          background: var(--gold-dim) !important;
          color: var(--gold) !important;
          font-weight: 600;
        }

        [data-theme="light"] .ai-copy-tone-chip--active {
          border-color: var(--mint-green) !important;
          background: rgba(62, 180, 137, 0.15) !important;
          color: var(--mint-green) !important;
        }

        .ai-copy-generate-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--gold);
          background: transparent;
          color: var(--gold);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          width: 100%;
        }

        .ai-copy-generate-btn:hover:not(:disabled) {
          background: var(--gold);
          color: #fff;
        }

        .ai-copy-generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Variants display */
        .ai-copy-variants {
          margin-top: 6px;
        }

        .ai-variant-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 10px 12px;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ai-variant-card:hover {
          border-color: var(--gold);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }

        [data-theme="light"] .ai-variant-card:hover {
          border-color: var(--mint-green);
        }

        .ai-variant-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ai-variant-badge {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--gold);
          background: var(--gold-dim);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .ai-variant-use-btn {
          font-size: 0.72rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .ai-variant-card:hover .ai-variant-use-btn {
          color: var(--gold);
        }

        .ai-variant-text {
          font-size: 0.8rem;
          color: var(--text-primary);
          line-height: 1.4;
          margin: 0;
          white-space: pre-line;
        }

        /* Shimmer */
        .ai-copy-shimmer {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 4px 0;
        }
        .ai-copy-shimmer-line {
          height: 10px;
          border-radius: 4px;
          background: linear-gradient(90deg, var(--neutral-700) 25%, var(--neutral-600) 50%, var(--neutral-700) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .ai-copy-shimmer-line--long  { width: 100%; }
        .ai-copy-shimmer-line--mid   { width: 75%; }
        .ai-copy-shimmer-line--short { width: 50%; }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        [data-theme="light"] .ai-copy-shimmer-line {
          background: linear-gradient(90deg, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .ai-copy-error {
          font-size: 0.78rem;
          color: #ef4444;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 6px;
          padding: 8px 12px;
        }
      `}</style>
    </div>
  );
}
