import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { aiClient } from '../../utils/apiClient';

export default function AiCopyGenerator({ item, onGenerated }) {
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState('persuasivo');

  const handleGenerate = async () => {
    if (!item) return;
    setLoading(true);
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
      alert('Error generando texto con IA: ' + (err.detail || err.message || 'Desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <select 
        value={tone} 
        onChange={(e) => setTone(e.target.value)} 
        className="form-select ai-tone-select"
      >
        <option value="persuasivo">Persuasivo</option>
        <option value="formal">Formal</option>
        <option value="divertido">Divertido</option>
        <option value="urgente">Urgente</option>
      </select>
      <button 
        className="btn btn-outline btn-sm" 
        onClick={handleGenerate} 
        disabled={loading}
        style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
        title="Generar copy con Gemini"
      >
        {loading ? <Loader2 width="14" height="14" className="spin" /> : <Sparkles width="14" height="14" />}
        Generar con IA
      </button>
    </div>
  );
}
