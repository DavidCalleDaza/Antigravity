import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType || 'image/png' });
}

export default function AiImageEnhancer({ imageBlob, onEnhanced }) {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleGenerate = async () => {
    if (!imageBlob) {
      alert('Necesitas una imagen para mejorarla.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', imageBlob, 'cover.png');
      if (prompt.trim()) formData.append('prompt', prompt.trim());

      const token = useStore.getState().currentUser?.token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/ai/enhance-image`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Error al mejorar la imagen');
      }

      const blob = base64ToBlob(data.image_base64, data.mime_type);
      setSuccess(true);
      if (onEnhanced) onEnhanced(blob, data.mime_type || 'image/png');
    } catch (err) {
      console.error('Error enhancing image:', err);
      setErrorMsg(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-video-card">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
        <div>
          <h4 className="ai-video-title">
            <Sparkles width="16" height="16" className="ai-video-icon" />
            Mejorar imagen con IA (Gemini)
          </h4>
          <p className="ai-video-desc">
            Mejora la nitidez, iluminación y color de la imagen antes de publicar.
          </p>
        </div>

        <button
          className="btn btn-outline btn-sm"
          onClick={handleGenerate}
          disabled={loading || !imageBlob}
          style={{ borderColor: 'var(--gold)', color: 'var(--gold)', whiteSpace: 'nowrap' }}
          title={!imageBlob ? 'Necesitas una imagen para mejorarla' : 'Mejorar imagen con Gemini'}
        >
          {loading ? <Loader2 width="14" height="14" className="spin" /> : <Sparkles width="14" height="14" />}
          Mejorar
        </button>
      </div>

      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Instrucciones opcionales (ej: sube la nitidez)..."
        className="form-input"
        style={{ marginTop: '12px', width: '100%', maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}
      />

      {loading && (
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--gold)' }}>
          <Loader2 width="16" height="16" className="spin" />
          <span>Mejorando imagen... unos segundos.</span>
        </div>
      )}

      {success && (
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#10b981' }}>
          <CheckCircle2 width="16" height="16" />
          <span>¡Imagen mejorada! Ya se aplicó a la vista previa.</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ marginTop: '12px', fontSize: '0.875rem', color: '#ef4444' }}>
          Error: {errorMsg}
        </div>
      )}
    </div>
  );
}
