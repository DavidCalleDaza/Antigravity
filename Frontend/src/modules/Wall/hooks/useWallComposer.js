import { useState, useRef, useEffect } from 'react';
import { apiClient, socialClient } from '../../../utils/apiClient';
import { useWallComposerEntity } from './useWallComposerEntity';

export function useWallComposer({ createPost, setPosts, toast, showConfirm }) {
  const [additionalImages, setAdditionalImages] = useState([]); // [{ blob, previewUrl }]
  const [additionalAudios, setAdditionalAudios] = useState([]); // [{ id, file, name, size, previewUrl }]
  const [additionalVideos, setAdditionalVideos] = useState([]); // [{ id, file, name, size, previewUrl }]
  const [audioError, setAudioError] = useState('');
  const [videoError, setVideoError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef(null);
  const entity = useWallComposerEntity({ toast });
  const [enhanceTarget, setEnhanceTarget] = useState(null); // { kind, item } | null
  const [accounts, setAccounts] = useState([]);
  const [shareOnSave, setShareOnSave] = useState([]);

  useEffect(() => {
    socialClient
      .listAccounts()
      .then((data) => setAccounts((data || []).filter((a) => a.status === 'active')))
      .catch(() => setAccounts([]));
  }, []);

  const openEnhanceModal = (kind, item) => setEnhanceTarget({ kind, item });
  const closeEnhanceModal = () => setEnhanceTarget(null);

  const insertGeneratedText = (text, mode = 'replace') => {
    if (!textareaRef.current) return;
    const current = textareaRef.current.value.trim();
    const next = mode === 'append' && current ? `${current}\n\n${text}` : text;
    textareaRef.current.value = next;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    toast.success('Texto agregado a la publicación.');
  };

  const applyEnhancedItem = (kind, item, enhancedFile) => {
    const previewUrl = URL.createObjectURL(enhancedFile);
    if (kind === 'image') {
      setAdditionalImages((prev) =>
        prev.map((img, idx) => {
          if (idx !== item.newIndex) return img;
          if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
          return { blob: enhancedFile, previewUrl };
        })
      );
    } else if (kind === 'audio') {
      setAdditionalAudios((prev) =>
        prev.map((a) => {
          if (a.id !== item.id) return a;
          if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
          return { ...a, file: enhancedFile, name: enhancedFile.name, size: enhancedFile.size, previewUrl };
        })
      );
    } else if (kind === 'video') {
      setAdditionalVideos((prev) =>
        prev.map((v) => {
          if (v.id !== item.id) return v;
          if (v.previewUrl) URL.revokeObjectURL(v.previewUrl);
          return { ...v, file: enhancedFile, name: enhancedFile.name, size: enhancedFile.size, previewUrl };
        })
      );
    }
    toast.success('Mejora aplicada.');
  };

  // ── Galería de imágenes adicionales ──────────────────────────────────────
  const handleAddAdditionalImage = (file) => {
    const previewUrl = URL.createObjectURL(file);
    setAdditionalImages((prev) => [...prev, { blob: file, previewUrl }]);
  };

  const handleRemoveAdditionalImage = (idx) => {
    setAdditionalImages((prev) => {
      const img = prev[idx];
      if (img?.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  // ── Audio Handler ─────────────────────────────────────────────────────────
  const handleAddAudio = (file) => {
    if (!file) return;
    setAudioError('');

    if (file.size > 5 * 1024 * 1024) {
      setAudioError('El archivo de audio supera el límite de 5MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const newAudio = {
      id: Date.now() + Math.random().toString(),
      file,
      name: file.name,
      size: file.size,
      previewUrl,
    };

    setAdditionalAudios((prev) => [...prev, newAudio]);
  };

  const handleRemoveAudio = (id) => {
    setAdditionalAudios((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  // ── Video Handler ──────────────────────────────────────────────────────────
  const handleAddVideo = (file) => {
    if (!file) return;
    setVideoError('');

    if (file.size > 25 * 1024 * 1024) {
      setVideoError('El archivo de video supera el límite de 25MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const newVideo = {
      id: Date.now() + Math.random().toString(),
      file,
      name: file.name,
      size: file.size,
      previewUrl,
    };

    setAdditionalVideos((prev) => [...prev, newVideo]);
  };

  const handleRemoveVideo = (id) => {
    setAdditionalVideos((prev) => {
      const item = prev.find((v) => v.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((v) => v.id !== id);
    });
  };

  const clearAdditionalMedia = () => {
    additionalImages.forEach((img) => img.previewUrl && URL.revokeObjectURL(img.previewUrl));
    additionalAudios.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    additionalVideos.forEach((v) => v.previewUrl && URL.revokeObjectURL(v.previewUrl));
    setAdditionalImages([]);
    setAdditionalAudios([]);
    setAdditionalVideos([]);
    setAudioError('');
    setVideoError('');
  };

  const uploadFilesToPost = async (postId, items, getFile, failureMessage) => {
    for (const item of items) {
      try {
        const formData = new FormData();
        formData.append('file', getFile(item));
        const media = await apiClient.requestFormData(`/wall/${postId}/media`, formData);
        if (setPosts) {
          setPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, media: [...(p.media || []), media] } : p))
          );
        }
      } catch (err) {
        toast.warning(failureMessage);
      }
    }
  };

  const uploadAdditionalImages = (postId, startIndex = 0) =>
    uploadFilesToPost(postId, additionalImages.slice(startIndex), (img) => img.blob, 'Una imagen adicional no se pudo subir.');

  const handlePublish = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const text = formData.get('text'); // Original code expected 'text'
    const finalContent = (text || '').trim();

    if (!finalContent && additionalImages.length === 0) {
      toast.warning('Escribe algo o adjunta un archivo.');
      return;
    }

    const executePublish = async (finalText) => {
      setIsSubmitting(true);
      try {
        const resolvedEntity = await entity.resolveEntityId();
        const type = resolvedEntity
          ? (resolvedEntity.kind === 'service' ? 'service' : 'donation')
          : 'impact';

        let mainMedia = null;
        if (additionalImages.length > 0) {
          const uploadForm = new FormData();
          uploadForm.append('file', additionalImages[0].blob);
          mainMedia = await apiClient.requestFormData('/wall/upload', uploadForm);
        }

        const payload = {
          content: finalText,
          type,
          media_url: mainMedia?.url,
          media_type: mainMedia?.type,
          product_id: resolvedEntity && resolvedEntity.kind === 'product' ? resolvedEntity.id : null,
          service_id: resolvedEntity && resolvedEntity.kind === 'service' ? resolvedEntity.id : null,
        };
        const post = await createPost(payload);
        if (post?.id) {
          if (additionalImages.length > 1) {
            await uploadAdditionalImages(post.id, 1);
          }
          if (additionalAudios.length > 0) {
            await uploadFilesToPost(post.id, additionalAudios, (a) => a.file, 'Un audio adicional no se pudo subir.');
          }
          if (additionalVideos.length > 0) {
            await uploadFilesToPost(post.id, additionalVideos, (v) => v.file, 'Un video adicional no se pudo subir.');
          }
        }
        form.reset();
        clearAdditionalMedia();
        entity.resetEntity();
        setShareOnSave([]);
        toast.success('Publicación compartida.');
      } catch (err) {
        toast.error('No se pudo publicar.');
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!finalContent && additionalImages.length > 0) {
      showConfirm(
        'Publicar sin descripción',
        '¿Deseas compartir esta imagen sin añadir ningún comentario?',
        (modalText) => executePublish(modalText || ''),
        'Publicar',
        'btn-primary',
        true
      );
    } else {
      executePublish(finalContent);
    }
  };

  return {
    additionalImages,
    additionalAudios,
    additionalVideos,
    audioError,
    videoError,
    isSubmitting,
    textareaRef,
    entity,
    enhanceTarget,
    openEnhanceModal,
    closeEnhanceModal,
    applyEnhancedItem,
    insertGeneratedText,
    accounts,
    shareOnSave,
    setShareOnSave,
    handleAddAdditionalImage,
    handleRemoveAdditionalImage,
    handleAddAudio,
    handleRemoveAudio,
    handleAddVideo,
    handleRemoveVideo,
    handlePublish,
  };
}
