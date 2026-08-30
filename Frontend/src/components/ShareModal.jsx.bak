import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  X,
  Share2,
  Facebook,
  Instagram,
  Video,
  Copy,
  Download,
  Loader2,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Pencil,
  Package,
  Image as ImageIcon,
  ExternalLink,
  Tag,
  Info,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  Plus,
  Wand2,
  RefreshCw,
  Check,
  Save,
  RotateCcw,
} from 'lucide-react';
import { generateShareImage } from '../utils/generateShareImage';
import { socialClient, tokensClient, productClient, serviceClient } from '../utils/apiClient';
import Helpers from '../utils/helpers';
import AiCopyGenerator from './AI/AiCopyGenerator';
import AiVideoGenerator from './AI/AiVideoGenerator';
import AiImageEnhancer from './AI/AiImageEnhancer';
import { useStore } from '../store/useStore';
import Drawer from './ui/Drawer';
import Modal from './ui/Modal';
import AccordionSection from './ui/AccordionSection';
import CategorySelect from './ui/CategorySelect';
import MarkdownEditor from './ui/MarkdownEditor';

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

function buildShareText(item, mode) {
  if (!item) return '';
  if (mode === 'wallPost') {
    return item.description || '';
  }
  const desc = item.description
    ? item.description.length > 100
      ? item.description.slice(0, 97) + '...'
      : item.description
    : '';
  const categoryText = item.category || '';
  const nameAndCategory = categoryText ? `${item.name} - ${categoryText}` : item.name;
  return `✨ ${nameAndCategory}${desc ? '\n\n' + desc : ''}\n\n💰 Precio: $${Number(item.price || 0).toLocaleString('es-CO')}\n\n¡Contáctanos para más información!`;
}

export default function ShareModal({
  isOpen,
  onClose,
  item: initialItem,
  onPublish,
  mode = 'item', // 'item' | 'wallPost'
  view,
  setView,
  dbCategories = [],
  onCategoryCreated,
  onItemUpdated,
}) {
  const navigate = useNavigate();
  const isWallPost = mode === 'wallPost';
  const [item, setItem] = useState(initialItem);
  const [openSection, setOpenSection] = useState('product'); // 'product' | 'ai' | 'social' | null
  const [isExpanded, setIsExpanded] = useState(false);
  const savedViewRef = useRef(null);

  // Section 1 real item editing state
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingFields, setEditingFields] = useState({});
  const [savingItem, setSavingItem] = useState(false);
  const [itemSaveError, setItemSaveError] = useState(null);

  // Wizard state for Section 3 (expanded mode)
  const [activeStep, setActiveStep] = useState('redactar'); // 'redactar' | 'cuentas' | 'revisar' | 'publicado'
  const [stepAiOptimizing, setStepAiOptimizing] = useState(false);
  const [platformFilter, setPlatformFilter] = useState('all'); // 'all' | 'meta' | 'tiktok'

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

  // Hashtag input state
  const [hashtagInput, setHashtagInput] = useState('');

  // R5 — Multi-image state
  const [additionalImages, setAdditionalImages] = useState([]); // [{ blob, previewUrl, uploadedUrl }]
  const additionalImageInputRef = useRef(null);

  // Synchronize item prop
  useEffect(() => {
    setItem(initialItem);
  }, [initialItem]);

  // R5 — derived: any selected account is TikTok?
  const hasTikTokSelected = useMemo(() => {
    return selectedAccounts.some((id) => {
      const acc = accounts.find((a) => a.id === id);
      return acc && acc.platform === 'tiktok';
    });
  }, [selectedAccounts, accounts]);

  useEffect(() => {
    if (isOpen) {
      setOpenSection('product');
      setIsExpanded(false);
      setIsEditingItem(false);
      setItemSaveError(null);
      setActiveStep('redactar');
      setStepAiOptimizing(false);
      setPlatformFilter('all');
      socialClient
        .listAccounts()
        .then((res) => setAccounts(res || []))
        .catch((err) => console.error('Failed to load accounts', err));
      tokensClient
        .getHourlyUsage()
        .then((res) => setHourlyLimitReached(Boolean(res && res.used_usd >= res.limit_usd)))
        .catch(() => setHourlyLimitReached(false));
    } else {
      if (savedViewRef.current && setView) {
        setView(savedViewRef.current);
        savedViewRef.current = null;
      }
      setIsExpanded(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (savedViewRef.current && setView) {
      setView(savedViewRef.current);
      savedViewRef.current = null;
    }
    setIsExpanded(false);
    onClose();
  }, [onClose, setView]);

  const handleToggleExpand = useCallback(() => {
    if (!isExpanded) {
      savedViewRef.current = view || null;
      setIsExpanded(true);
      if (setView) setView('list');
    } else {
      setIsExpanded(false);
      if (savedViewRef.current && setView) {
        setView(savedViewRef.current);
        savedViewRef.current = null;
      }
    }
  }, [isExpanded, view, setView]);

  const addHashtag = useCallback(() => {
    const tag = hashtagInput.trim().replace(/^#+/, '');
    if (!tag) return;
    const insertion = (shareText.endsWith(' ') || shareText === '' ? '' : ' ') + '#' + tag;
    setShareText((prev) => prev + insertion);
    setHashtagInput('');
  }, [hashtagInput, shareText]);

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
      setAdditionalImages((prev) => {
        prev.forEach((img) => img.previewUrl && URL.revokeObjectURL(img.previewUrl));
        return [];
      });
      setHashtagInput('');

      if (mode === 'wallPost') {
        const mediaUrl = Helpers.resolveMediaUrl(item.imageUrl || item.image_url);
        setPreviewUrl(mediaUrl || null);
        setLoadingImage(false);
        if (mediaUrl) {
          fetch(mediaUrl)
            .then((res) => {
              if (!res.ok) throw new Error('No se pudo cargar la imagen');
              return res.blob();
            })
            .then((blob) => setImageBlob(blob))
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
        .then((blob) => {
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
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const toggleAccount = (accountId) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
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
    a.download = `${(item?.name || 'post').replace(/\s+/g, '_')}_share.png`;
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
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.url) {
          setEnhancedImageUrl(data.url);
        }
        return data;
      })
      .catch((err) => console.error('Error subiendo imagen mejorada:', err));
  };

  // Section 1: Handle real item updates
  const handleSaveItemChanges = async () => {
    if (!item) return;
    setSavingItem(true);
    setItemSaveError(null);

    const isProduct = item.stock !== undefined;
    const payload = {
      name: editingFields.name,
      price: Number(editingFields.price || 0),
      status: editingFields.status,
      description: editingFields.description,
    };

    if (editingFields.category_id) {
      payload.category_id = editingFields.category_id;
    }

    if (isProduct) {
      if (editingFields.stock !== '') payload.stock = Number(editingFields.stock || 0);
    } else {
      if (editingFields.duration !== undefined) payload.duration = editingFields.duration;
    }

    try {
      let response;
      if (isProduct) {
        response = await productClient.update(item.id, payload);
      } else {
        response = await serviceClient.update(item.id, payload);
      }

      const updated = { ...item, ...payload, ...(response || {}) };
      setItem(updated);
      setIsEditingItem(false);

      if (onItemUpdated) {
        onItemUpdated(updated);
      }
    } catch (err) {
      console.error('Error actualizando ítem:', err);
      setItemSaveError(err.detail || err.message || 'Error al guardar los cambios en el servidor.');
    } finally {
      setSavingItem(false);
    }
  };

  const handlePublishClick = async () => {
    setPublishing(true);
    const linked = item?.linkedItem;

    const publishPromises = selectedAccounts.map((accountId) => {
      const acc = accounts.find((a) => a.id === accountId);
      const primaryUrl = aiVideoUrl || enhancedImageUrl || item?.imageUrl || item?.image_url || '';

      const buildPayload = (extraUrls) => ({
        account_id: accountId,
        platform: acc ? acc.platform : undefined,
        caption: shareText,
        media_url: primaryUrl,
        media_urls: extraUrls.length > 0 ? extraUrls : undefined,
        product_id: isWallPost
          ? linked?.kind === 'product'
            ? linked.id
            : null
          : item?.stock !== undefined
          ? item?.id
          : null,
        service_id: isWallPost
          ? linked?.kind === 'service'
            ? linked.id
            : null
          : item?.duration !== undefined
          ? item?.id
          : null,
        is_ai_generated: isAiGeneratedPost,
      });

      if (additionalImages.length === 0) {
        return socialClient.publish(buildPayload([]));
      }

      const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';
      const token = useStore.getState().currentUser?.token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const uploadPromises = additionalImages.map((img) => {
        const formData = new FormData();
        formData.append('file', img.blob, `additional_${Date.now()}.png`);
        return fetch(`${API_BASE_URL}/uploads/media`, { method: 'POST', headers, body: formData })
          .then((r) => r.json())
          .then((data) => data.url || null);
      });

      return Promise.all(uploadPromises).then((extraUrls) => {
        const allUrls = [primaryUrl, ...extraUrls.filter(Boolean)];
        return socialClient.publish(buildPayload(allUrls));
      });
    });

    const results = await Promise.allSettled(publishPromises);
    setPublishing(false);

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      console.error('Errors publishing:', failures);
      const errors = failures.map((f) => f.reason?.detail || f.reason?.message || 'Desconocido').join(', ');
      alert(`Hubo errores al publicar en algunas cuentas:\n${errors}`);
    } else {
      if (onPublish) {
        onPublish({ selectedAccounts, text: shareText, item });
      }
      if (isExpanded) {
        setActiveStep('publicado');
        setOpenSection('social');
      } else {
        handleClose();
      }
    }
  };

  const activeAccounts = accounts.filter((a) => a.status === 'active');
  const activeAccountIds = activeAccounts.map((a) => a.id);

  const filteredActiveAccounts = activeAccounts.filter((a) => {
    if (platformFilter === 'meta') return a.platform === 'facebook' || a.platform === 'instagram';
    if (platformFilter === 'tiktok') return a.platform === 'tiktok';
    return true;
  });

  const isAllSelected =
    activeAccountIds.length > 0 && activeAccountIds.every((id) => selectedAccounts.includes(id));

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedAccounts(activeAccountIds);
    } else {
      setSelectedAccounts([]);
    }
  };

  const addAdditionalImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = file;
    const previewUrl = URL.createObjectURL(blob);
    setAdditionalImages((prev) => [...prev, { blob, previewUrl, uploadedUrl: null }]);
    e.target.value = '';
  };

  const removeAdditionalImage = (index) => {
    setAdditionalImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const hasSelected = selectedAccounts.length > 0;

  // ── Summaries Calculation ──────────────────────────────────────────────────
  const productSummary = isWallPost
    ? item?.description
      ? item.description.slice(0, 30) + '...'
      : 'Publicación'
    : `${item?.name || 'Producto'} · $${Number(item?.price || 0).toLocaleString('es-CO')}${
        item?.stock !== undefined ? ` | ${item.stock} uds` : ''
      }`;

  const aiSummary = activeAiSection === 'copy' ? 'Texto generado' : 'Herramientas de IA';

  const socialSummary =
    activeAccounts.length === 0
      ? 'Desconectado'
      : selectedAccounts.length === 0
      ? '0 seleccionadas'
      : `Seleccionados: ${selectedAccounts.length} publicació${selectedAccounts.length > 1 ? 'nes' : 'n'}`;

  // Helper renderer for unified text editor with MarkdownEditor
  const renderTextEditor = () => (
    <div className="form-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <label className="form-label" style={{ marginBottom: 0 }}>Texto para publicar</label>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <label className="share-checkbox-label" style={{ fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              className="form-checkbox"
              onChange={(e) => {
                if (e.target.checked && item) {
                  setShareText(buildShareText(item, mode));
                }
              }}
            />
            <span>Auto-rellenar detalles</span>
          </label>
          <label className="share-checkbox-label" style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              className="form-checkbox"
              checked={stepAiOptimizing}
              onChange={(e) => setStepAiOptimizing(e.target.checked)}
            />
            <span><Wand2 width={12} height={12} className="inline mr-1" />Optimizar con IA</span>
          </label>
        </div>
      </div>

      {stepAiOptimizing ? (
        <div className="share-step-ai-panel">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase text-gold">Generador de Copy IA</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon-only"
              onClick={() => setStepAiOptimizing(false)}
            >
              <X width={14} height={14} />
            </button>
          </div>
          <AiCopyGenerator
            item={item}
            onGenerated={(text) => {
              setShareText(text);
              setIsAiGeneratedPost(true);
              setStepAiOptimizing(false);
            }}
          />
        </div>
      ) : (
        <>
          <MarkdownEditor
            value={shareText}
            onChange={(val) => setShareText(val)}
            rows={isExpanded ? 6 : 4}
          />
          <div className="share-hashtag-row mt-2">
            <span className="share-hashtag-label">#</span>
            <input
              type="text"
              className="share-hashtag-input"
              placeholder="agrega una etiqueta y presiona Enter"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value.replace(/\s/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addHashtag();
                }
              }}
            />
            <button
              type="button"
              className="share-hashtag-add-btn"
              onClick={addHashtag}
              disabled={!hashtagInput.trim()}
            >
              + Agregar
            </button>
            <div style={{ flex: 1 }} />
            <span className={`share-char-counter ${shareText.length > 2200 ? 'share-char-counter--warn' : ''}`}>
              {shareText.length} / 2200
            </span>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      position="right"
      width={isExpanded ? 'min(1120px, 92vw)' : '560px'}
      onToggleExpand={handleToggleExpand}
      isExpanded={isExpanded}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Share2 width="20" height="20" />
          Publicar en redes sociales
        </div>
      }
    >
      <div
        className={`share-modal-body ${isExpanded ? 'share-modal--expanded' : ''}`}
      >
        <form id="share-modal-accordion-form" className="d-flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          {/* ── 1. EDITAR PRODUCTO / PUBLICACIÓN ── */}
          <AccordionSection
            icon={<Pencil width={18} height={18} />}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>{isWallPost ? '1. EDITAR PUBLICACIÓN' : '1. EDITAR PRODUCTO'}</span>
                {!isWallPost && (
                  <button
                    type="button"
                    className={`btn btn-ghost btn-xs ${isEditingItem ? 'text-gold' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isEditingItem && item) {
                        setEditingFields({
                          name: item.name || '',
                          category_id: item.category_id || item.category || '',
                          price: item.price || 0,
                          stock: item.stock !== undefined ? item.stock : '',
                          duration: item.duration || '',
                          status: item.status || 'active',
                          description: item.description || '',
                        });
                      }
                      setIsEditingItem(!isEditingItem);
                    }}
                    title={isEditingItem ? 'Cancelar edición' : 'Editar información del producto/servicio'}
                  >
                    <Pencil width={14} height={14} className="mr-1 inline" />
                    {isEditingItem ? 'Cancelar edición' : 'Editar'}
                  </button>
                )}
              </div>
            }
            isOpen={openSection === 'product'}
            onToggle={() => setOpenSection(openSection === 'product' ? null : 'product')}
            summary={productSummary}
          >
            <div className={`share-sec-grid ${isExpanded ? 'is-expanded-grid' : ''}`}>
              <div className="share-sec-col-main">
                <div className="share-preview">
                  <label className="form-label">Vista previa de referencia</label>
                  <div className={isWallPost ? 'share-preview-card share-preview-card--wallpost' : 'share-preview-card'}>
                    {loadingImage ? (
                      <div className="share-preview-loading">
                        <Loader2 width={32} height={32} className="spin" />
                      </div>
                    ) : previewUrl ? (
                      aiVideoUrl ? (
                        <video src={aiVideoUrl} autoPlay loop muted playsInline className="share-preview-image" style={{ objectFit: 'cover' }} />
                      ) : (
                        <img
                          src={previewUrl}
                          alt="Vista previa"
                          className="share-preview-image"
                          onClick={() => setIsImagePreviewOpen(true)}
                          style={{ cursor: 'pointer' }}
                          title="Ampliar imagen"
                        />
                      )
                    ) : (
                      <div className="share-preview-placeholder">
                        <Share2 width={48} height={48} />
                      </div>
                    )}
                    {!isWallPost && item && (
                      <div className="share-preview-info">
                        <span className="share-preview-name">{item.name}</span>
                        <span className="share-preview-price">$ {Number(item.price || 0).toLocaleString('es-CO')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* R5 — Multi-image selector */}
                {!isWallPost && !aiVideoUrl && (
                  <div className="share-multi-img mt-3">
                    <div className="share-multi-img-header">
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        Imágenes adicionales
                      </label>
                      {hasTikTokSelected ? (
                        <span className="share-multi-img-tiktok-warn">⚠️ TikTok solo permite 1 imagen</span>
                      ) : (
                        <span className="share-multi-img-count">
                          {additionalImages.length > 0 ? `${additionalImages.length + 1} imágenes (carousel)` : 'Agrega hasta 9'}
                        </span>
                      )}
                    </div>

                    <div className="share-multi-img-strip">
                      {/* Primary image thumbnail */}
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

                      {/* Add button */}
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

                    <input
                      ref={additionalImageInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={addAdditionalImage}
                    />
                  </div>
                )}
              </div>

              {/* Columna Derecha o bloque de Edición Real */}
              {!isWallPost && item && (
                <div className="share-sec-col-details">
                  {isEditingItem ? (
                    /* Formulario de Edición Real */
                    <div className="share-product-details-card share-edit-form-card">
                      <div className="share-details-header">
                        <Pencil width={16} height={16} className="text-gold" />
                        <span className="font-semibold text-sm">Editar información del ítem</span>
                      </div>

                      {itemSaveError && (
                        <div className="ai-copy-error text-xs">⚠️ {itemSaveError}</div>
                      )}

                      <div className="form-group">
                        <label className="form-label">Nombre</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editingFields.name || ''}
                          onChange={(e) => setEditingFields({ ...editingFields, name: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Categoría</label>
                        <CategorySelect
                          entityType={item.stock !== undefined ? 'product' : 'service'}
                          categories={dbCategories}
                          value={editingFields.category_id || ''}
                          onChange={(val) => setEditingFields({ ...editingFields, category_id: val })}
                          onCategoryCreated={onCategoryCreated}
                        />
                      </div>

                      <div className="share-details-grid">
                        <div className="form-group">
                          <label className="form-label">Precio ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={editingFields.price || 0}
                            onChange={(e) => setEditingFields({ ...editingFields, price: e.target.value })}
                          />
                        </div>

                        {item.stock !== undefined ? (
                          <div className="form-group">
                            <label className="form-label">Stock</label>
                            <input
                              type="number"
                              className="form-input"
                              value={editingFields.stock !== undefined ? editingFields.stock : ''}
                              onChange={(e) => setEditingFields({ ...editingFields, stock: e.target.value })}
                            />
                          </div>
                        ) : (
                          <div className="form-group">
                            <label className="form-label">Duración</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="ej. 30 min"
                              value={editingFields.duration || ''}
                              onChange={(e) => setEditingFields({ ...editingFields, duration: e.target.value })}
                            />
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Estado</label>
                        <select
                          className="form-select"
                          value={editingFields.status || 'active'}
                          onChange={(e) => setEditingFields({ ...editingFields, status: e.target.value })}
                        >
                          <option value="active">Activo</option>
                          <option value="inactive">Inactivo</option>
                          {item.stock !== undefined && <option value="out_of_stock">Agotado</option>}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Descripción</label>
                        <MarkdownEditor
                          value={editingFields.description || ''}
                          onChange={(val) => setEditingFields({ ...editingFields, description: val })}
                          rows={4}
                        />
                      </div>

                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setIsEditingItem(false)}
                          disabled={savingItem}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleSaveItemChanges}
                          disabled={savingItem}
                        >
                          {savingItem ? (
                            <>
                              <Loader2 width={14} height={14} className="spin" /> Guardando...
                            </>
                          ) : (
                            <>
                              <Save width={14} height={14} /> Guardar cambios
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Ficha técnica en modo lectura */
                    isExpanded && (
                      <div className="share-product-details-card">
                        <div className="share-details-header">
                          <Package width={18} height={18} className="text-gold" />
                          <span className="font-semibold text-sm">Ficha técnica del producto</span>
                        </div>

                        <div className="share-details-grid">
                          <div className="share-detail-item">
                            <span className="share-detail-label">Categoría</span>
                            <span className="share-detail-val">{item.category || 'General'}</span>
                          </div>
                          <div className="share-detail-item">
                            <span className="share-detail-label">Estado</span>
                            <span className="share-detail-val">
                              {item.status === 'active' ? '🟢 Activo' : item.status === 'inactive' ? '🔴 Inactivo' : '🟡 Agotado'}
                            </span>
                          </div>
                          {item.stock !== undefined && (
                            <div className="share-detail-item">
                              <span className="share-detail-label">Inventario</span>
                              <span className="share-detail-val">{item.stock} unidades</span>
                            </div>
                          )}
                          {item.duration && (
                            <div className="share-detail-item">
                              <span className="share-detail-label">Duración</span>
                              <span className="share-detail-val">{item.duration}</span>
                            </div>
                          )}
                          {item.created_at && (
                            <div className="share-detail-item">
                              <span className="share-detail-label">Creado el</span>
                              <span className="share-detail-val">{new Date(item.created_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {item.description && (
                          <div className="share-detail-desc-block">
                            <span className="share-detail-label">Descripción completa:</span>
                            <p className="share-detail-desc">{item.description}</p>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </AccordionSection>

          {/* ── 2. MEJORAR CON IA ── */}
          <AccordionSection
            icon={<Sparkles width={18} height={18} />}
            title="2. MEJORAR CON IA"
            isOpen={openSection === 'ai'}
            onToggle={() => setOpenSection(openSection === 'ai' ? null : 'ai')}
            summary={aiSummary}
          >
            {activeAiSection === null ? (
              <div className={`ai-cards-grid ${isExpanded ? 'is-expanded' : ''}`}>
                {/* Tarjeta 1: Generar Texto (Activa) */}
                <button
                  type="button"
                  className="ai-card-btn"
                  onClick={() => setActiveAiSection('copy')}
                >
                  <div className="ai-card-icon-wrapper">
                    <Sparkles width={20} height={20} />
                  </div>
                  <div className="ai-card-title">Generar Texto</div>
                  <div className="ai-card-desc">
                    {isExpanded
                      ? 'Redacta descripciones atractivas con diferentes tonos de voz'
                      : 'Crea copys para redes'}
                  </div>
                </button>

                {/* Tarjeta 2: Mejorar Imágenes (Próximamente / Disabled) */}
                <button
                  type="button"
                  className="ai-card-btn ai-card-disabled"
                  disabled={true}
                  title="Próximamente — Mejora de imágenes con IA"
                >
                  <span className="badge-coming-soon ai-card-badge">Próximamente</span>
                  <div className="ai-card-icon-wrapper">
                    <ImageIcon width={20} height={20} />
                  </div>
                  <div className="ai-card-title">Mejorar Imágenes</div>
                  <div className="ai-card-desc">
                    {isExpanded
                      ? 'Aplica retoques, quita fondos y mejora la iluminación de fotos'
                      : 'Retoques y filtros'}
                  </div>
                </button>

                {/* Tarjeta 3: Generar Video (Próximamente / Disabled) */}
                <button
                  type="button"
                  className="ai-card-btn ai-card-disabled ai-card-video"
                  disabled={true}
                  title="Próximamente — Generación de video con IA"
                >
                  <span className="badge-coming-soon ai-card-badge">Próximamente</span>
                  <div className="ai-card-icon-wrapper">
                    <Video width={20} height={20} />
                  </div>
                  <div className="ai-card-title">Generar Video</div>
                  <div className="ai-card-desc">
                    {isExpanded
                      ? 'Convierte las fotos de tu producto en clips de video dinámicos'
                      : 'Promos animadas'}
                  </div>
                </button>
              </div>
            ) : (
              <div className="ai-section-expanded">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActiveAiSection(null)}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <ArrowLeft width="16" height="16" />
                  Volver a opciones de IA
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
          </AccordionSection>

          {/* ── 3. REDES SOCIALES META Y TIKTOK ── */}
          <AccordionSection
            icon={<Share2 width={18} height={18} />}
            title="3. REDES SOCIALES META Y TIKTOK"
            isOpen={openSection === 'social'}
            onToggle={() => setOpenSection(openSection === 'social' ? null : 'social')}
            summary={socialSummary}
          >
            {!isExpanded ? (
              /* ── MODO CLÁSICO (Sin expandir - 560px) ── */
              <div className="share-sec-grid">
                <div className="share-sec-col-main">
                  {renderTextEditor()}
                </div>
                <div className="share-sec-col-accounts">
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        Selecciona las cuentas
                      </label>
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
                          <Link to="/profile?tab=social" className="text-primary ml-1 hover:underline">
                            Ir a Configuración <ExternalLink width={12} height={12} className="inline ml-1" />
                          </Link>
                        </div>
                      ) : (
                        activeAccounts.map((account) => {
                          const Icon = NETWORK_ICONS[account.platform] || Share2;
                          const label = account.display_label || account.platform_username || account.platform_user_id;
                          const platformName = NETWORK_LABELS[account.platform] || account.platform;
                          return (
                            <div
                              key={account.id}
                              className="share-network-container"
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', width: '100%' }}
                            >
                              <label className="share-network-option" style={{ flex: 1 }}>
                                <input
                                  type="checkbox"
                                  checked={selectedAccounts.includes(account.id)}
                                  onChange={() => toggleAccount(account.id)}
                                  className="form-checkbox"
                                />
                                <span className="share-network-icon">
                                  <Icon width="18" height="18" />
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '0.875rem' }}>{label}</span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    {platformName} {account.account_type === 'business' ? '(Business)' : ''}{' '}
                                    {account.is_default ? '⭐' : ''}
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
                </div>
              </div>
            ) : (
              /* ── MODO EXPANDIDO (Wizard de 4 pasos) ── */
              <div className="share-wizard-container">
                {/* Barra superior de 4 pasos */}
                <div className="share-wizard-steps">
                  <button
                    type="button"
                    className={`share-wizard-step ${activeStep === 'redactar' ? 'is-active' : ''}`}
                    onClick={() => activeStep !== 'publicado' && setActiveStep('redactar')}
                  >
                    <span className="share-wizard-step-num">1</span>
                    <span className="share-wizard-step-label">Redactar</span>
                  </button>
                  <div className="share-wizard-step-line" />
                  <button
                    type="button"
                    className={`share-wizard-step ${activeStep === 'cuentas' ? 'is-active' : ''}`}
                    onClick={() => activeStep !== 'publicado' && setActiveStep('cuentas')}
                  >
                    <span className="share-wizard-step-num">2</span>
                    <span className="share-wizard-step-label">Seleccionar cuentas</span>
                  </button>
                  <div className="share-wizard-step-line" />
                  <button
                    type="button"
                    className={`share-wizard-step ${activeStep === 'revisar' ? 'is-active' : ''}`}
                    onClick={() => activeStep !== 'publicado' && setActiveStep('revisar')}
                  >
                    <span className="share-wizard-step-num">3</span>
                    <span className="share-wizard-step-label">Revisar</span>
                  </button>
                  <div className="share-wizard-step-line" />
                  <button
                    type="button"
                    className={`share-wizard-step ${activeStep === 'publicado' ? 'is-active' : 'is-disabled'}`}
                    disabled={activeStep !== 'publicado'}
                  >
                    <span className="share-wizard-step-num">
                      {activeStep === 'publicado' ? <Check width={12} height={12} /> : '4'}
                    </span>
                    <span className="share-wizard-step-label">Publicado</span>
                  </button>
                </div>

                {/* Contenido del paso activo */}
                <div className="share-wizard-content mt-4">
                  {/* ── PASO 1: REDACTAR ── */}
                  {activeStep === 'redactar' && (
                    <div className="share-wizard-step-body">
                      {renderTextEditor()}
                      <div className="flex justify-end mt-2">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setActiveStep('cuentas')}
                        >
                          Siguiente: Cuentas <ChevronRight width={14} height={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── PASO 2: SELECCIONAR CUENTAS ── */}
                  {activeStep === 'cuentas' && (
                    <div className="share-wizard-step-body">
                      {activeAccounts.length === 0 ? (
                        <div className="share-connect-cta-card">
                          <div className="share-connect-cta-icon">
                            <Share2 width={28} height={28} />
                          </div>
                          <div className="share-connect-cta-text">
                            <h4>Conecta tus Redes Sociales</h4>
                            <p>
                              Empieza por vincular tus páginas de Facebook, Instagram o cuentas de TikTok para publicar automáticamente tus productos.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary w-full mt-2"
                            onClick={() => navigate('/profile?tab=social')}
                          >
                            <Plus width={16} height={16} /> Conectar cuentas ahora <ExternalLink width={14} height={14} className="ml-1" />
                          </button>
                        </div>
                      ) : (
                        <div className="form-group">
                          {/* Filtros de plataforma opcionales */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="share-filter-pills">
                              <button
                                type="button"
                                className={`share-filter-pill ${platformFilter === 'all' ? 'is-active' : ''}`}
                                onClick={() => setPlatformFilter('all')}
                              >
                                Todas ({activeAccounts.length})
                              </button>
                              <button
                                type="button"
                                className={`share-filter-pill ${platformFilter === 'meta' ? 'is-active' : ''}`}
                                onClick={() => setPlatformFilter('meta')}
                              >
                                Meta ({accounts.filter((a) => a.platform === 'facebook' || a.platform === 'instagram').length})
                              </button>
                              <button
                                type="button"
                                className={`share-filter-pill ${platformFilter === 'tiktok' ? 'is-active' : ''}`}
                                onClick={() => setPlatformFilter('tiktok')}
                              >
                                TikTok ({accounts.filter((a) => a.platform === 'tiktok').length})
                              </button>
                            </div>

                            <label className="share-network-option" style={{ padding: '0', border: 'none', background: 'transparent' }}>
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={handleSelectAll}
                                className="form-checkbox"
                              />
                              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Seleccionar todas</span>
                            </label>
                          </div>

                          <div className="share-networks">
                            {filteredActiveAccounts.map((account) => {
                              const Icon = NETWORK_ICONS[account.platform] || Share2;
                              const label = account.display_label || account.platform_username || account.platform_user_id;
                              const platformName = NETWORK_LABELS[account.platform] || account.platform;
                              return (
                                <div
                                  key={account.id}
                                  className="share-network-container"
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', width: '100%' }}
                                >
                                  <label className="share-network-option" style={{ flex: 1 }}>
                                    <input
                                      type="checkbox"
                                      checked={selectedAccounts.includes(account.id)}
                                      onChange={() => toggleAccount(account.id)}
                                      className="form-checkbox"
                                    />
                                    <span className="share-network-icon">
                                      <Icon width="18" height="18" />
                                    </span>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '0.875rem' }}>{label}</span>
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                        {platformName} {account.account_type === 'business' ? '(Business)' : ''}{' '}
                                        {account.is_default ? '⭐' : ''}
                                      </span>
                                    </div>
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between mt-3">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setActiveStep('redactar')}
                        >
                          <ArrowLeft width={14} height={14} /> Atrás
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setActiveStep('revisar')}
                        >
                          Siguiente: Revisar <ChevronRight width={14} height={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── PASO 3: REVISAR ── */}
                  {activeStep === 'revisar' && (
                    <div className="share-wizard-step-body">
                      <div className="share-review-card">
                        <div className="share-review-header">
                          <CheckCircle2 width={18} height={18} className="text-gold" />
                          <span>Resumen de la publicación</span>
                        </div>

                        <div className="share-review-grid">
                          <div className="share-review-item-col">
                            {previewUrl && (
                              <img src={previewUrl} alt="Vista previa" className="share-review-img" />
                            )}
                            {item && (
                              <div className="share-review-item-meta">
                                <span className="font-semibold text-sm">{item.name}</span>
                                <span className="text-xs text-gold">$ {Number(item.price || 0).toLocaleString('es-CO')}</span>
                              </div>
                            )}
                          </div>

                          <div className="share-review-text-col">
                            <label className="share-detail-label">Texto final:</label>
                            <p className="share-review-caption">{shareText || '*Sin texto*'}</p>
                          </div>
                        </div>

                        <div className="share-review-target-accounts mt-3">
                          <label className="share-detail-label">Cuentas destino ({selectedAccounts.length}):</label>
                          {selectedAccounts.length === 0 ? (
                            <p className="text-xs text-danger mt-1">⚠️ Ninguna cuenta seleccionada. Vuelve al paso anterior o selecciona cuentas.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {selectedAccounts.map((id) => {
                                const acc = accounts.find((a) => a.id === id);
                                if (!acc) return null;
                                const Icon = NETWORK_ICONS[acc.platform] || Share2;
                                return (
                                  <span key={id} className="share-account-chip">
                                    <Icon width={12} height={12} />
                                    <span>{acc.display_label || acc.platform_username || acc.platform_user_id}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-3">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setActiveStep('cuentas')}
                        >
                          <ArrowLeft width={14} height={14} /> Modificar cuentas
                        </button>
                        <span className="text-xs text-secondary">
                          Usa el botón <strong>PUBLICAR</strong> del pie para confirmar.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ── PASO 4: PUBLICADO ── */}
                  {activeStep === 'publicado' && (
                    <div className="share-wizard-step-body">
                      <div className="share-success-card">
                        <div className="share-success-icon">
                          <CheckCircle2 width={48} height={48} />
                        </div>
                        <h3>¡Publicado con éxito!</h3>
                        <p className="text-sm text-secondary text-center mb-3">
                          Tu publicación se envió correctamente a las siguientes cuentas seleccionadas:
                        </p>
                        <div className="flex flex-col gap-2 w-full max-w-sm">
                          {selectedAccounts.map((id) => {
                            const acc = accounts.find((a) => a.id === id);
                            if (!acc) return null;
                            const Icon = NETWORK_ICONS[acc.platform] || Share2;
                            return (
                              <div key={id} className="share-success-account-row">
                                <Icon width={16} height={16} className="text-gold" />
                                <span className="font-medium text-sm flex-1">{acc.display_label || acc.platform_username || acc.platform_user_id}</span>
                                <Check width={16} height={16} className="text-success" />
                              </div>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary mt-4"
                          onClick={handleClose}
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </AccordionSection>
        </form>

        <div className="drawer-form-actions" style={{ borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-outline" onClick={handleClose}>
            Cancelar
          </button>
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
        actions={[{ label: 'Cerrar', onClick: () => setIsImagePreviewOpen(false) }]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', gridColumn: '1 / -1', width: '100%' }}>
          <img
            src={previewUrl}
            alt="Vista previa detallada"
            style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px' }}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', margin: 0, textWrap: 'wrap' }}>
            {isWallPost
              ? 'Esta es la imagen que acompañará la publicación.'
              : 'Esta imagen incluye el texto incrustado que se publicará en las redes.'}
          </p>
        </div>
      </Modal>

      <style>{`
        /* ── Layout del Modal Body & Footer Fijo al Fondo ── */
        .share-modal-body {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .share-modal-body #share-modal-accordion-form {
          flex: 1;
        }

        .share-modal-body .drawer-form-actions {
          position: sticky;
          bottom: 0;
          margin-top: auto;
          padding: 12px 16px;
          z-index: 20;
        }

        /* ── TEMA OSCURO (Default): Negro Puro (#000000) & Dorado ── */
        .share-modal-body {
          background: #000000 !important;
        }

        .share-modal-body .accordion-section-header {
          background: #000000 !important;
          border-color: #222222 !important;
        }

        .share-modal-body .accordion-section-icon,
        .share-modal-body .accordion-section-title,
        .share-modal-body .accordion-section-chevron,
        .share-modal-body .accordion-section-summary {
          color: var(--gold) !important;
        }

        .share-modal-body .share-product-details-card,
        .share-modal-body .share-review-card,
        .share-modal-body .share-success-card,
        .share-modal-body .share-connect-cta-card,
        .share-modal-body .share-wizard-steps,
        .share-modal-body .ai-card-btn,
        .share-modal-body .share-edit-form-card {
          background: #000000 !important;
          border-color: #222222 !important;
        }

        .share-modal-body .drawer-form-actions {
          background: #000000 !important;
          border-top: 1px solid #222222 !important;
        }

        /* ── TEMA CLARO ([data-theme="light"]): Blanco & Negro Estricto ── */
        [data-theme="light"] .share-modal-body {
          background: #ffffff !important;
          color: #121212 !important;
        }

        [data-theme="light"] .share-modal-body .accordion-section-header {
          background: #f5f5f5 !important;
          border-color: #e5e5e5 !important;
          color: #000000 !important;
        }

        [data-theme="light"] .share-modal-body .accordion-section-header .accordion-section-icon,
        [data-theme="light"] .share-modal-body .accordion-section-header .accordion-section-title,
        [data-theme="light"] .share-modal-body .accordion-section-header .accordion-section-chevron,
        [data-theme="light"] .share-modal-body .accordion-section-header .accordion-section-summary {
          color: #000000 !important;
        }

        [data-theme="light"] .share-modal-body .share-wizard-steps {
          background: #f5f5f5 !important;
          border-color: #e5e5e5 !important;
        }

        [data-theme="light"] .share-modal-body .share-wizard-step.is-active {
          color: #000000 !important;
        }

        [data-theme="light"] .share-modal-body .share-wizard-step.is-active .share-wizard-step-num {
          background: #000000 !important;
          border-color: #000000 !important;
          color: #ffffff !important;
        }

        [data-theme="light"] .share-modal-body .ai-card-btn {
          background: #f5f5f5 !important;
          border-color: #e5e5e5 !important;
          color: #000000 !important;
        }

        [data-theme="light"] .share-modal-body .ai-card-btn:hover:not(:disabled) {
          border-color: #000000 !important;
        }

        [data-theme="light"] .share-modal-body .ai-card-icon-wrapper {
          background: #e5e5e5 !important;
          color: #000000 !important;
        }

        [data-theme="light"] .share-modal-body .share-preview-card {
          background: #f5f5f5 !important;
          border-color: #e5e5e5 !important;
        }

        [data-theme="light"] .share-modal-body .share-preview-price {
          color: #000000 !important;
        }

        [data-theme="light"] .share-modal-body .share-product-details-card,
        [data-theme="light"] .share-modal-body .share-review-card,
        [data-theme="light"] .share-modal-body .share-success-card,
        [data-theme="light"] .share-modal-body .share-connect-cta-card,
        [data-theme="light"] .share-modal-body .share-edit-form-card {
          background: #ffffff !important;
          border-color: #e5e5e5 !important;
        }

        [data-theme="light"] .share-modal-body .drawer-form-actions {
          background: #ffffff !important;
          border-top: 1px solid #e5e5e5 !important;
        }

        [data-theme="light"] .share-modal-body .share-filter-pill.is-active {
          background: #000000 !important;
          border-color: #000000 !important;
          color: #ffffff !important;
        }

        [data-theme="light"] .share-modal-body .share-network-option input:checked {
          accent-color: #000000 !important;
        }

        [data-theme="light"] .share-modal-body .share-multi-img-thumb--primary {
          border-color: #000000 !important;
        }

        [data-theme="light"] .share-modal-body .share-multi-img-thumb-badge {
          background: #000000 !important;
          color: #ffffff !important;
        }

        [data-theme="light"] .share-modal-body .share-hashtag-label,
        [data-theme="light"] .share-modal-body .share-hashtag-add-btn {
          color: #000000 !important;
          border-color: #000000 !important;
        }

        /* ── Edición Real del Ítem ── */
        .share-edit-form-card {
          border: 1px solid var(--gold);
          border-radius: var(--radius-md);
          padding: 1rem;
        }

        /* ── Wizard de 4 pasos (Modo Expandido) ── */
        .share-wizard-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .share-wizard-steps {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
        }

        .share-wizard-step {
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }

        .share-wizard-step:hover:not(.is-disabled) {
          color: var(--text-primary);
          background: var(--surface-hover);
        }

        .share-wizard-step.is-active {
          color: var(--gold);
          font-weight: 700;
        }

        .share-wizard-step.is-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .share-wizard-step-num {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          font-size: 0.75rem;
          font-weight: 700;
        }

        .share-wizard-step.is-active .share-wizard-step-num {
          background: var(--gold-dim);
          border-color: var(--gold);
          color: var(--gold);
        }

        .share-wizard-step-label {
          font-size: 0.8rem;
        }

        @media (max-width: 640px) {
          .share-wizard-step-label {
            display: none;
          }
        }

        .share-wizard-step-line {
          flex: 1;
          height: 1px;
          background: var(--border-color);
          margin: 0 8px;
        }

        /* Inline IA Panel */
        .share-step-ai-panel {
          background: var(--surface-raised);
          border: 1px dashed var(--gold);
          border-radius: var(--radius-md);
          padding: 12px;
          margin-bottom: 12px;
        }

        /* CTA Card Conectar Cuentas */
        .share-connect-cta-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 10px;
          padding: 24px;
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-lg);
        }

        .share-connect-cta-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--gold-dim);
          color: var(--gold);
        }

        /* Filter Pills */
        .share-filter-pills {
          display: flex;
          gap: 6px;
        }

        .share-filter-pill {
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-secondary);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .share-filter-pill:hover,
        .share-filter-pill.is-active {
          border-color: var(--gold);
          color: var(--gold);
          background: var(--gold-dim);
        }

        /* Review Step Card */
        .share-review-card {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .share-review-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
        }

        .share-review-grid {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 16px;
        }

        @media (max-width: 520px) {
          .share-review-grid {
            grid-template-columns: 1fr;
          }
        }

        .share-review-img {
          width: 100%;
          height: 100px;
          object-fit: cover;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .share-review-caption {
          font-size: 0.82rem;
          color: var(--text-primary);
          background: var(--card-bg);
          padding: 10px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          white-space: pre-wrap;
          max-height: 120px;
          overflow-y: auto;
          margin-top: 4px;
        }

        .share-account-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 999px;
          font-size: 0.75rem;
        }

        /* Success Step Screen */
        .share-success-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
        }

        .share-success-icon {
          color: var(--success);
          margin-bottom: 12px;
        }

        .share-success-account-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }

        /* Grid Layout de Secciones */
        .share-sec-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .share-sec-grid.is-expanded-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        @media (max-width: 768px) {
          .share-sec-grid.is-expanded-grid {
            grid-template-columns: 1fr;
          }
        }

        .share-sec-col-main {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .share-sec-col-details,
        .share-sec-col-accounts {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* Product Details Card */
        .share-product-details-card {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .share-details-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
        }

        .share-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .share-detail-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: var(--card-bg);
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .share-detail-label {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 600;
        }

        .share-detail-val {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .share-detail-desc-block {
          margin-top: 4px;
          background: var(--card-bg);
          padding: 10px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .share-detail-desc {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 4px;
          line-height: 1.4;
          white-space: pre-wrap;
          max-height: 140px;
          overflow-y: auto;
        }

        /* AI Grid Cards */
        .ai-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .ai-cards-grid.is-expanded {
          gap: 16px;
        }

        @media (max-width: 520px) {
          .ai-cards-grid {
            grid-template-columns: 1fr;
          }
        }

        .ai-card-btn {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 14px 10px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .ai-cards-grid.is-expanded .ai-card-btn {
          padding: 20px 14px;
        }

        .ai-card-disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .ai-card-video {
          background: rgba(196, 168, 224, 0.1);
          border-color: rgba(196, 168, 224, 0.3);
        }

        .ai-card-badge {
          position: absolute;
          top: 6px;
          right: 6px;
        }

        .ai-card-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--gold-dim);
          color: var(--gold);
          margin-bottom: 8px;
        }

        .ai-card-title {
          font-size: 0.82rem;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .ai-card-desc {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .share-preview {
          margin-bottom: var(--space-2);
        }

        .share-preview-card {
          border-radius: var(--radius-lg);
          overflow: hidden;
          display: flex;
          flex-direction: row;
          height: 90px;
          border: 1px solid var(--border-color);
        }

        .share-preview-card--wallpost {
          height: auto;
          flex-direction: column;
        }

        .share-preview-card--wallpost .share-preview-image {
          width: 100%;
          height: auto;
          max-height: 250px;
          object-fit: cover;
        }

        .share-preview-card--wallpost .share-preview-loading,
        .share-preview-card--wallpost .share-preview-placeholder {
          width: 100%;
          height: 120px;
        }

        .share-preview-image {
          width: 90px;
          height: 90px;
          object-fit: cover;
        }

        .share-preview-loading,
        .share-preview-placeholder {
          width: 90px;
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-tertiary);
        }

        .share-preview-info {
          flex: 1;
          padding: var(--space-2) var(--space-3);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          gap: 2px;
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

        .ai-section-expanded {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .ai-context-ref {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
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
          width: 64px;
          height: 64px;
          object-fit: cover;
          border-radius: var(--radius-md);
          flex-shrink: 0;
          border: 1px solid var(--border-color);
        }

        .ai-context-ref-text {
          margin: 0;
          font-size: var(--text-xs);
          color: var(--text-secondary);
          line-height: var(--leading-relaxed);
          white-space: pre-line;
          max-height: 80px;
          overflow-y: auto;
        }

        .share-networks {
          display: flex;
          gap: var(--space-3);
          flex-wrap: wrap;
        }

        .share-network-option {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          cursor: pointer;
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          transition: all var(--transition-fast);
          font-size: var(--text-sm);
        }

        .share-network-option:hover {
          border-color: var(--gold);
        }

        .share-network-option input {
          accent-color: var(--gold);
        }

        .share-network-icon {
          color: var(--text-secondary);
        }

        .share-instagram-panel {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          margin-top: var(--space-3);
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

        .share-modal-body .drawer-form-actions {
          justify-content: center;
        }

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

        .share-hashtag-row {
          display: flex;
          align-items: center;
          gap: 6px;
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
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-primary);
          font-size: 0.8rem;
          outline: none;
          transition: border-color var(--transition-fast);
        }

        .share-hashtag-input:focus {
          border-color: var(--gold);
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

        .share-char-counter {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          white-space: nowrap;
        }

        .share-char-counter--warn {
          color: #ef4444;
          font-weight: 600;
        }

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
          border: 2px solid var(--border-color);
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
          border: 1px solid var(--card-bg);
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
          border: 2px dashed var(--border-color);
          border-radius: 8px;
          background: var(--surface-raised);
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
          background: var(--gold-dim);
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
