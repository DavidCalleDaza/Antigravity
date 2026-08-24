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
        }

        .media-uploader-dropzone {
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: all var(--transition-fast);
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
        }

        .media-uploader-image-preview,
        .media-uploader-video-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .media-uploader-clear {
          position: absolute;
          top: var(--space-2);
          right: var(--space-2);
          width: 28px;
          height: 28px;
          border-radius: var(--radius-full);
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background var(--transition-fast);
        }

        .media-uploader-clear:hover {
          background: var(--danger);
        }

        .media-uploader-badge {
          position: absolute;
          bottom: var(--space-2);
          left: var(--space-2);
          background: var(--gold-soft);
          color: var(--gold);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          gap: var(--space-1);
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