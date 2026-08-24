import React, { useState } from 'react';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
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
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!item) return;
    setLoading(true);
    setError(null);
    try {
      const response = await aiClient.generateCopy({
        product_name: item.name,
        description: item.description || '',
        tone: tone,
      });
      if (response && response.text) {
        onGenerated(response.text);
      }
    } catch (err) {
      console.error('Error generating AI copy:', err);
      setError(err.detail || err.message || 'Error desconocido al generar el texto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-copy-card">
      {/* Header */}
      <div className="ai-copy-header">
        <div className="ai-copy-header-icon">
          <Sparkles width={20} height={20} />
        </div>
        <div>
          <h4 className="ai-copy-title">Generar texto con Gemini</h4>
          <p className="ai-copy-subtitle">
            Elige el tono y la IA escribirá un caption optimizado para redes.
          </p>
        </div>
      </div>

      {/* Tone selector — chip pills */}
      <div className="ai-copy-tone-label">Tono del mensaje</div>
      <div className="ai-copy-tones">
        {TONES.map(t => (
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
        className="ai-copy-generate-btn"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 width={16} height={16} className="spin" />
            Generando con IA…
          </>
        ) : (
          <>
            <Wand2 width={16} height={16} />
            Generar caption
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
      {error && (
        <div className="ai-copy-error">
          ⚠️ {error}
        </div>
      )}

      <style>{`
        .ai-copy-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px;
          background: var(--neutral-800);
          border: 1px solid var(--neutral-700);
          border-radius: 12px;
        }
        [data-theme="light"] .ai-copy-card {
          background: var(--gold-dim);
          border-color: var(--gold);
        }
        .ai-copy-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .ai-copy-header-icon {
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
        .ai-copy-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 2px;
        }
        [data-theme="light"] .ai-copy-title { color: #121212; }
        .ai-copy-subtitle {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.4;
        }
        .ai-copy-tone-label {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-tertiary);
        }
        .ai-copy-tones {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ai-copy-tone-chip {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--neutral-700);
          background: var(--neutral-900);
          color: var(--text-secondary);
          font-size: 0.78rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        [data-theme="light"] .ai-copy-tone-chip {
          background: #fff;
          border-color: var(--border-color);
          color: #444;
        }
        .ai-copy-tone-chip:hover:not(:disabled) {
          border-color: var(--gold);
          color: var(--gold);
        }
        .ai-copy-tone-chip--active {
          border-color: var(--gold) !important;
          background: var(--gold) !important;
          color: #fff !important;
        }
        .ai-copy-tone-chip:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .ai-copy-generate-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          border: 1px solid var(--gold);
          background: transparent;
          color: var(--gold);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
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
