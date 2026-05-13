import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Share2, Facebook, Instagram, Video, Copy, Download, Loader2 } from 'lucide-react';
import { generateShareImage } from '../utils/generateShareImage';

const NETWORKS = [
  { id: 'facebook', label: 'Facebook', Icon: Facebook },
  { id: 'instagram', label: 'Instagram', Icon: Instagram },
  { id: 'tiktok', label: 'TikTok', Icon: Video },
];

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function buildShareText(item) {
  const desc = item.description
    ? (item.description.length > 100 ? item.description.slice(0, 97) + '...' : item.description)
    : '';
  return `✨ ${item.name} - ${item.category}${desc ? '\n\n' + desc : ''}\n\n💰 Precio: $${Number(item.price).toLocaleString('es-CO')}\n\n¡Contáctanos para más información!`;
}

async function handlePublish(selectedNetworks, text, item, imageBlob) {
  if (navigator.share && isMobile()) {
    try {
      const files = imageBlob ? [new File([imageBlob], 'share-image.png', { type: 'image/png' })] : [];
      await navigator.share({
        title: item.name,
        text: text,
        url: window.location.href,
        files,
      });
      return { success: true };
    } catch (e) {
      if (e.name === 'AbortError') return { success: true, cancelled: true };
    }
  }

  const encodedText = encodeURIComponent(text);
  const encodedUrl  = encodeURIComponent(window.location.href);

  const urls = [];
  if (selectedNetworks.includes('facebook')) {
    urls.push({
      network: 'facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    });
  }
  if (selectedNetworks.includes('instagram')) {
    urls.push({ network: 'instagram', url: null });
  }
  if (selectedNetworks.includes('tiktok')) {
    urls.push({
      network: 'tiktok',
      url: 'https://www.tiktok.com/upload',
    });
  }

  for (const { network, url } of urls) {
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  }

  return { success: true, needsInstagramInstructions: selectedNetworks.includes('instagram') };
}

export default function ShareModal({
  isOpen,
  onClose,
  item,
  onPublish,
}) {
  const [selectedNetworks, setSelectedNetworks] = useState([]);
  const [shareText, setShareText] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageBlob, setImageBlob] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [showInstagramPanel, setShowInstagramPanel] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setShareText(buildShareText(item));
      setSelectedNetworks([]);
      setShowInstagramPanel(false);
      setImageBlob(null);
      setPreviewUrl(null);
      setLoadingImage(true);

      generateShareImage({
        imageUrl: item.imageUrl || item.image_url,
        name: item.name,
        price: item.price,
        category: item.category,
      })
        .then(blob => {
          setImageBlob(blob);
          setPreviewUrl(URL.createObjectURL(blob));
        })
        .catch(() => {
          setImageBlob(null);
          setPreviewUrl(null);
        })
        .finally(() => setLoadingImage(false));
    }
  }, [isOpen, item]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleNetwork = (id) => {
    setSelectedNetworks(prev =>
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      if (onPublish) onPublish({ type: 'copy', text: shareText });
    });
  };

  const handleDownloadImage = () => {
    if (!imageBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(imageBlob);
    a.download = `${item.name.replace(/\s+/g, '_')}_share.png`;
    a.click();
  };

  const handlePublishClick = async () => {
    setPublishing(true);
    try {
      const result = await handlePublish(selectedNetworks, shareText, item, imageBlob);
      if (result?.needsInstagramInstructions) {
        setShowInstagramPanel(true);
      } else if (onPublish) {
        onPublish({ networks: selectedNetworks, text: shareText, item });
      }
    } finally {
      setPublishing(false);
    }
  };

  const hasSelected = selectedNetworks.length > 0;

  return createPortal(
    <div className="modal-overlay active" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal modal-lg animate-scaleUp" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3 className="modal-title">
            <Share2 width="20" height="20" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Publicar en redes sociales
          </h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <X width="20" height="20" />
          </button>
        </div>

        <div className="modal-body">
          <div className="share-preview">
            <label className="form-label">Vista previa</label>
            <div className="share-preview-card">
              {loadingImage ? (
                <div className="share-preview-loading">
                  <Loader2 width={32} height={32} className="spin" />
                </div>
              ) : previewUrl ? (
                <img src={previewUrl} alt="Vista previa" className="share-preview-image" />
              ) : (
                <div className="share-preview-placeholder">
                  <Share2 width={48} height={48} />
                </div>
              )}
              <div className="share-preview-info">
                <span className="share-preview-name">{item.name}</span>
                <span className="share-preview-price">$ {Number(item.price).toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Texto para publicar</label>
            <textarea
              className="form-textarea"
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              rows="4"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Selecciona las redes</label>
            <div className="share-networks">
              {NETWORKS.map(({ id, label, Icon }) => (
                <label key={id} className="share-network-option">
                  <input
                    type="checkbox"
                    checked={selectedNetworks.includes(id)}
                    onChange={() => toggleNetwork(id)}
                    className="form-checkbox"
                  />
                  <span className="share-network-icon"><Icon width="18" height="18" /></span>
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {showInstagramPanel && (
            <div className="share-instagram-panel">
              <p className="share-instagram-title">Instrucciones para Instagram</p>
              <p className="share-instagram-text">
                Abre Instagram en tu móvil y pega el texto junto con la imagen descargada.
              </p>
              <div className="share-instagram-actions">
                <button className="btn btn-outline btn-sm" onClick={handleCopyText}>
                  <Copy width="14" height="14" />
                  Copiar texto
                </button>
                {imageBlob && (
                  <button className="btn btn-outline btn-sm" onClick={handleDownloadImage}>
                    <Download width="14" height="14" />
                    Descargar imagen
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handlePublishClick}
            disabled={!hasSelected || publishing}
          >
            {publishing ? (
              <>
                <Loader2 width="16" height="16" className="spin" />
                Publicando...
              </>
            ) : (
              <>Publicar →</>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .share-preview {
          margin-bottom: var(--space-5);
        }

        .share-preview-card {
          background: var(--neutral-900);
          border-radius: var(--radius-lg);
          overflow: hidden;
          aspect-ratio: 1;
          max-height: 280px;
          display: flex;
          flex-direction: column;
        }

        .share-preview-image {
          flex: 1;
          width: 100%;
          object-fit: cover;
        }

        .share-preview-loading,
        .share-preview-placeholder {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-tertiary);
        }

        .share-preview-info {
          padding: var(--space-3) var(--space-4);
          background: var(--neutral-800);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .share-preview-name {
          font-weight: var(--font-semibold);
          color: var(--text-primary);
          font-size: var(--text-sm);
        }

        .share-preview-price {
          color: var(--gold);
          font-weight: var(--font-bold);
        }

        .share-networks {
          display: flex;
          gap: var(--space-4);
          flex-wrap: wrap;
        }

        .share-network-option {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          cursor: pointer;
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          border: 1px solid var(--neutral-700);
          transition: all var(--transition-fast);
          font-size: var(--text-sm);
        }

        .share-network-option:hover {
          border-color: var(--gold);
          background: var(--neutral-800);
        }

        .share-network-option input {
          accent-color: var(--gold);
        }

        .share-network-icon {
          color: var(--text-secondary);
        }

        .share-instagram-panel {
          background: var(--neutral-800);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          margin-top: var(--space-4);
        }

        .share-instagram-title {
          font-weight: var(--font-semibold);
          color: var(--text-primary);
          margin-bottom: var(--space-2);
        }

        .share-instagram-text {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin-bottom: var(--space-3);
        }

        .share-instagram-actions {
          display: flex;
          gap: var(--space-2);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  );
}