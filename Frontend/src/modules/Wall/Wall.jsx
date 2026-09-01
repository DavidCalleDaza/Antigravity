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
import ShareModal from '../../components/ShareModal';

import WallComposer from './components/WallComposer';
import WallFeed from './components/WallFeed';
import WallSidebar from './components/WallSidebar';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

export default function Wall() {
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

  const postManager = useWallPosts({ toast, showConfirm });
  const {
    loading, posts, setPosts, editingPostId, setEditingPostId, editingCommentId, setEditingCommentId,
    editTargetPostId, setEditTargetPostId, handleDeletePost, handleDeleteAllPosts, handleUpdatePost,
    handleDeleteMedia, handleEditMediaUpload, handleComment, handleUpdateComment,
    handleDeleteComment, createPost
  } = postManager;

  const [sharePost, setSharePost] = useState(null);
  const composerProps = useWallComposer({ createPost, setPosts, setSharePost, toast, showConfirm });

  const [postViewModes, setPostViewModes] = useState({});
  const [viewModeMenuOpen, setViewModeMenuOpen] = useState(null);
  const [activityDrawer, setActivityDrawer] = useState(null); // null | 'chart' | 'recent'

  const editFileInputRef = useRef(null);
  const composerRef = useRef(null);
  const postRefsMap = useRef(new Map());

  const getAvatarUrl = (avatar) => {
    return Helpers.resolveMediaUrl(avatar);
  };

  const renderAvatarContent = (author) => {
    if (!author) return null;
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

  const feedProps = {
    loading, posts, editingPostId, setEditingPostId, editingCommentId, setEditingCommentId,
    editTargetPostId, setEditTargetPostId, handleDeletePost, handleUpdatePost,
    handleDeleteMedia, handleEditMediaUpload, handleComment, handleUpdateComment,
    handleDeleteComment,
    viewModeMenuOpen, setViewModeMenuOpen,
    postViewModes, setPostViewModes,
    postRefsMap, setSharePost, editFileInputRef
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
