import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../../../utils/apiClient';
import { useWallSockets } from './useWallSockets';

export function useWallPosts({ toast, showConfirm }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editTargetPostId, setEditTargetPostId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);

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
  }, [toast]);

  const handleNewPost = useCallback((newPost) => {
    setPosts((prev) => {
      if (prev.find((p) => p.id === newPost.id)) return prev;
      return [newPost, ...prev];
    });
  }, []);

  const handlePostUpdated = useCallback((updatedPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
  }, []);

  const handlePostDeleted = useCallback(({ id }) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleNewComment = useCallback((newComment) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === newComment.post_id) {
          const comments = post.comments || [];
          if (comments.find((c) => c.id === newComment.id)) return post;
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
            comments: post.comments.map((c) => (c.id === updatedComment.id ? updatedComment : c)),
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
            comments: post.comments.filter((c) => c.id !== id),
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
    onCommentDeleted: handleCommentDeleted,
  });

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdatePost = async (postId, text) => {
    try {
      const updated = await apiClient.patch(`/wall/${postId}`, { content: text });
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
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
          setPosts((prev) => prev.filter((p) => p.id !== postId));
          toast.success('Publicación eliminada.');
        } catch (err) {
          toast.error('No se pudo eliminar.');
        }
      },
      'Eliminar',
      'btn-danger'
    );
  };

  const handleDeleteAllPosts = () => {
    if (!posts.length) return;
    showConfirm(
      'Vaciar Muro de Impacto',
      `¿Estás seguro de que deseas eliminar TODAS las ${posts.length} publicaciones del muro permanentemente? Esta acción no se puede deshacer.`,
      async () => {
        try {
          const results = await Promise.allSettled(
            posts.map((p) => apiClient.delete(`/wall/${p.id}`))
          );
          const succeeded = results.filter((r) => r.status === 'fulfilled').length;
          setPosts([]);
          toast.success(`Se han eliminado ${succeeded} publicaciones del muro.`);
        } catch (err) {
          toast.error('Ocurrió un error al vaciar el muro.');
        }
      },
      'Eliminar todas',
      'btn-danger'
    );
  };

  const handleEditMediaUpload = async (e, postId) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !postId) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const media = await apiClient.requestFormData(`/wall/${postId}/media`, formData);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, media: [...(p.media || []), media] } : p)));
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
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, media: (p.media || []).filter((m) => m.id !== media.id) } : p)));
      toast.success('Imagen eliminada.');
    } catch (err) {
      toast.error('No se pudo eliminar la imagen.');
    }
  };

  const handleComment = async (postId, text) => {
    if (!text.trim()) return;
    try {
      const newComment = await apiClient.post(`/wall/${postId}/comments`, { content: text });
      setPosts((prev) => prev.map((p) => {
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
      setPosts((prev) => prev.map((p) => {
        if (p.id === postId) {
          return { ...p, comments: p.comments.map((c) => (c.id === commentId ? updated : c)) };
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
          setPosts((prev) => prev.map((p) => {
            if (p.id === postId) {
              return { ...p, comments: p.comments.filter((c) => c.id !== commentId) };
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

  const createPost = async (payload) => {
    const newPost = await apiClient.post('/wall', payload);
    setPosts((prev) => [newPost, ...prev]);
    return newPost;
  };

  return {
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
    createPost,
  };
}
