import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

import { X, Share2, Facebook, Instagram, Video, Copy, Download, Loader2, Sparkles, ChevronRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { generateShareImage } from '../utils/generateShareImage';
import { socialClient, tokensClient } from '../utils/apiClient';
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

function buildShareText(item, mode) {
  if (mode === 'wallPost') {
    return (item && item.description) || '';
  }
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
  mode = 'item', // 'item' | 'wallPost'
}) {
  const isWallPost = mode === 'wallPost';
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
  const [activeAiSection, setActiveAiSection] = useState(null); // null | 'copy' | 'image' | 'video'
  const [hourlyLimitReached, setHourlyLimitReached] = useState(false);
  // R1 — Rich text toolbar state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hashtagInput, setHashtagInput] = useState('');
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  // R5 — Multi-image state
  const [additionalImages, setAdditionalImages] = useState([]); // [{ blob, previewUrl, uploadedUrl }]
  const additionalImageInputRef = useRef(null);
  
  // R5 — derived: any selected account is TikTok?
  const hasTikTokSelected = useMemo(() => {
    return selectedAccounts.some(id => {
      const acc = accounts.find(a => a.id === id);
      return acc && acc.platform === 'tiktok';
    });
  }, [selectedAccounts, accounts]);

  useEffect(() => {
    if (isOpen) {
      socialClient.listAccounts()
        .then(res => setAccounts(res || []))
        .catch(err => console.error("Failed to load accounts", err));
      tokensClient.getHourlyUsage()
        .then(res => setHourlyLimitReached(Boolean(res && res.used_usd >= res.limit_usd)))
        .catch(() => setHourlyLimitReached(false));
    }
  }, [isOpen]);

  // ── R1 Unicode formatting helpers ────────────────────────────────────────
  const BOLD_MAP = Object.fromEntries(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('').map((c, i) => {
      const bases = [
        [65, 0x1D400], [97, 0x1D41A], [48, 0x1D7CE],
      ];
      for (const [start, offset] of bases) {
        const code = c.charCodeAt(0);
        if (code >= start && code < start + (start === 48 ? 10 : 26)) {
          return [c, String.fromCodePoint(offset + code - start)];
        }
      }
      return [c, c];
    })
  );
  const ITALIC_MAP = Object.fromEntries(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('').map((c) => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return [c, String.fromCodePoint(0x1D434 + code - 65)];
      if (code >= 97 && code <= 122) return [c, String.fromCodePoint(0x1D44E + code - 97)];
      return [c, c];
    })
  );

  const applyUnicodeFormat = useCallback((map) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) return; // nothing selected
    const selected = shareText.slice(start, end);
    const transformed = selected.split('').map(c => map[c] || c).join('');
    const newText = shareText.slice(0, start) + transformed + shareText.slice(end);
    setShareText(newText);
    // Restore selection after state update
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start, start + transformed.length);
    }, 0);
  }, [shareText]);

  const insertAtCursor = useCallback((insertion) => {
    const el = textareaRef.current;
    if (!el) {
      setShareText(prev => prev + insertion);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newText = shareText.slice(0, start) + insertion + shareText.slice(end);
    setShareText(newText);
    setTimeout(() => {
      el.focus();
      const pos = start + insertion.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }, [shareText]);

  const addHashtag = useCallback(() => {
    const tag = hashtagInput.trim().replace(/^#+/, '');
    if (!tag) return;
    const insertion = (shareText.endsWith(' ') || shareText === '' ? '' : ' ') + '#' + tag;
    setShareText(prev => prev + insertion);
    setHashtagInput('');
  }, [hashtagInput, shareText]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const FREQUENT_EMOJIS = [
    '😀','😍','🔥','✨','💯','🎉','❤️','👍','🙌','💪',
    '🎁','🛒','💰','📢','🌟','👀','🆕','💥','🤩','😎',
    '📸','🍕','🎶','🏆','💡','🚀','✅','⚡','🌈','🎯',
    '💎','🏷️','📦','🤝','💸','🛍️','🌺','👑','🎊','📣',
  ];

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
      setShareText(buildShareText(item, mode));
      setSelectedAccounts([]);
      setShowInstagramPanel(false);
      setImageBlob(null);
      setPreviewUrl(null);
      setLoadingImage(true);
      setAiVideoUrl(null);
      setEnhancedImageUrl(null);
      setIsAiGeneratedPost(false);
      setActiveAiSection(null);
      // Reset additional images
      setAdditionalImages(prev => {
        prev.forEach(img => img.previewUrl && URL.revokeObjectURL(img.previewUrl));
        return [];
      });
      setHashtagInput('');

      if (mode === 'wallPost') {
        const mediaUrl = Helpers.resolveMediaUrl(item.imageUrl || item.image_url);
        setPreviewUrl(mediaUrl || null);
        setLoadingImage(false);
        if (mediaUrl) {
          fetch(mediaUrl)
            .then(res => {
              if (!res.ok) throw new Error('No se pudo cargar la imagen');
              return res.blob();
            })
            .then(blob => setImageBlob(blob))
            .catch(() => setImageBlob(null));
        }
        return;
      }

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
  }, [isOpen, item, mode]);

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
    a.download = `${(item.name || 'post').replace(/\s+/g, '_')}_share.png`;
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

    const linked = item?.linkedItem;

    const publishPromises = selectedAccounts.map(accountId => {
      const acc = accounts.find(a => a.id === accountId);

      // Build the list of media URLs (primary + additional) for multi-image posts
      const primaryUrl = aiVideoUrl || enhancedImageUrl || item?.imageUrl || item?.image_url || '';

      const buildPayload = (extraUrls) => ({
        account_id: accountId,
        platform: acc ? acc.platform : undefined,
        caption: shareText,
        media_url: primaryUrl,                           // backward compat
        media_urls: extraUrls.length > 0 ? extraUrls : undefined,  // multi-image
        product_id: isWallPost
          ? (linked?.kind === 'product' ? linked.id : null)
          : (item?.stock !== undefined ? item?.id : null),
        service_id: isWallPost
          ? (linked?.kind === 'service' ? linked.id : null)
          : (item?.duration !== undefined ? item?.id : null),
        is_ai_generated: isAiGeneratedPost,
      });

      if (additionalImages.length === 0) {
        // No additional images — single image flow (backward compat)
        return socialClient.publish(buildPayload([]));
      }

      // Upload additional images first, then publish
      const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';
      const token = useStore.getState().currentUser?.token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const uploadPromises = additionalImages.map(img => {
        const formData = new FormData();
        formData.append('file', img.blob, `additional_${Date.now()}.png`);
        return fetch(`${API_BASE_URL}/uploads/media`, { method: 'POST', headers, body: formData })
          .then(r => r.json())
          .then(data => data.url || null);
      });

      return Promise.all(uploadPromises).then(extraUrls => {
        const allUrls = [primaryUrl, ...extraUrls.filter(Boolean)];
        return socialClient.publish(buildPayload(allUrls));
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



  const addAdditionalImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const blob = file;
    const previewUrl = URL.createObjectURL(blob);
    setAdditionalImages(prev => [...prev, { blob, previewUrl, uploadedUrl: null }]);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const removeAdditionalImage = (index) => {
    setAdditionalImages(prev => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
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
      <div className="share-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-2)' }}>
        {activeAiSection === null ? (
          <>
            <div className="share-preview">
            <label className="form-label">Vista previa</label>
            <div className={isWallPost ? 'share-preview-card share-preview-card--wallpost' : 'share-preview-card'}>
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
              {!isWallPost && (
                <div className="share-preview-info">
                  <span className="share-preview-name">{item.name}</span>
                  <span className="share-preview-price">$ {Number(item.price).toLocaleString('es-CO')}</span>
                </div>
              )}
            </div>
          </div>

          {/* R5 — Multi-image selector */}
          {!isWallPost && !aiVideoUrl && (
            <div className="share-multi-img">
              <div className="share-multi-img-header">
                <label className="form-label" style={{ marginBottom: 0 }}>Imágenes adicionales</label>
                {hasTikTokSelected ? (
                  <span className="share-multi-img-tiktok-warn">
                    ⚠️ TikTok solo permite 1 imagen
                  </span>
                ) : (
                  <span className="share-multi-img-count">
                    {additionalImages.length > 0 ? `${additionalImages.length + 1} imágenes (carousel)` : 'Agrega hasta 9'}
                  </span>
                )}
              </div>

              <div className="share-multi-img-strip">
                {/* Primary image thumbnail (fixed, not removable) */}
                {previewUrl && (
                  <div className="share-multi-img-thumb share-multi-img-thumb--primary" title="Imagen principal">
                    <img src={previewUrl} alt="Principal" />
                    <span className="share-multi-img-thumb-badge">1</span>
                  </div>
                )}

                {/* Additional images */}
                {additionalImages.map((img, idx) => (
                  <div key={idx} className="share-multi-img-thumb">
                    <img src={img.previewUrl} alt={`Imagen ${idx + 2}`} />
                    <button
                      type="button"
                      className="share-multi-img-remove"
                      onClick={() => removeAdditionalImage(idx)}
                      title="Quitar imagen"
                    >
                      ×
                    </button>
                    <span className="share-multi-img-thumb-badge">{idx + 2}</span>
                  </div>
                ))}

                {/* Add button — hidden if TikTok selected or max reached */}
                {!hasTikTokSelected && additionalImages.length < 9 && (
                  <button
                    type="button"
                    className="share-multi-img-add"
                    onClick={() => additionalImageInputRef.current?.click()}
                    title="Agregar imagen al carousel"
                  >
                    <span className="share-multi-img-add-plus">+</span>
                    <span className="share-multi-img-add-label">Agregar</span>
                  </button>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={additionalImageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={addAdditionalImage}
              />
            </div>
          )}

          <div className="ai-accordion">
            {!isWallPost && (
              <AiAccordionEntry
                icon={Sparkles}
                label="Generar texto con IA"
                onClick={() => setActiveAiSection('copy')}
              />
            )}
            <AiAccordionEntry
              icon={Sparkles}
              label="Mejorar imagen con IA"
              onClick={() => {}}
              disabled={true}
              badge="Próximamente"
              title="Próximamente — Mejora de imágenes con IA"
            />
            {!isWallPost && (
              <AiAccordionEntry
                icon={Video}
                label="Video con IA (Google Veo)"
                onClick={() => setActiveAiSection('video')}
                badge="Próximamente"
              />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Texto para publicar</label>

            {/* Toolbar de formato */}
            <div className="share-text-toolbar">
              <button
                type="button"
                className="share-text-toolbar-btn"
                title="Negrita unicode (selecciona texto primero)"
                onClick={() => applyUnicodeFormat(BOLD_MAP)}
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                className="share-text-toolbar-btn"
                title="Cursiva unicode (selecciona texto primero)"
                onClick={() => applyUnicodeFormat(ITALIC_MAP)}
              >
                <em>I</em>
              </button>
              <div className="share-text-toolbar-divider" />
              <div style={{ position: 'relative' }} ref={emojiPickerRef}>
                <button
                  type="button"
                  className="share-text-toolbar-btn"
                  title="Insertar emoji"
                  onClick={() => setShowEmojiPicker(v => !v)}
                >
                  😀
                </button>
                {showEmojiPicker && (
                  <div className="share-emoji-picker">
                    {FREQUENT_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        className="share-emoji-btn"
                        onClick={() => { insertAtCursor(emoji); setShowEmojiPicker(false); }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="share-text-toolbar-spacer" />
              <span className={`share-char-counter ${shareText.length > 2200 ? 'share-char-counter--warn' : ''}`}>
                {shareText.length} / 2200
              </span>
            </div>

            <textarea
              ref={textareaRef}
              className="form-textarea share-textarea"
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              rows="4"
            />

            {/* Hashtag helper */}
            <div className="share-hashtag-row">
              <span className="share-hashtag-label">#</span>
              <input
                type="text"
                className="share-hashtag-input"
                placeholder="agrega una etiqueta y presiona Enter"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value.replace(/\s/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHashtag(); } }}
              />
              <button
                type="button"
                className="share-hashtag-add-btn"
                onClick={addHashtag}
                disabled={!hashtagInput.trim()}
              >
                + Agregar
              </button>
            </div>
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
                  <Link to="/profile?tab=social" className="text-primary ml-1 hover:underline">Ir a Configuración</Link>
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
        </>
      ) : (
        <div className="ai-section-expanded">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setActiveAiSection(null)}
            style={{ alignSelf: 'flex-start' }}
          >
            <ArrowLeft width="16" height="16" />
            Volver
          </button>
          {activeAiSection !== 'video' && (
            <div className="ai-context-ref">
              <span className="ai-context-ref-label">Contenido actual</span>
              <div className="ai-context-ref-body">
                {previewUrl && (
                  <img src={previewUrl} alt="Imagen actual" className="ai-context-ref-image" />
                )}
                <p className="ai-context-ref-text">{shareText}</p>
              </div>
            </div>
          )}
          {activeAiSection === 'copy' && (
            <AiCopyGenerator
              item={item}
              onGenerated={(text) => {
                setShareText(text);
                setIsAiGeneratedPost(true);
                setActiveAiSection(null);
              }}
            />
          )}
          {activeAiSection === 'image' && (
            <AiImageEnhancer
              imageBlob={imageBlob}
              onEnhanced={(blob, mimeType) => {
                handleEnhancedImage(blob, mimeType);
                setActiveAiSection(null);
              }}
            />
          )}
          {activeAiSection === 'video' && (
            <AiVideoGenerator
              item={item}
              imageBlob={imageBlob}
              onVideoGenerated={(url) => {
                setAiVideoUrl(url);
                setIsAiGeneratedPost(true);
              }}
            />
          )}
        </div>
      )}
        <div className="drawer-form-actions" style={{ borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary btn-publish-dark"
            onClick={handlePublishClick}
            disabled={!hasSelected || publishing}
          >
            {publishing ? (
              <>
                <Loader2 width="16" height="16" className="spin" />
                Publicando...
              </>
            ) : (
              <>PUBLICAR</>
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
            {isWallPost
              ? 'Esta es la imagen que acompañará la publicación.'
              : 'Esta imagen incluye el texto incrustado que se publicará en las redes.'}
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

        .share-preview-card--wallpost {
          height: auto;
          flex-direction: column;
        }

        .share-preview-card--wallpost .share-preview-image {
          width: 100%;
          height: auto;
          max-height: 300px;
          object-fit: cover;
        }

        .share-preview-card--wallpost .share-preview-loading,
        .share-preview-card--wallpost .share-preview-placeholder {
          width: 100%;
          height: 140px;
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

        /* AI Accordion */
        .ai-accordion {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .ai-accordion-entry {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
          width: 100%;
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          border: 1px solid var(--neutral-700);
          background: var(--neutral-800);
          color: var(--text-primary);
          font-size: var(--text-sm);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        [data-theme="light"] .ai-accordion-entry {
          background: var(--gold-dim);
          border-color: var(--gold);
          color: #121212;
        }

        .ai-accordion-entry:hover {
          border-color: var(--gold);
        }

        .ai-accordion-entry:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ai-accordion-entry-left {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .ai-accordion-entry-left svg {
          color: var(--gold);
        }

        .ai-accordion-badge {
          font-size: 0.65rem;
          background: var(--gold);
          color: #fff;
          padding: 2px 8px;
          border-radius: 999px;
          font-weight: 600;
          margin-left: 8px;
          white-space: nowrap;
        }

        .ai-section-expanded {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          margin-top: var(--space-2);
        }

        /* AI Context Reference */
        .ai-context-ref {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          border: 1px solid var(--neutral-700);
          background: var(--neutral-900);
        }

        [data-theme="light"] .ai-context-ref {
          background: var(--surface);
          border-color: var(--border-color);
        }

        .ai-context-ref-label {
          font-size: var(--text-xs);
          font-weight: var(--font-semibold);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
          color: var(--text-tertiary);
        }

        .ai-context-ref-body {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
        }

        .ai-context-ref-image {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: var(--radius-md);
          flex-shrink: 0;
          border: 1px solid var(--neutral-700);
        }

        .ai-context-ref-text {
          margin: 0;
          font-size: var(--text-xs);
          color: var(--text-secondary);
          line-height: var(--leading-relaxed);
          white-space: pre-line;
          max-height: 96px;
          overflow-y: auto;
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

        /* === Share Modal Specific Overrides === */
        /* Center the action buttons only in this modal, without touching .drawer-form-actions globally */
        .share-modal-body .drawer-form-actions {
          justify-content: center;
        }

        /* PUBLICAR button: always black in both themes */
        .btn-publish-dark {
          background: #000000 !important;
          color: #ffffff !important;
          border: none !important;
        }

        .btn-publish-dark:hover:not(:disabled) {
          background: #222222 !important;
        }

        .btn-publish-dark:disabled {
          background: #555555 !important;
          opacity: 0.6 !important;
        }

        /* === R1: Rich Text Toolbar === */
        .share-text-toolbar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 6px;
          background: var(--neutral-800);
          border: 1px solid var(--neutral-700);
          border-bottom: none;
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        }

        [data-theme="light"] .share-text-toolbar {
          background: var(--surface);
          border-color: var(--border-color);
        }

        .share-text-toolbar + .form-textarea {
          border-radius: 0 0 var(--radius-lg) var(--radius-lg);
        }

        .share-text-toolbar-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: background var(--transition-fast), color var(--transition-fast);
        }

        .share-text-toolbar-btn:hover {
          background: var(--neutral-700);
          color: var(--text-primary);
        }

        [data-theme="light"] .share-text-toolbar-btn:hover {
          background: var(--neutral-200, #e5e7eb);
          color: #121212;
        }

        .share-text-toolbar-divider {
          width: 1px;
          height: 18px;
          background: var(--neutral-700);
          margin: 0 4px;
        }

        [data-theme="light"] .share-text-toolbar-divider {
          background: var(--border-color);
        }

        .share-text-toolbar-spacer {
          flex: 1;
        }

        .share-char-counter {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          white-space: nowrap;
          padding-right: 4px;
        }

        .share-char-counter--warn {
          color: #ef4444;
          font-weight: 600;
        }

        /* Emoji picker */
        .share-emoji-picker {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          z-index: 100;
          background: var(--neutral-800);
          border: 1px solid var(--neutral-700);
          border-radius: var(--radius-md);
          padding: 8px;
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 2px;
          width: 260px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }

        [data-theme="light"] .share-emoji-picker {
          background: var(--surface);
          border-color: var(--border-color);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }

        .share-emoji-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 4px;
          font-size: 1rem;
          transition: background var(--transition-fast);
        }

        .share-emoji-btn:hover {
          background: var(--neutral-700);
        }

        [data-theme="light"] .share-emoji-btn:hover {
          background: var(--neutral-200, #e5e7eb);
        }

        /* Hashtag row */
        .share-hashtag-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
        }

        .share-hashtag-label {
          font-size: 1rem;
          font-weight: 700;
          color: var(--gold);
          flex-shrink: 0;
        }

        .share-hashtag-input {
          flex: 1;
          min-width: 0;
          padding: 5px 10px;
          border-radius: var(--radius-md);
          border: 1px solid var(--neutral-700);
          background: var(--neutral-900);
          color: var(--text-primary);
          font-size: 0.8rem;
          outline: none;
          transition: border-color var(--transition-fast);
        }

        .share-hashtag-input:focus {
          border-color: var(--gold);
        }

        [data-theme="light"] .share-hashtag-input {
          background: var(--surface);
          border-color: var(--border-color);
        }

        .share-hashtag-add-btn {
          flex-shrink: 0;
          padding: 5px 10px;
          border-radius: var(--radius-md);
          border: 1px solid var(--gold);
          background: transparent;
          color: var(--gold);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }

        .share-hashtag-add-btn:hover:not(:disabled) {
          background: var(--gold);
          color: #fff;
        }

        .share-hashtag-add-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* === R5: Multi-image strip === */
        .share-multi-img {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .share-multi-img-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .share-multi-img-count {
          font-size: 0.72rem;
          color: var(--text-tertiary);
        }

        .share-multi-img-tiktok-warn {
          font-size: 0.72rem;
          color: #f59e0b;
          font-weight: 600;
        }

        .share-multi-img-strip {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .share-multi-img-thumb {
          position: relative;
          width: 64px;
          height: 64px;
          border-radius: 8px;
          overflow: visible;
          flex-shrink: 0;
          border: 2px solid var(--neutral-700);
        }

        .share-multi-img-thumb--primary {
          border-color: var(--gold);
        }

        .share-multi-img-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 6px;
          display: block;
        }

        .share-multi-img-thumb-badge {
          position: absolute;
          bottom: -6px;
          right: -6px;
          width: 18px;
          height: 18px;
          background: var(--gold);
          color: #fff;
          font-size: 0.6rem;
          font-weight: 700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--neutral-900);
        }

        .share-multi-img-remove {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: none;
          background: #ef4444;
          color: #fff;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          z-index: 1;
          transition: background var(--transition-fast);
        }

        .share-multi-img-remove:hover {
          background: #dc2626;
        }

        .share-multi-img-add {
          width: 64px;
          height: 64px;
          border: 2px dashed var(--neutral-600);
          border-radius: 8px;
          background: var(--neutral-900);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          color: var(--text-tertiary);
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .share-multi-img-add:hover {
          border-color: var(--gold);
          color: var(--gold);
          background: rgba(212,175,55,0.05);
        }

        .share-multi-img-add-plus {
          font-size: 1.2rem;
          font-weight: 300;
          line-height: 1;
        }

        .share-multi-img-add-label {
          font-size: 0.6rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      `}</style>
    </Drawer>
  );
}

function AiAccordionEntry({ icon: Icon, label, onClick, disabled, badge, title }) {
  return (
    <button type="button" className="ai-accordion-entry" onClick={onClick} disabled={disabled} title={title}>
      <span className="ai-accordion-entry-left">
        <Icon width="16" height="16" />
        <span>{label}</span>
      </span>
      {badge && <span className="ai-accordion-badge">{badge}</span>}
      <ChevronRight width="16" height="16" />
    </button>
  );
}
