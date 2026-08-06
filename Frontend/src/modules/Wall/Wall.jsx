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
          No buscamos aplausos. No buscamos vitrinas. DonApp existe porque servir es el único negocio donde todos ganan — incluso quienes nadie ve.
        </div>
        <div className="wall-subtitle">Evidencia de impacto real</div>
        
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
          <textarea 
            name="text" 
            placeholder="¿Qué historia de impacto quieres contar hoy?"
            rows="1"
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          ></textarea>
          
          {tempMedia && (
            <div className="wall-post-media">
              {tempMedia.type.startsWith('image/') ? (
                <img src={Helpers.resolveMediaUrl(tempMedia.url)} alt="Preview" />
              ) : (
                <div style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface)' }}>
                  <Paperclip size={20} className="text-primary" />
                  <span className="text-sm">Documento adjunto</span>
                </div>
              )}
              <button 
                type="button" 
                onClick={() => setTempMedia(null)}
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="post-composer-actions">
            <div className="post-composer-tools">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
              <button type="button" className="post-composer-tool" title="Adjuntar imagen o archivo" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <ImageIcon width="20" height="20" />
              </button>
              <select name="type" className="form-select" style={{ width: 'auto', padding: '4px 12px', fontSize: '12px', borderRadius: '20px', border: 'none', background: 'var(--primary-50)', color: 'var(--primary)' }}>
                <option value="impact">✨ Impacto</option>
                <option value="donation">🤝 Donación</option>
                <option value="testimony">💬 Testimonio</option>
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
          <div className="text-center p-12 text-tertiary">
            <div className="animate-pulse">Cargando historias...</div>
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
                      {post.media_url && (
                        <div className="wall-post-media">
                          {post.media_type?.startsWith('image/') ? (
                            <img src={Helpers.resolveMediaUrl(post.media_url)} alt="Impact" />
                          ) : (
                            <a href={Helpers.resolveMediaUrl(post.media_url)} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-surface rounded-xl text-primary no-underline border border-dashed border-primary/20">
                              <Paperclip size={20} />
                              <span className="text-sm font-medium">Ver documento adjunto</span>
                            </a>
                          )}
                        </div>
                      )}
                    </>
                  )}
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
    </div>
  );
}

