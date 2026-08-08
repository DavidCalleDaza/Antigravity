import React, { useState, useEffect, useMemo } from 'react';

import { X, Share2, Facebook, Instagram, Video, Copy, Download, Loader2 } from 'lucide-react';
import { generateShareImage } from '../utils/generateShareImage';
import { socialClient } from '../utils/apiClient';
import Helpers from '../utils/helpers';
import AiCopyGenerator from './AI/AiCopyGenerator';
import AiVideoGenerator from './AI/AiVideoGenerator';
import AiImageEnhancer from './AI/AiImageEnhancer';
import { useStore } from '../store/useStore';
import Drawer from './ui/Drawer';
import Modal from './ui/Modal';

const NETWORK_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Video,
};

const NETWORK_LABELS = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function buildShareText(item) {
  const desc = item.description
    ? (item.description.length > 100 ? item.description.slice(0, 97) + '...' : item.description)
    : '';
  const categoryText = item.category || '';
  const nameAndCategory = categoryText ? `${item.name} - ${categoryText}` : item.name;
  return `✨ ${nameAndCategory}${desc ? '\n\n' + desc : ''}\n\n💰 Precio: $${Number(item.price || 0).toLocaleString('es-CO')}\n\n¡Contáctanos para más información!`;
}

export default function ShareModal({
  isOpen,
  onClose,
  item,
  onPublish,
}) {
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [shareText, setShareText] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageBlob, setImageBlob] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [showInstagramPanel, setShowInstagramPanel] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [aiVideoUrl, setAiVideoUrl] = useState(null);
  const [enhancedImageUrl, setEnhancedImageUrl] = useState(null);
  const [isAiGeneratedPost, setIsAiGeneratedPost] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      socialClient.listAccounts()
        .then(res => setAccounts(res || []))
        .catch(err => console.error("Failed to load accounts", err));
    }
  }, [isOpen]);

  const handleConnect = async (platform) => {
    try {
      const res = await socialClient.getAuthorizeUrl(platform);
      if (res && res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      console.error("Failed to get auth url", err);
    }
  };

  useEffect(() => {
    if (isOpen && item) {
      setShareText(buildShareText(item));
      setSelectedAccounts([]);
      setShowInstagramPanel(false);
      setImageBlob(null);
      setPreviewUrl(null);
      setLoadingImage(true);
      setAiVideoUrl(null);
      setEnhancedImageUrl(null);
      setIsAiGeneratedPost(false);

      generateShareImage({
        imageUrl: Helpers.resolveMediaUrl(item.imageUrl || item.image_url),
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

  const toggleAccount = (accountId) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]
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

  const handleEnhancedImage = (blob, mimeType) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
    setImageBlob(blob);
    setIsAiGeneratedPost(true);

    const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';
    const formData = new FormData();
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    formData.append('file', blob, `enhanced_${Date.now()}.${ext}`);

    const token = useStore.getState().currentUser?.token;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${API_BASE_URL}/uploads/media`, { method: 'POST', headers, body: formData })
      .then(async res => {
        const data = await res.json();
        if (res.ok && data.url) {
          setEnhancedImageUrl(data.url);
        }
        return data;
      })
      .catch(err => console.error('Error subiendo imagen mejorada:', err));
  };

  const handlePublishClick = async () => {
    setPublishing(true);
    
    const publishPromises = selectedAccounts.map(accountId => {
      const acc = accounts.find(a => a.id === accountId);
      return socialClient.publish({
        account_id: accountId,
        platform: acc ? acc.platform : undefined, // Fallback support
        caption: shareText,
        media_url: aiVideoUrl || enhancedImageUrl || item?.imageUrl || item?.image_url || '',
        product_id: item?.stock !== undefined ? item?.id : null,
        service_id: item?.duration !== undefined ? item?.id : null,
        is_ai_generated: isAiGeneratedPost,
      });
    });

    const results = await Promise.allSettled(publishPromises);
    setPublishing(false);

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.error("Errors publishing:", failures);
      const errors = failures.map(f => f.reason?.detail || f.reason?.message || "Desconocido").join(", ");
      alert(`Hubo errores al publicar en algunas cuentas:\n${errors}`);
    } else {
      if (onPublish) {
        onPublish({ selectedAccounts, text: shareText, item });
      }
      onClose();
    }
  };

  const activeAccounts = accounts.filter(a => a.status === 'active');
  const activeAccountIds = activeAccounts.map(a => a.id);
  const isAllSelected = activeAccountIds.length > 0 && activeAccountIds.every(id => selectedAccounts.includes(id));
  
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedAccounts(activeAccountIds);
    } else {
      setSelectedAccounts([]);
    }
  };

  const hasSelected = selectedAccounts.length > 0;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      width="560px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Share2 width="20" height="20" />
          Publicar en redes sociales
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-2)' }}>
          <div className="share-preview">
            <label className="form-label">Vista previa</label>
            <div className="share-preview-card">
              {loadingImage ? (
                <div className="share-preview-loading">
                  <Loader2 width={32} height={32} className="spin" />
                </div>
              ) : previewUrl ? (
                aiVideoUrl ? (
                  <video src={aiVideoUrl} autoPlay loop muted playsInline className="share-preview-image" style={{ objectFit: 'cover' }} />
                ) : (
                  <img src={previewUrl} alt="Vista previa" className="share-preview-image" onClick={() => setIsImagePreviewOpen(true)} style={{ cursor: 'pointer' }} title="Ampliar imagen" />
                )
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
            <AiVideoGenerator 
              item={item} 
              imageBlob={imageBlob} 
              onVideoGenerated={(url) => {
                setAiVideoUrl(url);
                setIsAiGeneratedPost(true);
              }} 
            />
            <AiImageEnhancer 
              imageBlob={imageBlob} 
              onEnhanced={handleEnhancedImage} 
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Texto para publicar</label>
              <AiCopyGenerator 
                item={item} 
                onGenerated={(text) => {
                  setShareText(text);
                  setIsAiGeneratedPost(true);
                }} 
              />
            </div>
            <textarea
              className="form-textarea share-textarea"
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              rows="3"
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Selecciona las cuentas</label>
              <label className="share-network-option" style={{ padding: '0', border: 'none', background: 'transparent' }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  disabled={activeAccountIds.length === 0}
                  className="form-checkbox"
                />
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Seleccionar todas</span>
              </label>
            </div>
            <div className="share-networks">
              {activeAccounts.length === 0 ? (
                <div className="text-sm text-secondary p-3 border border-dashed border-neutral-700 rounded-lg w-full text-center">
                  No hay cuentas conectadas y activas. 
                  <a href="/profile/social" className="text-primary ml-1 hover:underline">Ir a Configuración</a>
                </div>
              ) : (
                activeAccounts.map((account) => {
                  const Icon = NETWORK_ICONS[account.platform] || Share2;
                  const label = account.display_label || account.platform_username || account.platform_user_id;
                  const platformName = NETWORK_LABELS[account.platform] || account.platform;
                  return (
                    <div key={account.id} className="share-network-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', width: '100%' }}>
                      <label className="share-network-option" style={{ flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={selectedAccounts.includes(account.id)}
                          onChange={() => toggleAccount(account.id)}
                          className="form-checkbox"
                        />
                        <span className="share-network-icon"><Icon width="18" height="18" /></span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.875rem' }}>{label}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {platformName} {account.account_type === 'business' ? '(Business)' : ''} {account.is_default ? '⭐' : ''}
                          </span>
                        </div>
                      </label>
                    </div>
                  );
                })
              )}
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
        <div className="drawer-form-actions" style={{ borderTop: '1px solid var(--border)' }}>
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

      <Modal
        isOpen={isImagePreviewOpen}
        onClose={() => setIsImagePreviewOpen(false)}
        title="Vista previa detallada"
        size="sm"
        actions={[
          { label: 'Cerrar', onClick: () => setIsImagePreviewOpen(false) }
        ]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', gridColumn: '1 / -1', width: '100%' }}>
          <img src={previewUrl} alt="Vista previa detallada" style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', margin: 0, textWrap: 'wrap' }}>
            Esta imagen incluye el texto incrustado que se publicará en las redes.
          </p>
        </div>
      </Modal>

      <style>{`
        /* AI Tone Select */
        .ai-tone-select {
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid var(--neutral-700);
          background: var(--neutral-800);
          color: var(--text-primary);
          font-size: 0.875rem;
        }
        
        [data-theme="light"] .ai-tone-select {
          background: var(--surface);
          border-color: var(--border-color);
          color: var(--text-primary);
        }

        /* Share Textarea */
        .share-textarea {
          background: var(--neutral-900);
          border: 1px solid var(--neutral-700);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          font-size: 0.875rem;
          color: var(--text-primary);
          transition: border-color var(--transition-fast);
        }

        [data-theme="light"] .share-textarea {
          background: var(--surface);
          border-color: var(--border-color);
          box-shadow: var(--shadow-sm);
        }

        [data-theme="light"] .share-textarea:focus {
          border-color: var(--gold);
        }
        .share-preview {
          margin-bottom: var(--space-5);
        }

        .share-preview-card {
          background: var(--neutral-900);
          border-radius: var(--radius-lg);
          overflow: hidden;
          display: flex;
          flex-direction: row;
          height: 100px;
          border: 1px solid transparent;
        }

        [data-theme="light"] .share-preview-card {
          background: var(--gold-dim);
          border-color: var(--gold);
        }

        .share-preview-image {
          width: 100px;
          height: 100px;
          object-fit: cover;
        }

        .share-preview-loading,
        .share-preview-placeholder {
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-tertiary);
        }

        .share-preview-info {
          flex: 1;
          padding: var(--space-3) var(--space-4);
          background: var(--neutral-800);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          gap: var(--space-1);
        }

        [data-theme="light"] .share-preview-info {
          background: transparent;
        }

        .share-preview-name {
          font-weight: var(--font-semibold);
          color: var(--text-primary);
          font-size: var(--text-sm);
        }

        [data-theme="light"] .share-preview-name {
          color: #121212;
        }

        .share-preview-price {
          color: var(--gold);
          font-weight: var(--font-bold);
        }

        [data-theme="light"] .share-preview-price {
          color: #047857;
        }

        /* AI Video Card Styles */
        .ai-video-card {
          margin-top: 16px;
          padding: 12px;
          border-radius: 8px;
          background: var(--neutral-800);
          border: 1px solid var(--neutral-700);
        }

        [data-theme="light"] .ai-video-card {
          background: var(--gold-dim);
          border-color: var(--gold);
        }

        .ai-video-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        [data-theme="light"] .ai-video-title {
          color: #121212;
        }

        .ai-video-desc {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        [data-theme="light"] .ai-video-desc {
          color: #333333;
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
    </Drawer>
  );
}