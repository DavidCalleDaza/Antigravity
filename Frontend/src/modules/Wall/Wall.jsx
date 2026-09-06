import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  HeartHandshake, MessageCircle, Sparkles, 
  Users, Package, Wrench, ArrowRight, Trash2, ShieldAlert
} from 'lucide-react';
import Helpers from '../../utils/helpers';
import { useStore } from '../../store/useStore';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import Drawer from '../../components/ui/Drawer';
import Avatar from '../../components/common/Avatar';

import WallComposer from './components/WallComposer';
import WallFeed from './components/WallFeed';
import WallSidebar from './components/WallSidebar';
import WallMediaEnhancePanel from './components/WallMediaEnhancePanel';
import { useWallPosts } from './hooks/useWallPosts';
import { useWallComposer } from './hooks/useWallComposer';

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
import ErrorBoundary from '../../components/common/ErrorBoundary';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

function WallContent() {
  const { currentUser } = useStore();
  const toast = useToast();

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

  const {
    posts,
    setPosts,
    loading,
    fetchPosts,
    editingPostId,
    setEditingPostId,
    editTargetPostId,
    setEditTargetPostId,
    editingCommentId,
    setEditingCommentId,
    handleUpdatePost,
    handleDeletePost,
    handleDeleteAllPosts,
    handleEditMediaUpload,
    handleDeleteMedia,
    handleComment,
    handleUpdateComment,
    handleDeleteComment,
    createPost
  } = useWallPosts({
    toast,
    showConfirm
  });

  const composerProps = useWallComposer({
    createPost,
    setPosts,
    toast,
    showConfirm
  });

  const [postViewModes, setPostViewModes] = useState({});
  const [viewModeMenuOpen, setViewModeMenuOpen] = useState(null);
  const [activityDrawer, setActivityDrawer] = useState(null); // null | 'chart' | 'recent'

  const editFileInputRef = useRef(null);
  const composerRef = useRef(null);
  const postRefsMap = useRef(new Map());

  const renderAvatarContent = (author, size = 36) => {
    if (!author) return null;
    return <Avatar author={author} size={size} />;
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

  const typeIcons = { donation: HeartHandshake, testimony: MessageCircle, impact: Sparkles, service: Wrench };
  const typeLabels = { donation: 'Donación', testimony: 'Testimonio', impact: 'Impacto', service: 'Servicio' };

  const VIEW_MODE_OPTIONS = [
    { id: 'list', label: 'Lista' },
    { id: 'detail', label: 'Lista con detalle' },
    { id: 'icon-sm', label: 'Ícono pequeño' },
    { id: 'icon-md', label: 'Ícono mediano' },
    { id: 'icon-lg', label: 'Ícono grande' },
  ];
  const getPostViewMode = (postId) => postViewModes[postId] || 'detail';

  useEffect(() => {
    Helpers.initRevealAnimations();
  }, [posts]);

  useEffect(() => {
    const FADE_START_OFFSET = 30;
    const MIN_FADE_DISTANCE = 220;
    let rafId = null;
    const updatePostsBehindState = () => {
      rafId = null;
      const composerEl = composerRef.current;
      if (!composerEl) return;
      const composerBottom = composerEl.getBoundingClientRect().bottom;

      postRefsMap.current.forEach((el) => {
        if (!el) return;
        el.style.transition = 'none';
        const rect = el.getBoundingClientRect();
        const distanceIntoFade = (composerBottom + FADE_START_OFFSET) - rect.top;
        if (distanceIntoFade <= 0) {
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
          el.style.visibility = 'visible';
        } else {
          // La card entera debe terminar de recorrer su propia altura antes de
          // desaparecer del todo, así una card alta no se esfuma de golpe
          // mientras aún ocupa gran parte de la pantalla.
          const fadeDistance = Math.max(rect.height, MIN_FADE_DISTANCE);
          const progress = Math.min(distanceIntoFade / fadeDistance, 1);
          const opacity = Math.max(1 - progress, 0);
          el.style.opacity = opacity.toFixed(3);
          if (opacity <= 0.02) {
            el.style.pointerEvents = 'none';
            el.style.visibility = 'hidden';
          } else {
            el.style.pointerEvents = 'auto';
            el.style.visibility = 'visible';
          }
        }
      });
    };
    const handleScroll = () => {
      if (rafId == null) {
        rafId = requestAnimationFrame(updatePostsBehindState);
      }
    };
    updatePostsBehindState();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [posts]);

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

  const handleOpenEnhanceModal = (kind, item, postId) => {
    composerProps.openEnhanceModal(kind, { ...item, postId });
  };

  const handleApplyEnhance = async (file) => {
    const target = composerProps.enhanceTarget;
    if (!target) return;
    if (target.item?.postId) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const media = await apiClient.requestFormData(`/wall/${target.item.postId}/media`, formData);
        setPosts((prev) => prev.map((p) => (p.id === target.item.postId ? { ...p, media: [...(p.media || []), media] } : p)));
        toast.success('Multimedia mejorado agregado a la publicación.');
      } catch (err) {
        toast.error('No se pudo guardar la mejora.');
      }
    } else {
      composerProps.applyEnhancedItem(target.kind, target.item, file);
    }
    composerProps.closeEnhanceModal();
  };

  const handleTextGenerated = (text, mode) => {
    const target = composerProps.enhanceTarget;
    if (target?.item?.postId) {
      const textarea = document.getElementById(`edit-post-${target.item.postId}`);
      if (textarea) {
        const current = textarea.value.trim();
        textarea.value = mode === 'append' && current ? `${current}\n\n${text}` : text;
        toast.success('Texto agregado a la edición.');
      }
    } else {
      composerProps.insertGeneratedText(text, mode);
    }
    composerProps.closeEnhanceModal();
  };

  const feedProps = {
    loading, posts, editingPostId, setEditingPostId, editingCommentId, setEditingCommentId,
    editTargetPostId, setEditTargetPostId, handleDeletePost, handleUpdatePost,
    handleDeleteMedia, handleEditMediaUpload, handleComment, handleUpdateComment,
    handleDeleteComment,
    viewModeMenuOpen, setViewModeMenuOpen,
    postViewModes, setPostViewModes,
    postRefsMap, editFileInputRef,
    onOpenEnhanceModal: handleOpenEnhanceModal
  };

  const utilsProps = {
    renderAvatarContent, renderMentionBadge, typeIcons, 
    typeLabels, VIEW_MODE_OPTIONS, getPostViewMode
  };

  return (
    <div className="page-content wall-bg-photo">
      <div className="wall-layout">
        <div className="wall-main">
          {currentUser?.role === 'admin' && posts.length > 0 && (
            <div className="d-flex justify-between items-center mb-4 p-3 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-lg)' }}>
              <div className="d-flex items-center gap-2" style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                <ShieldAlert width="18" height="18" />
                <span>Panel Admin: {posts.length} publicaciones en el muro</span>
              </div>
              <button
                className="btn btn-danger btn-sm d-flex items-center gap-2"
                onClick={handleDeleteAllPosts}
                style={{ padding: '6px 14px', fontSize: 'var(--text-xs)', fontWeight: 600 }}
              >
                <Trash2 width="14" height="14" />
                <span>Vaciar Muro ({posts.length})</span>
              </button>
            </div>
          )}

          <div className="post-composer reveal" ref={composerRef}>
            <WallComposer 
              composer={composerProps} 
              renderAvatarContent={renderAvatarContent} 
              currentUser={currentUser} 
            />
          </div>

          <WallFeed
            feed={feedProps} 
            utils={utilsProps} 
            currentUser={currentUser} 
          />
        </div>

        <WallSidebar 
          sidebarKpis={sidebarKpis} 
          setActivityDrawer={setActivityDrawer} 
        />
      </div>

      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false, showInput: false, inputValue: '', canAddComment: false }))}
        title={confirmModal.title}
        size="sm"
        actions={[
          { label: 'Cancelar', onClick: () => setConfirmModal(prev => ({ ...prev, isOpen: false, showInput: false, inputValue: '', canAddComment: false })), className: 'btn-outline' },
          { label: confirmModal.confirmLabel, onClick: () => confirmModal.onConfirm(confirmModal.inputValue), className: confirmModal.confirmClass }
        ]}
      >
        <div className="flex flex-col gap-4 w-full" style={{ width: '100%' }}>
          <p className="text-sm text-secondary leading-relaxed w-full" style={{ width: '100%', maxWidth: '100%', margin: 0 }}>
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

      <Drawer
        isOpen={activityDrawer === 'chart'}
        onClose={() => setActivityDrawer(null)}
        position="right"
        title="Actividad del Muro"
        width="420px"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-secondary leading-relaxed">
            Publicaciones de los últimos 7 días.
          </p>
          <div className="wall-chart-wrapper">
            <Line data={weekChartData} options={weekChartOptions} />
          </div>
          <div className="wall-sidebar-kpis">
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
        </div>
      </Drawer>

      <Drawer
        isOpen={activityDrawer === 'recent'}
        onClose={() => setActivityDrawer(null)}
        position="right"
        title="Actividad Reciente"
        width="420px"
      >
        <div className="wall-activity-list">
          {posts.length === 0 ? (
            <p className="text-xs text-tertiary">Aún no hay publicaciones.</p>
          ) : posts.map(post => (
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
      </Drawer>

      {composerProps.enhanceTarget && (
        <WallMediaEnhancePanel
          item={composerProps.enhanceTarget.item}
          kind={composerProps.enhanceTarget.kind}
          onApply={handleApplyEnhance}
          onTextGenerated={handleTextGenerated}
          onClose={composerProps.closeEnhanceModal}
        />
      )}
    </div>
  );
}

export default function Wall() {
  return (
    <ErrorBoundary fallbackTitle="Error al cargar el Muro de Impacto">
      <WallContent />
    </ErrorBoundary>
  );
}
