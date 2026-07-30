import React, { useState, useEffect } from 'react';
import { Video, Loader2, PlayCircle, CheckCircle2 } from 'lucide-react';
import { aiClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';

import { useStore } from '../../store/useStore';

export default function AiVideoGenerator({ item, imageBlob, onVideoGenerated }) {
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState(null); // 'pending', 'success', 'failed'
  const [videoUrl, setVideoUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const toast = useToast();

  const handleDisabledClick = () => {
    toast.info(
      'La generación de video con IA estará disponible próximamente. Estamos trabajando en esta funcionalidad.',
      'Próximamente'
    );
  };

  const handleGenerate = async () => {
    if (!item || !imageBlob) {
      alert('Necesitas una imagen para generar el video.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setTaskId(null);
    setStatus(null);
    setVideoUrl(null);
    
    try {
      const formData = new FormData();
      const itemType = item.type === 'servicio' ? 'service' : 'product';
      formData.append('prompt', `An animated cinematic showcase of a ${itemType} named ${item.name}. ${item.description || ''}`.substring(0, 1000));
      // Append the imageBlob as a file
      formData.append('file', imageBlob, 'cover.png');
      
      const token = useStore.getState().currentUser?.token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/ai/generate-video`, {
        method: 'POST',
        headers,
        body: formData
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Error al iniciar generación de video');
      }
      
      setTaskId(data.task_id);
      setStatus('pending');
    } catch (err) {
      console.error('Error starting AI video:', err);
      setErrorMsg(err.message || 'Error desconocido');
      setLoading(false);
    }
  };

  // Poll for task status
  useEffect(() => {
    let intervalId;
    if (taskId && status === 'pending') {
      intervalId = setInterval(async () => {
        try {
          const res = await aiClient.getTaskStatus(taskId);
          if (res.status === 'success') {
            setStatus('success');
            setVideoUrl(res.video_url);
            setLoading(false);
            if (onVideoGenerated) onVideoGenerated(res.video_url, taskId);
            clearInterval(intervalId);
          } else if (res.status === 'failed') {
            setStatus('failed');
            setErrorMsg(res.error_message || 'El video falló al generarse.');
            setLoading(false);
            clearInterval(intervalId);
          }
        } catch (err) {
          console.error("Error polling task:", err);
        }
      }, 10000); // poll every 10 seconds (Veo takes a while)
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [taskId, status, onVideoGenerated]);

  return (
    <div className="ai-video-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 className="ai-video-title">
            <Video width="16" height="16" className="ai-video-icon" />
            Video con IA (Google Veo)
          </h4>
          <p className="ai-video-desc">
            Convierte esta imagen en un video corto usando inteligencia artificial.
          </p>
        </div>
        
        {!loading && status !== 'success' && (
          <>
          <button 
            className="btn btn-outline btn-sm"
            onClick={handleDisabledClick}
            disabled
            title="Próximamente — En mantenimiento"
            style={{ borderColor: 'var(--gold)', color: 'var(--gold)', whiteSpace: 'nowrap', opacity: 0.6, cursor: 'not-allowed' }}
          >
            <PlayCircle width="14" height="14" style={{ marginRight: '6px' }} />
            Generar Video
          </button>
          <span style={{
            fontSize: '0.65rem', background: 'var(--gold)', color: '#fff',
            padding: '2px 8px', borderRadius: '999px', fontWeight: 600,
            marginLeft: '8px', whiteSpace: 'nowrap'
          }}>Próximamente</span>
          </>
        )}
      </div>

      {loading && (
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--gold)' }}>
          <Loader2 width="16" height="16" className="spin" />
          <span>Generando video... Esto tomará un par de minutos.</span>
        </div>
      )}

      {status === 'success' && videoUrl && (
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#10b981' }}>
          <CheckCircle2 width="16" height="16" />
          <span>¡Video generado exitosamente!</span>
          {/* Opcional: mostrar un mini reproductor o enlace */}
        </div>
      )}

      {status === 'failed' && (
        <div style={{ marginTop: '12px', fontSize: '0.875rem', color: '#ef4444' }}>
          Error: {errorMsg}
        </div>
      )}
    </div>
  );
}
