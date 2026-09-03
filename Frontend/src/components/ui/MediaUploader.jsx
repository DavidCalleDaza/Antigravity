import React, { useState } from 'react';
import { Upload, X, FileImage, FileVideo, Loader2 } from 'lucide-react';

export default function MediaUploader({
  label = 'Media',
  preview = null,
  uploading = false,
  compressing = false,
  progress = 0,
  onSelect,
  onClear,
  onDropItem,
  error = null,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isVideo = preview && (preview.startsWith('blob:') || preview?.type?.startsWith?.('video/') || preview?.includes?.('.mp4') || preview?.includes?.('.webm'));

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const payload = JSON.parse(raw);
        if (onDropItem) {
          onDropItem(payload);
        }
      }
    } catch (err) {
      console.error('Error procesando drop en MediaUploader:', err);
    }
  };

  return (
    <div className="media-uploader">
      {label && <label className="form-label">{label}</label>}

      <div
        className={`media-uploader-dropzone ${error ? 'has-error' : ''} ${isDragOver ? 'is-drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {compressing ? (
          <div className="media-uploader-progress">
            <Loader2 width={24} height={24} className="spin" />
            <span>Optimizando imagen...</span>
          </div>
        ) : uploading ? (
          <div className="media-uploader-progress">
            <div className="media-uploader-progress-bar">
              <div
                className="media-uploader-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="media-uploader-progress-text">Subiendo... {progress}%</span>
          </div>
        ) : preview ? (
          <div className="media-uploader-preview">
            {isVideo ? (
              <video src={preview} className="media-uploader-video-preview" muted />
            ) : (
              <img src={preview} alt="Preview" className="media-uploader-image-preview" />
            )}
            <button
              type="button"
              className="media-uploader-clear"
              onClick={onClear}
              title="Quitar"
            >
              <X width={16} height={16} />
            </button>
            <span className="media-uploader-badge">
              {isVideo ? <FileVideo width={14} height={14} /> : <FileImage width={14} height={14} />}
            </span>
          </div>
        ) : (
          <label className="media-uploader-placeholder" title="Imagen (máx. 10MB, se optimiza automáticamente) o Video (20MB)">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={onSelect}
              className="media-uploader-input"
            />
            <Upload width={24} height={24} />
            <span>Click para seleccionar</span>
            <span className="media-uploader-hint">Imagen máx. 10MB · Video 20MB</span>
          </label>
        )}
      </div>

      {error && <span className="form-error">{error}</span>}

      <style>{`
        .media-uploader {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          width: 100%;
          box-sizing: border-box;
        }

        .media-uploader-dropzone {
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: all var(--transition-fast);
          width: 100%;
          box-sizing: border-box;
          max-height: 220px;
        }

        .media-uploader-dropzone:hover {
          border-color: var(--gold);
        }

        .media-uploader-dropzone.has-error {
          border-color: var(--danger);
        }

        .media-uploader-dropzone.is-drag-over {
          border-color: var(--gold) !important;
          background: var(--gold-dim) !important;
          box-shadow: 0 0 0 3px var(--gold-soft);
        }

        [data-theme="light"] .media-uploader-dropzone.is-drag-over {
          border-color: var(--mint-green) !important;
          background: var(--gold-dim) !important;
        }

        .media-uploader-input {
          display: none;
        }

        .media-uploader-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-1);
          padding: var(--space-4);
          color: var(--text-tertiary);
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .media-uploader-placeholder:hover {
          color: var(--gold);
        }

        .media-uploader-hint {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }

        .media-uploader-preview {
          position: relative;
          aspect-ratio: 16 / 9;
          width: 100%;
          max-height: 200px;
          overflow: hidden;
          background: var(--surface-raised, rgba(0, 0, 0, 0.04));
          border-radius: var(--radius-lg);
        }

        [data-theme="dark"] .media-uploader-preview {
          background: rgba(255, 255, 255, 0.03);
        }

        .media-uploader-image-preview,
        .media-uploader-video-preview {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .media-uploader-clear {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          border-radius: var(--radius-full, 9999px);
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          transition: background var(--transition-fast);
        }

        .media-uploader-clear:hover {
          background: var(--danger, #ef4444);
        }

        .media-uploader-badge {
          position: absolute;
          bottom: 8px;
          left: 8px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          color: var(--mint-green, #3eb489);
          padding: 3px 6px;
          border-radius: var(--radius-sm, 4px);
          display: flex;
          align-items: center;
          gap: 4px;
          z-index: 2;
        }

        .media-uploader-progress {
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
        }

        .media-uploader-progress-bar {
          width: 100%;
          max-width: 300px;
          height: 8px;
          background: var(--neutral-800);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .media-uploader-progress-fill {
          height: 100%;
          background: var(--gold);
          transition: width var(--transition-fast);
        }

        .media-uploader-progress-text {
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }

        .form-error {
          font-size: var(--text-xs);
          color: var(--danger);
        }
      `}</style>
    </div>
  );
}