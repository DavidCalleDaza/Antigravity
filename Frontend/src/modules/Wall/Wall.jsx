import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  HeartHandshake, MessageCircle, Sparkles, Image as ImageIcon, 
  FilePlus, Users, Package, Send, MoreVertical, Trash2, Edit2, X, Paperclip, Share2, Loader2,
  TrendingUp, Activity, ArrowRight, Wrench 
} from 'lucide-react';
import Helpers from '../../utils/helpers';
import { useStore } from '../../store/useStore';
import { useToast } from '../../components/ui/Toast';
import { apiClient, productClient, serviceClient, billingClient, aiClient, tokensClient } from '../../utils/apiClient';
import { useWallSockets } from './useWallSockets';
import Modal from '../../components/ui/Modal';
import ShareModal from '../../components/ShareModal';
import AiImageEnhancer from '../../components/AI/AiImageEnhancer';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

export default function Wall() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [tempMedia, setTempMedia] = useState(null); // { url, type }
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const [activePicker, setActivePicker] = useState(null); // null | 'link' | 'customers'
  const [linkQuery, setLinkQuery] = useState('');
  const [linkOptions, setLinkOptions] = useState([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkedItem, setLinkedItem] = useState(null); // { id, kind, name, image_url }
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState([]); // [{ id, business_name, trade_name }]
  const [prevText, setPrevText] = useState('');
  const [improving, setImproving] = useState(false);
  const [aiEnhanceOpen, setAiEnhanceOpen] = useState(false);
  const [aiEnhanceBlob, setAiEnhanceBlob] = useState(null);
  const [hourlyUsage, setHourlyUsage] = useState(null);
  const [sharePost, setSharePost] = useState(null);
  const [editTargetPostId, setEditTargetPostId] = useState(null);
  const editFileInputRef = useRef(null);
  
  // Custom Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmLabel: 'Aceptar',
    confirmClass: 'btn-primary',
    showInput: false,
    inputValue: '',
    canAddComment: false
  });

  const { currentUser } = useStore();
  const toast = useToast();

  const showConfirm = (title, message, onConfirm, confirmLabel = 'Aceptar', confirmClass = 'btn-primary', canAddComment = false) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: (text) => {
        onConfirm(text);
        setConfirmModal(prev => ({ ...prev, isOpen: false, showInput: false, inputValue: '', canAddComment: false }));
      },
      confirmLabel,
      confirmClass,
      showInput: false,
      inputValue: '',
      canAddComment
    });
  };

  const getAvatarUrl = (avatar) => {
    return Helpers.resolveMediaUrl(avatar);
  };

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/wall');
      setPosts(data);
    } catch (err) {
      toast.error('No se pudieron cargar las publicaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNewPost = useCallback((newPost) => {
    setPosts((prev) => {
      if (prev.find(p => p.id === newPost.id)) return prev;
      return [newPost, ...prev];
    });
  }, []);

  const handlePostUpdated = useCallback((updatedPost) => {
    setPosts((prev) => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
  }, []);

  const handlePostDeleted = useCallback(({ id }) => {
    setPosts((prev) => prev.filter(p => p.id !== id));
  }, []);

  const handleNewComment = useCallback((newComment) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === newComment.post_id) {
          const comments = post.comments || [];
          if (comments.find(c => c.id === newComment.id)) return post;
          return { ...post, comments: [...comments, newComment] };
        }
        return post;
      })
    );
  }, []);

  const handleCommentUpdated = useCallback((updatedComment) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === updatedComment.post_id) {
          return {
            ...post,
            comments: post.comments.map(c => c.id === updatedComment.id ? updatedComment : c)
          };
        }
        return post;
      })
    );
  }, []);

  const handleCommentDeleted = useCallback(({ id, post_id }) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === post_id) {
          return {
            ...post,
            comments: post.comments.filter(c => c.id !== id)
          };
        }
        return post;
      })
    );
  }, []);

  useWallSockets({ 
    onNewPost: handleNewPost,
    onPostUpdated: handlePostUpdated,
    onPostDeleted: handlePostDeleted,
    onNewComment: handleNewComment,
    onCommentUpdated: handleCommentUpdated,
    onCommentDeleted: handleCommentDeleted
  });

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    Helpers.initRevealAnimations();
  }, [posts]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiClient.requestFormData('/wall/upload', formData);
      setTempMedia(data);
      toast.success('Archivo listo para publicar.');
    } catch (err) {
      toast.error('No se pudo subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const refreshHourlyUsage = useCallback(async () => {
    try {
      const res = await tokensClient.getHourlyUsage();
      setHourlyUsage(res);
    } catch (err) {
      // offline: dejar los botones de IA habilitados
    }
  }, []);

  useEffect(() => {
    refreshHourlyUsage();
  }, [refreshHourlyUsage]);

  // Debounce 350ms sobre productClient.list() + serviceClient.list()
  useEffect(() => {
    if (activePicker !== 'link') return;
    const timer = setTimeout(async () => {
      try {
        setLinkLoading(true);
        const params = { limit: 20 };
        if (linkQuery.trim()) params.search = linkQuery.trim();
        const [products, services] = await Promise.all([
          productClient.list(params),
          serviceClient.list(params),
        ]);
        const toOption = (item, kind) => ({
          id: item.id,
          kind,
          name: item.name,
          image_url: item.image_url || item.imageUrl,
          price: item.price,
        });
        const merged = [];
        (Array.isArray(products) ? products : []).forEach(p => merged.push(toOption(p, 'product')));
        (Array.isArray(services) ? services : []).forEach(s => merged.push(toOption(s, 'service')));
        setLinkOptions(merged);
      } catch (err) {
        setLinkOptions([]);
      } finally {
        setLinkLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [activePicker, linkQuery]);

  // Debounce 350ms sobre billingClient.listMentionableCustomers()
  useEffect(() => {
    if (activePicker !== 'customers') return;
    const timer = setTimeout(async () => {
      try {
        setCustomerLoading(true);
        const res = await billingClient.listMentionableCustomers(customerQuery.trim() || undefined);
        const list = Array.isArray(res) ? res : (res && (res.items || res.customers)) || [];
        setCustomerOptions(list.filter(c => !selectedCustomers.some(sel => sel.id === c.id)));
      } catch (err) {
        setCustomerOptions([]);
      } finally {
        setCustomerLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [activePicker, customerQuery, selectedCustomers]);

  const handleImproveCopy = async () => {
    const text = textareaRef.current?.value?.trim();
    if (!text) {
      toast.warning('Escribe algo para mejorar.');
      return;
    }
    try {
      setImproving(true);
      setPrevText(text);
      const res = await aiClient.improvePostCopy({ content: text });
      const improved = (res && (res.text || res.improved_content)) || '';
      if (!improved) throw new Error('Sin respuesta del modelo');
      if (textareaRef.current) {
        textareaRef.current.value = improved;
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      }
      toast.success('Texto mejorado con IA.');
      refreshHourlyUsage();
    } catch (err) {
      toast.error('No se pudo mejorar el texto.');
    } finally {
      setImproving(false);
    }
  };

  const handleUndoImprove = () => {
    if (!prevText || !textareaRef.current) return;
    textareaRef.current.value = prevText;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    setPrevText('');
  };

  const resolveTempMediaBlob = useCallback(async () => {
    try {
      const res = await fetch(Helpers.resolveMediaUrl(tempMedia.url));
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();
      setAiEnhanceBlob(blob);
    } catch (err) {
      setAiEnhanceBlob(null);
    }
  }, [tempMedia]);

  useEffect(() => {
    if (aiEnhanceOpen) resolveTempMediaBlob();
  }, [aiEnhanceOpen, resolveTempMediaBlob]);

  const handleEnhancedImage = async (blob, mimeType) => {
    try {
      const formData = new FormData();
      const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
      formData.append('file', blob, `enhanced_${Date.now()}.${ext}`);
      const data = await apiClient.requestFormData('/wall/upload', formData);
      if (data && data.url) {
        setTempMedia(data);
        toast.success('Imagen mejorada aplicada.');
      }
    } catch (err) {
      toast.error('No se pudo aplicar la imagen mejorada.');
    }
  };

  const handleEditMediaUpload = async (e) => {
    const file = e.target.files[0];
    const postId = editTargetPostId;
    e.target.value = '';
    if (!file || !postId) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const media = await apiClient.requestFormData(`/wall/${postId}/media`, formData);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, media: [...(p.media || []), media] } : p));
      toast.success('Imagen agregada.');
    } catch (err) {
      toast.error('No se pudo agregar la imagen.');
    } finally {
      setEditTargetPostId(null);
    }
  };

  const handleDeleteMedia = async (postId, media) => {
    try {
      await apiClient.delete(`/wall/${postId}/media/${media.id}`);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, media: (p.media || []).filter(m => m.id !== media.id) } : p));
      toast.success('Imagen eliminada.');
    } catch (err) {
      toast.error('No se pudo eliminar la imagen.');
    }
  };

  const renderMentionBadge = (post) => {
    const mentions = post.customer_mentions || [];
    if (mentions.length === 0) return null;
    const confirmed = mentions.filter(m => m.status === 'confirmed');
    if (confirmed.length > 0) {
      const names = confirmed.map(m => m.business_name || m.trade_name || 'Cliente').join(', ');
      return (
        <span className="wall-mention-badge wall-mention-badge--confirmed">
          <Users width="10" height="10" />
          {names}
        </span>
      );
    }
    if (mentions.some(m => m.status === 'pending')) {
      return (
        <span className="wall-mention-badge wall-mention-badge--pending">
          <Users width="10" height="10" />
          Cliente mencionado — pendiente de confirmación
        </span>
      );
    }
    return null;
  };

  const handlePublish = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const text = formData.get('text').trim();
    const type = formData.get('type');

    if (!text && !tempMedia) {
      toast.warning('Escribe algo o adjunta un archivo.');
      return;
    }

    const executePublish = async (finalText) => {
      try {
        const payload = { 
          content: finalText, 
          type,
          media_url: tempMedia?.url,
          media_type: tempMedia?.type,
          product_id: linkedItem?.kind === 'product' ? linkedItem.id : null,
          service_id: linkedItem?.kind === 'service' ? linkedItem.id : null,
          customer_ids: selectedCustomers.map(c => c.id)
        };
        const newPost = await apiClient.post('/wall', payload);
        setPosts(prev => [newPost, ...prev]);
        form.reset();
        setTempMedia(null);
        setLinkedItem(null);
        setSelectedCustomers([]);
        setPrevText('');
        setAiEnhanceOpen(false);
        setLinkQuery('');
        setCustomerQuery('');
        toast.success('Publicación compartida.');
      } catch (err) {
        toast.error('No se pudo publicar.');
      }
    };

    if (!text && tempMedia) {
      showConfirm(
        'Publicar sin descripción',
        '¿Deseas compartir esta imagen sin añadir ningún comentario?',
        (modalText) => executePublish(modalText || ''),
        'Publicar',
        'btn-primary',
        true // Enable "Add comment" option
      );
    } else {
      executePublish(text);
    }
  };

  const handleUpdatePost = async (postId, text) => {
    try {
      const updated = await apiClient.patch(`/wall/${postId}`, { content: text });
      setPosts(prev => prev.map(p => p.id === postId ? updated : p));
      setEditingPostId(null);
      toast.success('Publicación actualizada.');
    } catch (err) {
      toast.error('No se pudo actualizar.');
    }
  };

  const handleDeletePost = (postId) => {
    showConfirm(
      'Eliminar publicación',
      '¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.',
      async () => {
        try {
          await apiClient.delete(`/wall/${postId}`);
          setPosts(prev => prev.filter(p => p.id !== postId));
          toast.success('Publicación eliminada.');
        } catch (err) {
          toast.error('No se pudo eliminar.');
        }
      },
      'Eliminar',
      'btn-danger'
    );
  };

  const handleComment = async (postId, text) => {
    if (!text.trim()) return;
    try {
      const newComment = await apiClient.post(`/wall/${postId}/comments`, { content: text });
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, comments: [...(p.comments || []), newComment] };
        }
        return p;
      }));
    } catch (err) {
      toast.error('No se pudo comentar.');
    }
  };

  const handleUpdateComment = async (postId, commentId, text) => {
    try {
      const updated = await apiClient.patch(`/wall/${postId}/comments/${commentId}`, { content: text });
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, comments: p.comments.map(c => c.id === commentId ? updated : c) };
        }
        return p;
      }));
      setEditingCommentId(null);
    } catch (err) {
      toast.error('No se pudo editar.');
    }
  };

  const handleDeleteComment = (postId, commentId) => {
    showConfirm(
      'Eliminar comentario',
      '¿Estás seguro de que deseas eliminar este comentario?',
      async () => {
        try {
          await apiClient.delete(`/wall/${postId}/comments/${commentId}`);
          setPosts(prev => prev.map(p => {
            if (p.id === postId) {
              return { ...p, comments: p.comments.filter(c => c.id !== commentId) };
            }
            return p;
          }));
          toast.success('Comentario eliminado.');
        } catch (err) {
          toast.error('No se pudo eliminar.');
        }
      },
      'Eliminar',
      'btn-danger'
    );
  };

  const renderAvatarContent = (author) => {
    if (!author) return null;
    
    // Support both AuthorBrief object and currentUser object (which might have 'avatar' or 'avatar_url')
    const urlRaw = author.avatar_url || author.avatar;
    const avatarUrl = urlRaw ? getAvatarUrl(urlRaw) : null;
    const name = author.full_name || author.name || (typeof author === 'string' ? author : '?');

    if (avatarUrl) {
      return (
        <>
          <img
            src={avatarUrl}
            alt={name}
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
            onLoad={(e) => {
              e.target.style.display = 'block';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'none';
            }}
            style={{ display: 'none' }}
          />
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: 'inherit' }}>
            {Helpers.getInitials(name)}
          </span>
        </>
      );
    }
    return Helpers.getInitials(name);
  };

  const weekActivity = useMemo(() => {
    const days = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push(d.toLocaleDateString('es-ES', { weekday: 'short' }));
      counts.push(posts.filter(p => p.created_at && p.created_at.slice(0, 10) === key).length);
    }
    return { days, counts };
  }, [posts]);

  const postsThisWeek = useMemo(() => weekActivity.counts.reduce((acc, n) => acc + n, 0), [weekActivity]);

  const recentActivity = useMemo(() => posts.slice(0, 5), [posts]);

  const sidebarKpis = useMemo(() => [
    { label: 'Publicaciones esta semana', value: postsThisWeek, icon: Sparkles },
    { label: 'Familias alcanzadas', value: '340', icon: HeartHandshake },
    { label: 'Productos donados', value: '2,150', icon: Package },
    { label: 'Negocios que dan', value: '127', icon: Users }
  ], [postsThisWeek]);

  const weekChartData = useMemo(() => ({
    labels: weekActivity.days,
    datasets: [{
      label: 'Publicaciones',
      data: weekActivity.counts,
      borderColor: '#3EB489',
      backgroundColor: 'rgba(62, 180, 137, 0.12)',
      borderWidth: 2,
      pointBackgroundColor: '#3EB489',
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.4,
      fill: 'origin'
    }]
  }), [weekActivity]);

  const weekChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'var(--card-bg)',
        titleColor: 'var(--text-primary)',
        bodyColor: 'var(--text-secondary)',
        borderColor: 'var(--border-color)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'var(--border-color)', lineWidth: 0.5 },
        border: { display: false },
        ticks: { color: 'var(--text-tertiary)', font: { size: 11 } }
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: 'var(--text-tertiary)', font: { size: 11 } }
      }
    }
  }), []);

  const typeIcons = { donation: HeartHandshake, testimony: MessageCircle, impact: Sparkles, service: Wrench };
  const typeLabels = { donation: 'Donación', testimony: 'Testimonio', impact: 'Impacto', service: 'Servicio' };

  return (
    <div className="page-content">
      <div className="wall-layout">
        <div className="wall-main">
          <div className="wall-header reveal">
            <div className="wall-quote">
              <span className="wall-quote-mark">“</span>
              No buscamos aplausos. No buscamos vitrinas. DonApp existe porque servir es el único negocio donde todos ganan — incluso quienes nadie ve.
            </div>
            <div className="wall-subtitle">Evidencia de impacto real</div>
          </div>

      {/* Post Composer */}
      <div className="post-composer reveal">
        <div className="avatar">
          {renderAvatarContent(currentUser)}
        </div>
        <form className="post-composer-input" onSubmit={handlePublish}>
          <textarea 
            ref={textareaRef}
            name="text" 
            placeholder="¿Qué historia de impacto quieres contar hoy?"
            rows="1"
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          ></textarea>

          {linkedItem && (
            <div className="wall-linked-card">
              <div className="wall-linked-card-media">
                {linkedItem.image_url ? (
                  <img src={Helpers.resolveMediaUrl(linkedItem.image_url)} alt="" />
                ) : (
                  <Package size="18" />
                )}
              </div>
              <div className="wall-linked-card-info">
                <span className="wall-linked-card-kind">{linkedItem.kind === 'product' ? 'Producto' : 'Servicio'}</span>
                <span className="wall-linked-card-name">{linkedItem.name}</span>
              </div>
              <button type="button" className="btn-icon-only text-tertiary hover:text-danger" onClick={() => setLinkedItem(null)} title="Quitar vínculo">
                <X size="14" />
              </button>
            </div>
          )}

          {selectedCustomers.length > 0 && (
            <div className="wall-mention-chips">
              {selectedCustomers.map(cust => (
                <span key={cust.id} className="wall-mention-chip">
                  <Users width="12" height="12" />
                  {cust.business_name || cust.trade_name || 'Cliente'}
                  <button type="button" onClick={() => setSelectedCustomers(prev => prev.filter(c => c.id !== cust.id))} title="Quitar mención">
                    <X size="12" />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {tempMedia && (
            <div className="wall-post-media">
              {tempMedia.type.startsWith('image/') ? (
                <img src={Helpers.resolveMediaUrl(tempMedia.url)} alt="Preview" />
              ) : tempMedia.type.startsWith('video/') ? (
                <video src={Helpers.resolveMediaUrl(tempMedia.url)} controls style={{ width: '100%', maxHeight: '500px' }} />
              ) : (
                <div style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface)' }}>
                  <Paperclip size={20} className="text-primary" />
                  <span className="text-sm">Documento adjunto</span>
                </div>
              )}
              <button 
                type="button" 
                onClick={() => { setTempMedia(null); setAiEnhanceOpen(false); }}
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {tempMedia && tempMedia.type.startsWith('image/') && !aiEnhanceOpen && (
            <div className="post-composer-ai-row">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setAiEnhanceOpen(true)}>
                <Sparkles width="14" height="14" className="text-primary" />
                Mejorar imagen con IA
              </button>
            </div>
          )}

          {aiEnhanceOpen && (
            <div className="wall-ai-enhance-panel" onClick={(e) => e.stopPropagation()}>
              <AiImageEnhancer
                imageBlob={aiEnhanceBlob}
                onEnhanced={async (blob, mimeType) => {
                  await handleEnhancedImage(blob, mimeType);
                  setAiEnhanceOpen(false);
                }}
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAiEnhanceOpen(false)}>
                Cancelar
              </button>
            </div>
          )}

          <div className="post-composer-actions">
            <div className="post-composer-tools">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" style={{ display: 'none' }} />
              <button type="button" className="post-composer-tool" title="Adjuntar imagen o archivo" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <ImageIcon width="20" height="20" />
              </button>
              <button
                type="button"
                className={`post-composer-tool ${activePicker === 'link' ? 'post-composer-tool--active' : ''}`}
                title="Vincular producto o servicio"
                onClick={() => setActivePicker(activePicker === 'link' ? null : 'link')}
              >
                <Package width="20" height="20" />
              </button>
              <button
                type="button"
                className={`post-composer-tool ${activePicker === 'customers' ? 'post-composer-tool--active' : ''}`}
                title="Mencionar clientes"
                onClick={() => setActivePicker(activePicker === 'customers' ? null : 'customers')}
              >
                <Users width="20" height="20" />
              </button>
              <button
                type="button"
                className="post-composer-tool"
                title={hourlyUsage && hourlyUsage.used_usd >= hourlyUsage.limit_usd ? 'Límite horario de IA alcanzado' : 'Mejorar texto con IA'}
                onClick={handleImproveCopy}
                disabled={improving || Boolean(hourlyUsage && hourlyUsage.used_usd >= hourlyUsage.limit_usd)}
              >
                {improving ? <Loader2 width="20" height="20" className="animate-spin" /> : <Sparkles width="20" height="20" />}
              </button>
              {prevText && (
                <button type="button" className="post-composer-tool" title="Deshacer mejora de texto" onClick={handleUndoImprove}>
                  <X width="20" height="20" />
                </button>
              )}
              <select name="type" className="form-select" style={{ width: 'auto', padding: '4px 12px', fontSize: '12px', borderRadius: '20px', border: 'none', background: 'var(--primary-50)', color: 'var(--primary)' }} title="Categoría de la publicación">
                <option value="impact" title="Una historia o momento de impacto social">✨ Impacto</option>
                <option value="donation" title="Una donación realizada o recibida">🤝 Donación</option>
                <option value="testimony" title="El testimonio de alguien beneficiado">💬 Testimonio</option>
                <option value="service" title="Un servicio prestado o disponible">🛠️ Servicio</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={uploading}>
              {uploading ? 'Subiendo...' : 'Publicar'}
            </button>
          </div>

          {activePicker === 'link' && (
            <div className="wall-picker-panel">
              <div className="wall-picker-toolbar">
                <span className="wall-picker-title"><Package width="14" height="14" /> Vincular producto o servicio</span>
                <input
                  className="form-input wall-picker-search"
                  placeholder="Buscar..."
                  value={linkQuery}
                  onChange={(e) => setLinkQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="wall-picker-list">
                {linkLoading ? (
                  <div className="wall-picker-empty">Buscando...</div>
                ) : linkOptions.length === 0 ? (
                  <div className="wall-picker-empty">Sin resultados</div>
                ) : (
                  linkOptions.map(opt => (
                    <button
                      key={`${opt.kind}-${opt.id}`}
                      type="button"
                      className="wall-picker-item"
                      onClick={() => {
                        setLinkedItem(opt);
                        setActivePicker(null);
                        setLinkQuery('');
                      }}
                    >
                      <div className="wall-picker-item-media">
                        {opt.image_url ? <img src={Helpers.resolveMediaUrl(opt.image_url)} alt="" /> : <Package width="16" height="16" />}
                      </div>
                      <div className="wall-picker-item-info">
                        <span className="wall-picker-item-kind">{opt.kind === 'product' ? 'Producto' : 'Servicio'}</span>
                        <span className="wall-picker-item-name">{opt.name}</span>
                        {opt.price != null && (
                          <span className="wall-picker-item-price">${Number(opt.price).toLocaleString('es-CO')}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {activePicker === 'customers' && (
            <div className="wall-picker-panel">
              <div className="wall-picker-toolbar">
                <span className="wall-picker-title"><Users width="14" height="14" /> Mencionar clientes</span>
                <input
                  className="form-input wall-picker-search"
                  placeholder="Buscar por nombre..."
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="wall-picker-list">
                {customerLoading ? (
                  <div className="wall-picker-empty">Buscando...</div>
                ) : customerOptions.length === 0 ? (
                  <div className="wall-picker-empty">Sin clientes para mencionar</div>
                ) : (
                  customerOptions.map(cust => (
                    <button
                      key={cust.id}
                      type="button"
                      className="wall-picker-item"
                      onClick={() => {
                        setSelectedCustomers(prev => prev.some(c => c.id === cust.id) ? prev : [...prev, cust]);
                        setCustomerQuery('');
                      }}
                    >
                      <div className="wall-picker-item-media"><Users width="16" height="16" /></div>
                      <div className="wall-picker-item-info">
                        <span className="wall-picker-item-name">{cust.business_name || cust.trade_name || 'Cliente'}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <p className="wall-picker-hint">
                El cliente recibirá un enlace para confirmar la mención antes de que su negocio aparezca.
              </p>
            </div>
          )}

          <p className="text-xs text-tertiary mt-2">
            Publica evidencia solo si cuentas con el consentimiento de las personas que aparecen en ella.
          </p>
        </form>
      </div>

      <p className="text-sm text-tertiary mt-2 mb-4">
        Aquí no hay vueltos.
      </p>

      {/* Feed */}
      <div className="wall-feed">
        {loading && posts.length === 0 ? (
          <div className="text-center p-12 text-tertiary">
            <div className="animate-pulse">Cargando historias...</div>
          </div>
        ) : !loading && posts.length === 0 ? (
          <div className="text-center p-12 text-tertiary">
            Nadie pidió nacer donde nació.
          </div>
        ) : (
          posts.map((post) => {
            const Icon = typeIcons[post.type] || Sparkles;
            const isAuthor = currentUser?.id === post.author_id || currentUser?.role === 'admin';

            return (
              <div className="wall-post reveal" key={post.id}>
                <div className="wall-post-header">
                  <div className="avatar">
                    {renderAvatarContent(post.author)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="wall-post-author">{post.author?.full_name || post.author || '?'}</span>
                      <span className={`wall-post-type ${post.type}`}>
                        <Icon width="10" height="10" />
                        {typeLabels[post.type] || post.type}
                      </span>
                      {renderMentionBadge(post)}
                    </div>
                    <div className="wall-post-meta">
                      {Helpers.formatDate(post.created_at, 'relative')}
                      {post.is_edited && <span> • editado</span>}
                    </div>
                  </div>
                  {isAuthor && editingPostId !== post.id && (
                    <div className="flex gap-2">
                      <button onClick={() => setEditingPostId(post.id)} className="btn-icon-only text-tertiary hover:text-primary">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDeletePost(post.id)} className="btn-icon-only text-tertiary hover:text-danger">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="wall-post-body">
                  {editingPostId === post.id ? (
                    <div className="flex flex-col gap-3">
                      <textarea 
                        defaultValue={post.content} 
                        id={`edit-post-${post.id}`}
                        className="form-textarea"
                        style={{ minHeight: '100px' }}
                      />
                      {(post.media && post.media.length > 0) && (
                        <div className="wall-post-media-grid">
                          {post.media.map(m => (
                            <div key={m.id} className="wall-post-media-thumb">
                              {m.media_type?.startsWith('image/') ? (
                                <img src={Helpers.resolveMediaUrl(m.media_url)} alt="" />
                              ) : m.media_type?.startsWith('video/') ? (
                                <video src={Helpers.resolveMediaUrl(m.media_url)} muted />
                              ) : (
                                <Paperclip size="18" />
                              )}
                              <button
                                type="button"
                                className="wall-post-media-remove"
                                onClick={() => handleDeleteMedia(post.id, m)}
                                title="Eliminar imagen"
                              >
                                <X size="12" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input type="file" ref={editFileInputRef} onChange={handleEditMediaUpload} accept="image/*,video/*" style={{ display: 'none' }} />
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setEditTargetPostId(post.id);
                            editFileInputRef.current?.click();
                          }}
                        >
                          <ImageIcon width="14" height="14" />
                          Agregar imagen
                        </button>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingPostId(null)} className="btn btn-ghost btn-sm">Cancelar</button>
                        <button 
                          onClick={() => handleUpdatePost(post.id, document.getElementById(`edit-post-${post.id}`).value)} 
                          className="btn btn-primary btn-sm"
                        >Guardar Cambios</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="wall-post-text">{post.content}</p>
                      {post.linked_item && (
                        <Link
                          to={post.linked_item.kind === 'product' ? '/products' : '/services'}
                          className="wall-linked-card wall-linked-card--link"
                        >
                          <div className="wall-linked-card-media">
                            {post.linked_item.image_url ? (
                              <img src={Helpers.resolveMediaUrl(post.linked_item.image_url)} alt="" />
                            ) : (
                              <Package size="18" />
                            )}
                          </div>
                          <div className="wall-linked-card-info">
                            <span className="wall-linked-card-kind">
                              {post.linked_item.kind === 'product' ? 'Producto' : 'Servicio'}
                            </span>
                            <span className="wall-linked-card-name">{post.linked_item.name}</span>
                            {post.linked_item.price != null && (
                              <span className="wall-picker-item-price">${Number(post.linked_item.price).toLocaleString('es-CO')}</span>
                            )}
                          </div>
                          <span className="wall-linked-card-arrow">Ver →</span>
                        </Link>
                      )}
                      {post.media && post.media.length > 0 ? (
                        <div className="wall-post-media-grid">
                          {post.media.map(m =>
                            m.media_type?.startsWith('image/') ? (
                              <img key={m.id} src={Helpers.resolveMediaUrl(m.media_url)} alt="Media" />
                            ) : m.media_type?.startsWith('video/') ? (
                              <video key={m.id} src={Helpers.resolveMediaUrl(m.media_url)} controls />
                            ) : (
                              <a key={m.id} href={Helpers.resolveMediaUrl(m.media_url)} target="_blank" rel="noreferrer" className="wall-post-media-attach">
                                <Paperclip size="20" />
                                <span className="text-sm font-medium">Ver documento adjunto</span>
                              </a>
                            )
                          )}
                        </div>
                      ) : post.media_url ? (
                        <div className="wall-post-media">
                          {post.media_type?.startsWith('image/') ? (
                            <img src={Helpers.resolveMediaUrl(post.media_url)} alt="Impact" />
                          ) : post.media_type?.startsWith('video/') ? (
                            <video src={Helpers.resolveMediaUrl(post.media_url)} controls style={{ width: '100%', maxHeight: '500px' }} />
                          ) : (
                            <a href={Helpers.resolveMediaUrl(post.media_url)} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-surface rounded-xl text-primary no-underline border border-dashed border-primary/20">
                              <Paperclip size={20} />
                              <span className="text-sm font-medium">Ver documento adjunto</span>
                            </a>
                          )}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="wall-post-actions">
                  <button type="button" className="wall-share-btn" onClick={() => setSharePost(post)}>
                    <Share2 width="14" height="14" />
                    Compartir en redes →
                  </button>
                </div>

                {/* Comments Section */}
                <div className="wall-post-comments">
                  {post.comments?.map((comment) => {
                    const isCommentAuthor = currentUser?.id === comment.author_id || currentUser?.role === 'admin';
                    return (
                      <div key={comment.id} className="comment-item">
                        <div className="avatar" style={{ width: '32px', height: '32px' }}>
                          {renderAvatarContent(comment.author)}
                        </div>
                        <div className="comment-bubble">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-primary">{comment.author?.full_name || '?'}</span>
                            {isCommentAuthor && (
                              <div className="flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingCommentId(comment.id)} className="text-tertiary hover:text-primary">
                                  <Edit2 size={10} />
                                </button>
                                <button onClick={() => handleDeleteComment(post.id, comment.id)} className="text-tertiary hover:text-danger">
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            )}
                          </div>
                          {editingCommentId === comment.id ? (
                            <input 
                              defaultValue={comment.content} 
                              id={`edit-comment-${comment.id}`}
                              className="comment-input w-full"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateComment(post.id, comment.id, e.target.value);
                                if (e.key === 'Escape') setEditingCommentId(null);
                              }}
                            />
                          ) : (
                            <p className="text-sm text-secondary">
                              {comment.content}
                              {comment.is_edited && <span className="text-[10px] italic opacity-50 ml-2">(editado)</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Comment Input */}
                  <div className="comment-input-wrapper">
                    <div className="avatar" style={{ width: '28px', height: '28px' }}>
                      {renderAvatarContent(currentUser)}
                    </div>
                    <input
                      type="text"
                      placeholder="Escribe un comentario..."
                      className="comment-input"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          handleComment(post.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
        </div>

        <aside className="wall-sidebar">
          <div className="wall-sidebar-kpis reveal">
            {sidebarKpis.map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div className="wall-kpi-card" key={i}>
                  <div className="wall-kpi-top">
                    <span className="wall-kpi-label">{kpi.label}</span>
                  </div>
                  <div className="wall-kpi-value">{kpi.value}</div>
                  <div className="wall-kpi-icon-wrapper">
                    <Icon size={18} strokeWidth={1.5} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="wall-chart-card reveal">
            <div className="wall-chart-header">
              <div>
                <h2 className="wall-chart-title">Actividad del Muro</h2>
                <span className="wall-chart-period">Últimos 7 días</span>
              </div>
            </div>
            <div className="wall-chart-wrapper">
              <Line data={weekChartData} options={weekChartOptions} />
            </div>
          </div>

          <div className="wall-activity-section reveal">
            <div className="wall-section-header">
              <h2 className="wall-section-title">Actividad Reciente</h2>
            </div>
            <div className="wall-activity-list">
              {recentActivity.length === 0 ? (
                <p className="text-xs text-tertiary">Aún no hay publicaciones.</p>
              ) : recentActivity.map(post => (
                <div className="wall-activity-item" key={post.id}>
                  <div className={`wall-activity-dot ${post.type === 'donation' ? 'donation' : post.type === 'testimony' ? 'appointment' : post.type === 'service' ? 'service' : 'invoice'}`}></div>
                  <div className="wall-activity-content">
                    <span className="wall-activity-text">
                      {(post.author?.full_name || post.author || 'Alguien')} · {typeLabels[post.type] || post.type}
                    </span>
                    <span className="wall-activity-time">{Helpers.formatDate(post.created_at, 'relative')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="wall-quick-section reveal">
            <h2 className="wall-section-title" style={{ marginBottom: 'var(--space-3)' }}>Accesos Rápidos</h2>
            <div className="wall-quick-grid">
              <Link to="/profile" className="wall-quick-card">
                <span className="wall-quick-name">Mi Perfil</span>
                <ArrowRight size={14} />
              </Link>
              <Link to="/products" className="wall-quick-card">
                <span className="wall-quick-name">Productos</span>
                <ArrowRight size={14} />
              </Link>
              <Link to="/services" className="wall-quick-card">
                <span className="wall-quick-name">Servicios</span>
                <ArrowRight size={14} />
              </Link>
              <Link to="/agenda" className="wall-quick-card">
                <span className="wall-quick-name">Agenda</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Global Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false, showInput: false, inputValue: '', canAddComment: false }))}
        title={confirmModal.title}
        actions={[
          { label: 'Cancelar', onClick: () => setConfirmModal(prev => ({ ...prev, isOpen: false, showInput: false, inputValue: '', canAddComment: false })), className: 'btn-ghost' },
          { label: confirmModal.confirmLabel, onClick: () => confirmModal.onConfirm(confirmModal.inputValue), className: confirmModal.confirmClass }
        ]}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-secondary leading-relaxed">
            {confirmModal.message}
          </p>
          
          {confirmModal.canAddComment && !confirmModal.showInput && (
            <button 
              onClick={() => setConfirmModal(prev => ({ ...prev, showInput: true }))}
              className="btn btn-ghost btn-sm text-primary p-0 h-auto self-start hover:bg-transparent"
            >
              <MessageCircle size={14} className="mr-2" />
              Agregar un comentario personal
            </button>
          )}

          {confirmModal.showInput && (
            <textarea
              value={confirmModal.inputValue}
              onChange={(e) => setConfirmModal(prev => ({ ...prev, inputValue: e.target.value }))}
              placeholder="Escribe tu mensaje aquí..."
              className="form-textarea"
              autoFocus
              style={{ minHeight: '100px' }}
            />
          )}
        </div>
      </Modal>

      <ShareModal
        isOpen={Boolean(sharePost)}
        onClose={() => setSharePost(null)}
        mode="wallPost"
        item={sharePost ? {
          id: sharePost.id,
          description: sharePost.content,
          imageUrl: (sharePost.media && sharePost.media.length > 0 ? sharePost.media[0].media_url : null) || sharePost.media_url,
          linkedItem: sharePost.linked_item ? { id: sharePost.linked_item.id, kind: sharePost.linked_item.kind } : null
        } : null}
      />
    </div>
  );
}

