import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, Package, Paperclip, Edit2, Trash2, LayoutGrid, Share2,
  Image as ImageIcon, X
} from 'lucide-react';
import Helpers from '../../../utils/helpers';

export default function WallPostCard({ post, feed, utils, currentUser }) {
  const {
    editingPostId,
    setEditingPostId,
    editingCommentId,
    setEditingCommentId,
    editTargetPostId,
    setEditTargetPostId,
    viewModeMenuOpen,
    setViewModeMenuOpen,
    postRefsMap,
    handleDeletePost,
    handleUpdatePost,
    handleDeleteMedia,
    handleEditMediaUpload,
    handleComment,
    handleUpdateComment,
    handleDeleteComment,
    setSharePost,
    editFileInputRef,
    postViewModes,
    setPostViewModes,
  } = feed;

  const {
    renderAvatarContent,
    renderMentionBadge,
    typeIcons,
    typeLabels,
    VIEW_MODE_OPTIONS,
    getPostViewMode
  } = utils;

  const Icon = typeIcons[post.type] || Sparkles;
  const isAuthor = currentUser?.id === post.author_id || currentUser?.role === 'admin';

  return (
    <div
      className={`wall-post reveal wall-post--${getPostViewMode(post.id)}`}
      ref={(el) => {
        if (el) postRefsMap.current.set(post.id, el);
        else postRefsMap.current.delete(post.id);
      }}
    >
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
        <div className="wall-view-mode">
          <button
            type="button"
            className="btn-icon-only text-tertiary hover:text-primary"
            onClick={() => setViewModeMenuOpen(viewModeMenuOpen === post.id ? null : post.id)}
            title="Cambiar vista"
          >
            <LayoutGrid size={14} />
          </button>
          {viewModeMenuOpen === post.id && (
            <div className="wall-view-mode-menu">
              {VIEW_MODE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`wall-view-mode-option ${getPostViewMode(post.id) === opt.id ? 'active' : ''}`}
                  onClick={() => {
                    setPostViewModes(prev => ({ ...prev, [post.id]: opt.id }));
                    setViewModeMenuOpen(null);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
                      <video src={Helpers.resolveMediaUrl(m.media_url)} muted disablePictureInPicture />
                    ) : m.media_type?.startsWith('audio/') ? (
                      <audio src={Helpers.resolveMediaUrl(m.media_url)} controls />
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
              <input type="file" ref={editFileInputRef} onChange={(e) => handleEditMediaUpload(e, post.id)} accept="image/*,video/*" style={{ display: 'none' }} />
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
                    <video key={m.id} src={Helpers.resolveMediaUrl(m.media_url)} controls disablePictureInPicture />
                  ) : m.media_type?.startsWith('audio/') ? (
                    <audio key={m.id} src={Helpers.resolveMediaUrl(m.media_url)} controls />
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
                  <video src={Helpers.resolveMediaUrl(post.media_url)} controls disablePictureInPicture style={{ width: '100%', maxHeight: '500px' }} />
                ) : post.media_type?.startsWith('audio/') ? (
                  <audio src={Helpers.resolveMediaUrl(post.media_url)} controls />
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
}
