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

  const isAudioMedia = (m) => {
    if (!m) return false;
    if (m.type === 'audio') return true;
    const path = (m.name || m.uploadedUrl || m.previewUrl || '').toLowerCase().split('?')[0];
    return path.endsWith('.mp3') || path.endsWith('.wav') || path.endsWith('.ogg') || path.endsWith('.m4a') || path.endsWith('.aac') || path.endsWith('.flac') || path.endsWith('.wma') || path.endsWith('.opus');
  };

  const isVideoMedia = (m) => {
    if (!m) return false;
    if (m.type === 'video') return true;
    const path = (m.name || m.uploadedUrl || m.previewUrl || '').toLowerCase().split('?')[0];
    return path.endsWith('.mp4') || path.endsWith('.webm') || path.endsWith('.mov') || path.endsWith('.avi') || path.endsWith('.m4v') || path.endsWith('.mkv');
  };

  const primaryMediaUrl = aiVideoUrl || enhancedImageUrl || item?.imageUrl || item?.image_url || '';
  const isPrimaryVideo = Boolean(aiVideoUrl || (item?.video_url && item.video_url === primaryMediaUrl) || isVideoMedia({ previewUrl: primaryMediaUrl }));
  const isPrimaryAudio = isAudioMedia({ previewUrl: primaryMediaUrl });

  const audioCount = additionalImages.filter(isAudioMedia).length + (isPrimaryAudio ? 1 : 0);
  const videoCount = (isPrimaryVideo ? 1 : 0) + additionalImages.filter(isVideoMedia).length;
  const imageCount = (!isPrimaryVideo && !isPrimaryAudio && primaryMediaUrl ? 1 : 0) + additionalImages.filter((m) => !isAudioMedia(m) && !isVideoMedia(m)).length;

  const postsPerAccount = (imageCount > 0 ? 1 : 0) + videoCount;
  const totalBatchPosts = postsPerAccount * selectedAccounts.length;

  const handlePublishClick = async () => {
    if (selectedAccounts.length === 0) {
      alert('Por favor selecciona al menos una red social para publicar.');
      return;
    }

    setPublishing(true);
    const linked = item?.linkedItem;
    const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';
    const token = useStore.getState().currentUser?.token;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      // 1. Upload any new blobs for additional media in parallel
      const resolvedMediaUrls = await Promise.all(
        additionalImages.map(async (m) => {
          if (isAudioMedia(m)) return null; // Ignore audios for social publishing
          if (m.uploadedUrl) return { url: m.uploadedUrl, isVideo: isVideoMedia(m) };
          if (m.blob instanceof Blob || m.blob instanceof File) {
            const formData = new FormData();
            formData.append('file', m.blob, m.name || `media_${Date.now()}`);
            const res = await fetch(`${API_BASE_URL}/uploads/media`, {
              method: 'POST',
              headers,
              body: formData,
            });
            const data = await res.json();
            return { url: data.url || null, isVideo: isVideoMedia(m) };
          }
          if (m.previewUrl && !m.previewUrl.startsWith('blob:')) {
            return { url: m.previewUrl, isVideo: isVideoMedia(m) };
          }
          return null;
        })
      );

      const validExtras = resolvedMediaUrls.filter((x) => x && x.url);

      const images = [];
      const videos = [];

      // Primary item
      if (!isPrimaryAudio && primaryMediaUrl) {
        if (isPrimaryVideo) {
          videos.push(primaryMediaUrl);
        } else {
          images.push(primaryMediaUrl);
        }
      }

      // Additional items
      validExtras.forEach((m) => {
        if (m.isVideo) {
          videos.push(m.url);
        } else {
          images.push(m.url);
        }
      });

      if (images.length === 0 && videos.length === 0) {
        throw new Error('No hay imágenes ni videos para publicar (los archivos de audio se ignoran para redes sociales).');
      }

      const batchPayload = {
        account_ids: selectedAccounts,
        caption: shareText,
        images: images.length > 0 ? images : undefined,
        videos: videos.length > 0 ? videos : undefined,
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
      };

      const res = await socialClient.publishBatch(batchPayload);

      if (onPublish) {
        onPublish({ selectedAccounts, text: shareText, item, batchResult: res });
      }
      if (isExpanded) {
        setActiveStep('publicado');
        setOpenSection('social');
      } else {
        handleClose();
      }
    } catch (err) {
      console.error('Error in batch publishing:', err);
      alert(`Error al publicar en redes sociales: ${err.detail || err.message || 'Error desconocido'}`);
    } finally {
      setPublishing(false);
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newItems = files.map((file) => {
      let type = 'image';
      if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';
      return {
        blob: file,
        previewUrl: URL.createObjectURL(file),
        type,
        name: file.name,
        uploadedUrl: null,
      };
    });
    setAdditionalImages((prev) => [...prev, ...newItems]);
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

    // Summaries & Batch Stats
    productSummary,
    aiSummary,
    socialSummary,
    audioCount,
    videoCount,
    imageCount,
    postsPerAccount,
    totalBatchPosts,

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
