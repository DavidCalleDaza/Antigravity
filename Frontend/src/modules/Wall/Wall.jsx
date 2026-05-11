import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  HeartHandshake, MessageCircle, Sparkles, Image as ImageIcon, 
  FilePlus, Users, Package, Send, MoreVertical, Trash2, Edit2, X, Paperclip 
} from 'lucide-react';
import Helpers from '../../utils/helpers';
import { useStore } from '../../store/useStore';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../utils/apiClient';
import { useWallSockets } from './useWallSockets';
import Modal from '../../components/ui/Modal';

export default function Wall() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [tempMedia, setTempMedia] = useState(null); // { url, type }
  const fileInputRef = useRef(null);
  
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
          media_type: tempMedia?.type
        };
        const newPost = await apiClient.post('/wall', payload);
        setPosts(prev => [newPost, ...prev]);
        form.reset();
        setTempMedia(null);
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

  const typeIcons = { donation: HeartHandshake, testimony: MessageCircle, impact: Sparkles };
  const typeLabels = { donation: 'Donación', testimony: 'Testimonio', impact: 'Impacto' };

  return (
    <div className="page-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="wall-header reveal">
        <div className="wall-quote">
          <span className="wall-quote-mark">“</span>
          No buscamos aplausos. No buscamos vitrinas. Servinow existe porque servir es el único negocio donde todos ganan — incluso quienes nadie ve.
        </div>
        <div className="wall-subtitle">Cada publicación aquí es evidencia de impacto real, no de popularidad.</div>
        <div className="wall-counters">
          <div className="wall-counter">
            <div className="wall-counter-value">340</div>
            <div className="wall-counter-label">Familias alcanzadas</div>
          </div>
          <div className="wall-counter">
            <div className="wall-counter-value">2,150</div>
            <div className="wall-counter-label">Productos donados</div>
          </div>
          <div className="wall-counter">
            <div className="wall-counter-value">127</div>
            <div className="wall-counter-label">Negocios que dan</div>
          </div>
        </div>
      </div>

      {/* Post Composer */}
      <div className="post-composer reveal">
        <div className="avatar">
          {renderAvatarContent(currentUser)}
        </div>
        <form className="post-composer-input" onSubmit={handlePublish}>
          <textarea name="text" placeholder="Comparte una historia de impacto..."></textarea>
          
          {tempMedia && (
            <div style={{ position: 'relative', marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              {tempMedia.type.startsWith('image/') ? (
                <img src={Helpers.resolveMediaUrl(tempMedia.url)} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
              ) : (
                <div style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--neutral-100)' }}>
                  <Paperclip size={20} />
                  <span style={{ fontSize: '13px' }}>Documento adjunto</span>
                </div>
              )}
              <button 
                type="button" 
                onClick={() => setTempMedia(null)}
                style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="post-composer-actions">
            <div className="post-composer-tools">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
              <button type="button" className="post-composer-tool" title="Agregar archivo" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <ImageIcon width="18" height="18" />
              </button>
              <select name="type" className="form-select" style={{ width: 'auto', padding: '2px 8px', fontSize: '12px', borderRadius: '20px' }}>
                <option value="donation">🤝 Donación</option>
                <option value="testimony">💬 Testimonio</option>
                <option value="impact">✨ Impacto</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={uploading}>
              {uploading ? 'Subiendo...' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>

      {/* Feed */}
      <div className="wall-feed">
        {loading && posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : (
          posts.map((post) => {
            const Icon = typeIcons[post.type] || Sparkles;
            const isAuthor = currentUser?.id === post.author_id || currentUser?.role === 'admin';

            return (
              <div className="wall-post reveal" key={post.id}>
                <div className="wall-post-header">
                  <div className="avatar" style={{ background: 'var(--accent-50)', color: 'var(--accent-700)' }}>
                    {renderAvatarContent(post.author)}
                  </div>
                  <div className="flex-1">
                    <div className="wall-post-author">{post.author?.full_name || post.author || '?'}</div>
                    <div className="wall-post-meta">
                      <span>{Helpers.formatDate(post.created_at, 'relative')}</span>
                      {post.is_edited && <span style={{ fontStyle: 'italic', fontSize: '10px' }}>(editado)</span>}
                      <span className={`wall-post-type ${post.type}`}>
                        <Icon width="12" height="12" style={{ marginRight: '4px' }} />
                        {typeLabels[post.type] || post.type}
                      </span>
                    </div>
                  </div>
                  {isAuthor && editingPostId !== post.id && (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => setEditingPostId(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDeletePost(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="wall-post-body">
                  {editingPostId === post.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <textarea 
                        defaultValue={post.content} 
                        id={`edit-post-${post.id}`}
                        style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid var(--primary)', background: 'var(--surface-raised)', color: 'var(--text-primary)' }}
                      />
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingPostId(null)} className="btn btn-sm" style={{ background: 'var(--neutral-200)' }}>Cancelar</button>
                        <button 
                          onClick={() => handleUpdatePost(post.id, document.getElementById(`edit-post-${post.id}`).value)} 
                          className="btn btn-primary btn-sm"
                        >Guardar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="wall-post-text">{post.content}</p>
                      {post.media_url && (
                        <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                          {post.media_type?.startsWith('image/') ? (
                            <img src={Helpers.resolveMediaUrl(post.media_url)} alt="Post content" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }} />
                          ) : (
                            <a href={Helpers.resolveMediaUrl(post.media_url)} target="_blank" rel="noreferrer" style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'var(--primary)', background: 'var(--neutral-50)' }}>
                              <Paperclip size={20} />
                              <span>Ver documento adjunto</span>
                            </a>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Comments */}
                <div className="wall-post-comments" style={{ padding: '0 1rem 1rem' }}>
                  {post.comments?.map((comment) => {
                    const isCommentAuthor = currentUser?.id === comment.author_id || currentUser?.role === 'admin';
                    return (
                      <div key={comment.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                        <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                          {renderAvatarContent(comment.author)}
                        </div>
                        <div style={{ flex: 1, background: 'var(--surface)', padding: '8px 12px', borderRadius: '12px', color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong style={{ fontSize: '12px' }}>{comment.author?.full_name || '?'}</strong>
                            {isCommentAuthor && (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={() => setEditingCommentId(comment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
                                  <Edit2 size={10} />
                                </button>
                                <button onClick={() => handleDeleteComment(post.id, comment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            )}
                          </div>
                          {editingCommentId === comment.id ? (
                            <div style={{ marginTop: '5px' }}>
                              <input 
                                defaultValue={comment.content} 
                                id={`edit-comment-${comment.id}`}
                                style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid var(--primary)', fontSize: '13px', background: 'var(--surface-raised)', color: 'var(--text-primary)' }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateComment(post.id, comment.id, e.target.value);
                                  if (e.key === 'Escape') setEditingCommentId(null);
                                }}
                              />
                            </div>
                          ) : (
                            <div style={{ fontSize: '13px' }}>
                              {comment.content}
                              {comment.is_edited && <span style={{ fontStyle: 'italic', fontSize: '9px', marginLeft: '5px', opacity: 0.6 }}>(editado)</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Comment Input */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Comentar..."
                      style={{ flex: 1, padding: '5px 12px', borderRadius: '20px', border: 'var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '13px' }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
            {confirmModal.message}
          </p>
          
          {confirmModal.canAddComment && !confirmModal.showInput && (
            <button 
              onClick={() => setConfirmModal(prev => ({ ...prev, showInput: true }))}
              className="btn btn-ghost btn-sm" 
              style={{ alignSelf: 'flex-start', color: 'var(--primary)', padding: 0, height: 'auto', background: 'none' }}
            >
              <MessageCircle size={14} style={{ marginRight: '5px' }} />
              Agregar comentario
            </button>
          )}

          {confirmModal.showInput && (
            <textarea
              value={confirmModal.inputValue}
              onChange={(e) => setConfirmModal(prev => ({ ...prev, inputValue: e.target.value }))}
              placeholder="Escribe tu comentario aquí..."
              className="form-textarea"
              autoFocus
              style={{ minHeight: '80px', fontSize: '14px' }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
