import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Mic, Video, AlertCircle } from 'lucide-react';
import Drawer from '../../../components/ui/Drawer';
import Helpers from '../../../utils/helpers';
import { aiClient } from '../../../utils/apiClient';

const POLL_INTERVAL_MS = 4000;

const KIND_LABEL = {
  image: 'imagen',
  audio: 'audio',
  video: 'video',
};

const PROCESSING_TEXT = {
  image: 'Mejorando imagen...',
  audio: 'Mejorando audio... esto puede tardar unos segundos.',
  video: 'Mejorando video... esto puede tardar unos minutos.',
};

function base64ToFile(base64, mimeType, filename) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], filename, { type: mimeType });
}

function sourceFile(item, kind) {
  return kind === 'image' ? item.blob : item.file;
}

export default function WallMediaEnhancePanel({ item, kind, onApply, onTextGenerated, onClose }) {
  const [phase, setPhase] = useState('idle'); // idle | processing | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const [resultFile, setResultFile] = useState(null);
  const [beforeUrl, setBeforeUrl] = useState(null);
  const [afterUrl, setAfterUrl] = useState(null);
  const cancelledRef = useRef(false);

  const [textPhase, setTextPhase] = useState('idle'); // idle | processing | success | error
  const [textError, setTextError] = useState('');
  const [generatedText, setGeneratedText] = useState('');

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (kind !== 'image') return;
    const url = URL.createObjectURL(item.blob);
    setBeforeUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item, kind]);

  useEffect(() => {
    if (!resultFile) {
      setAfterUrl(null);
      return;
    }
    const url = URL.createObjectURL(resultFile);
    setAfterUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [resultFile]);

  const pollTask = async (taskId) => {
    if (cancelledRef.current) return;
    try {
      const status = await aiClient.getTaskStatus(taskId);
      if (cancelledRef.current) return;

      if (status.status === 'success') {
        const resp = await fetch(Helpers.resolveMediaUrl(status.media_url));
        const blob = await resp.blob();
        const ext = kind === 'audio' ? 'mp3' : 'mp4';
        const fallbackType = kind === 'audio' ? 'audio/mpeg' : 'video/mp4';
        const file = new File([blob], `enhanced_${Date.now()}.${ext}`, {
          type: blob.type || fallbackType,
        });
        setResultFile(file);
        setPhase('success');
      } else if (status.status === 'failed') {
        setErrorMessage(status.error_message || 'La mejora falló.');
        setPhase('error');
      } else {
        setTimeout(() => pollTask(taskId), POLL_INTERVAL_MS);
      }
    } catch (err) {
      if (cancelledRef.current) return;
      setErrorMessage(err.message || 'No se pudo consultar el estado de la mejora.');
      setPhase('error');
    }
  };

  const handleEnhance = async () => {
    setPhase('processing');
    setErrorMessage('');
    try {
      if (kind === 'image') {
        const res = await aiClient.enhanceImage(item.blob);
        const file = base64ToFile(res.image_base64, res.mime_type, `enhanced_${Date.now()}.png`);
        setResultFile(file);
        setPhase('success');
      } else if (kind === 'audio') {
        const { task_id } = await aiClient.enhanceAudio(item.file);
        pollTask(task_id);
      } else if (kind === 'video') {
        const { task_id } = await aiClient.enhanceVideo(item.file);
        pollTask(task_id);
      }
    } catch (err) {
      setErrorMessage(err.message || 'No se pudo mejorar el archivo.');
      setPhase('error');
    }
  };

  const handleDescribe = async () => {
    setTextPhase('processing');
    setTextError('');
    try {
      const res = await aiClient.describeMedia(sourceFile(item, kind));
      setGeneratedText(res.text || '');
      setTextPhase('success');
    } catch (err) {
      setTextError(err.message || 'No se pudo generar el texto.');
      setTextPhase('error');
    }
  };

  const handleUseText = (mode) => {
    onTextGenerated(generatedText, mode);
    onClose();
  };

  const renderFilePreview = (icon, name) => (
    <div className="wall-enhance-file-preview">
      {icon}
      <span>{name}</span>
    </div>
  );

  const renderBefore = () => {
    if (kind === 'image') {
      return beforeUrl ? <img src={beforeUrl} alt="Antes" className="wall-enhance-media-img" /> : null;
    }
    const icon = kind === 'audio' ? <Mic width={24} height={24} /> : <Video width={24} height={24} />;
    return renderFilePreview(icon, item.name);
  };

  const renderAfter = () => {
    if (!afterUrl) return null;
    if (kind === 'image') {
      return <img src={afterUrl} alt="Después" className="wall-enhance-media-img" />;
    }
    if (kind === 'audio') {
      return <audio src={afterUrl} controls className="wall-enhance-media-player" />;
    }
    return <video src={afterUrl} controls className="wall-enhance-media-player" />;
  };

  return (
    <Drawer
      isOpen
      onClose={onClose}
      position="right"
      width="420px"
      title={`Herramientas de IA — ${KIND_LABEL[kind]}`}
    >
      <div className="wall-enhance-panel">
        <section className="wall-enhance-section">
          <h4 className="wall-enhance-section-title">Mejorar {KIND_LABEL[kind]}</h4>

          <div className="wall-enhance-stack">
            <div className="wall-enhance-side">
              <div className="wall-enhance-side-label">Antes</div>
              <div className="wall-enhance-frame">{renderBefore()}</div>
            </div>
            <div className="wall-enhance-side">
              <div className="wall-enhance-side-label">Después</div>
              <div className="wall-enhance-frame">
                {phase === 'processing' && (
                  <div className="wall-enhance-processing">
                    <Sparkles width={22} height={22} className="wall-enhance-spin" />
                    <span>{PROCESSING_TEXT[kind]}</span>
                  </div>
                )}
                {phase === 'success' && renderAfter()}
                {phase === 'idle' && (
                  <div className="wall-enhance-placeholder">
                    <Sparkles width={22} height={22} />
                    <span>Sin mejorar todavía</span>
                  </div>
                )}
                {phase === 'error' && (
                  <div className="wall-enhance-error">
                    <AlertCircle width={22} height={22} />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="wall-enhance-actions">
            {phase === 'idle' && (
              <button type="button" className="btn btn-primary btn-sm" onClick={handleEnhance}>
                Mejorar con IA
              </button>
            )}
            {phase === 'success' && (
              <>
                <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
                  Descartar
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => onApply(resultFile)}>
                  Aplicar
                </button>
              </>
            )}
            {phase === 'error' && (
              <>
                <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
                  Cerrar
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleEnhance}>
                  Reintentar
                </button>
              </>
            )}
          </div>
        </section>

        <hr className="wall-enhance-divider" />

        <section className="wall-enhance-section">
          <h4 className="wall-enhance-section-title">Agregar texto con IA</h4>
          <p className="wall-enhance-section-hint">
            Gemini analiza el contenido real de este {KIND_LABEL[kind]} y sugiere un texto para tu publicación.
          </p>

          {textPhase === 'idle' && (
            <button type="button" className="btn btn-outline btn-sm" onClick={handleDescribe}>
              <Sparkles width={14} height={14} />
              Agregar texto con IA
            </button>
          )}

          {textPhase === 'processing' && (
            <div className="wall-enhance-processing wall-enhance-processing--inline">
              <Sparkles width={18} height={18} className="wall-enhance-spin" />
              <span>Generando texto...</span>
            </div>
          )}

          {textPhase === 'success' && (
            <div className="wall-enhance-text-result">
              <p className="wall-enhance-generated-text">{generatedText}</p>
              <div className="wall-enhance-actions">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => handleUseText('append')}>
                  Agregar al final
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => handleUseText('replace')}>
                  Reemplazar
                </button>
              </div>
            </div>
          )}

          {textPhase === 'error' && (
            <div className="wall-enhance-text-result">
              <div className="wall-enhance-error wall-enhance-error--inline">
                <AlertCircle width={18} height={18} />
                <span>{textError}</span>
              </div>
              <div className="wall-enhance-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={handleDescribe}>
                  Reintentar
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <style>{`
        .wall-enhance-panel {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .wall-enhance-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .wall-enhance-section-title {
          font-size: var(--text-sm);
          font-weight: var(--font-semibold);
          color: var(--text-primary);
          margin: 0;
        }

        .wall-enhance-section-hint {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          margin: -4px 0 0;
        }

        .wall-enhance-divider {
          border: none;
          border-top: 1px solid var(--border-color);
          margin: 0;
        }

        .wall-enhance-stack {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .wall-enhance-side {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .wall-enhance-side-label {
          font-size: var(--text-xs);
          font-weight: var(--font-semibold);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-tertiary);
        }

        .wall-enhance-frame {
          height: 160px;
          border-radius: var(--radius-lg);
          border: 1px solid #000;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          color: #000;
        }

        .wall-enhance-media-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .wall-enhance-media-player {
          width: 100%;
          max-height: 100%;
        }

        .wall-enhance-file-preview,
        .wall-enhance-placeholder,
        .wall-enhance-processing,
        .wall-enhance-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          padding: var(--space-3);
          color: #000;
          font-size: var(--text-xs);
          text-align: center;
        }

        .wall-enhance-processing--inline,
        .wall-enhance-error--inline {
          flex-direction: row;
          padding: var(--space-2) 0;
          text-align: left;
        }

        .wall-enhance-error {
          color: var(--danger);
        }

        .wall-enhance-spin {
          animation: wall-enhance-spin 1.2s linear infinite;
          color: var(--gold);
        }

        @keyframes wall-enhance-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .wall-enhance-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-2);
        }

        .wall-enhance-text-result {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .wall-enhance-generated-text {
          font-size: var(--text-sm);
          color: #000;
          background: #fff;
          border: 1px solid #000;
          border-radius: var(--radius-lg);
          padding: var(--space-3);
          margin: 0;
          white-space: pre-wrap;
        }
      `}</style>
    </Drawer>
  );
}
