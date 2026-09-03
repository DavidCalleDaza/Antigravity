import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { socialClient, tokensClient, productClient, serviceClient } from '../../../utils/apiClient';
import Helpers from '../../../utils/helpers';
import { generateShareImage } from '../../../utils/generateShareImage';
import { useStore } from '../../../store/useStore';

export function buildShareText(item, mode) {
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

export function useShareModal({
  isOpen,
  onClose,
  initialItem,
  onPublish,
  mode = 'item',
  view,
  setView,
  onItemUpdated,
}) {
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
  }, [isOpen, setView]);

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
      // Reset additional images and populate existing media from item
      const existingExtras = [];
      const primaryItemUrl = item.imageUrl || item.image_url;

      if (item.video_url && item.video_url !== primaryItemUrl) {
        existingExtras.push({
          blob: null,
          previewUrl: Helpers.resolveMediaUrl(item.video_url),
          type: 'video',
          name: item.video_url.split('/').pop() || 'Video',
          uploadedUrl: item.video_url,
        });
      }

      if (item.audio_url && item.audio_url !== primaryItemUrl) {
        existingExtras.push({
          blob: null,
          previewUrl: Helpers.resolveMediaUrl(item.audio_url),
          type: 'audio',
          name: item.audio_url.split('/').pop() || 'Audio',
          uploadedUrl: item.audio_url,
        });
      }

      if (Array.isArray(item.media_urls)) {
        item.media_urls.forEach((url, i) => {
          if (!url) return;
          const fullUrl = Helpers.resolveMediaUrl(url);
          const alreadyAdded = existingExtras.some(
            (e) => e.uploadedUrl === url || e.previewUrl === fullUrl
          );
          if (!alreadyAdded && url !== primaryItemUrl && fullUrl !== primaryItemUrl) {
            const lower = url.toLowerCase();
            const isVid = lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || url === item.video_url;
            const isAud = lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg') || lower.endsWith('.m4a') || lower.endsWith('.aac') || url === item.audio_url;
            existingExtras.push({
              blob: null,
              previewUrl: fullUrl,
              type: isVid ? 'video' : isAud ? 'audio' : 'image',
              name: url.split('/').pop() || `Medio ${i + 1}`,
              uploadedUrl: url,
            });
          }
        });
      }

      setAdditionalImages(existingExtras);
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
    let type = 'image';
    if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';
    setAdditionalImages((prev) => [...prev, { blob, previewUrl, type, name: file.name, uploadedUrl: null }]);
    e.target.value = '';
  };

  const removeAdditionalImage = (index) => {
    setAdditionalImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSwapImage = useCallback((indexToSwap) => {
    if (indexToSwap < 0 || indexToSwap >= additionalImages.length) return;

    const targetImage = additionalImages[indexToSwap];
    if (!targetImage) return;

    const oldPrimaryBlob = imageBlob;
    const oldPrimaryUrl = previewUrl;

    setPreviewUrl(targetImage.previewUrl);
    setImageBlob(targetImage.blob);

    setAdditionalImages((prev) => {
      const updated = [...prev];
      updated[indexToSwap] = {
        blob: oldPrimaryBlob,
        previewUrl: oldPrimaryUrl,
        uploadedUrl: null,
      };
      return updated;
    });
  }, [additionalImages, imageBlob, previewUrl]);

  const hasSelected = selectedAccounts.length > 0;

  // Summaries Calculation
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

  return {
    // State
    item, setItem,
    isWallPost,
    openSection, setOpenSection,
    isExpanded, setIsExpanded,
    isEditingItem, setIsEditingItem,
    editingFields, setEditingFields,
    savingItem,
    itemSaveError,
    activeStep, setActiveStep,
    stepAiOptimizing, setStepAiOptimizing,
    platformFilter, setPlatformFilter,
    selectedAccounts, setSelectedAccounts,
    shareText, setShareText,
    previewUrl, setPreviewUrl,
    imageBlob, setImageBlob,
    loadingImage,
    showInstagramPanel, setShowInstagramPanel,
    publishing,
    accounts,
    aiVideoUrl, setAiVideoUrl,
    enhancedImageUrl, setEnhancedImageUrl,
    isAiGeneratedPost, setIsAiGeneratedPost,
    isImagePreviewOpen, setIsImagePreviewOpen,
    activeAiSection, setActiveAiSection,
    hourlyLimitReached,
    hashtagInput, setHashtagInput,
    additionalImages,
    additionalImageInputRef,
    hasTikTokSelected,
    activeAccounts,
    filteredActiveAccounts,
    isAllSelected,
    hasSelected,

    // Summaries
    productSummary,
    aiSummary,
    socialSummary,

    // Actions
    handleClose,
    handleToggleExpand,
    addHashtag,
    toggleAccount,
    handleCopyText,
    handleDownloadImage,
    handleEnhancedImage,
    handleSaveItemChanges,
    handlePublishClick,
    handleSelectAll,
    addAdditionalImage,
    removeAdditionalImage,
    handleSwapImage,
  };
}
