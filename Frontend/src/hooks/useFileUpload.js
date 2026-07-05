import { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { apiClient } from '../utils/apiClient';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;

export function useFileUpload(options = {}) {
  const { onProgress, onSuccess, onError } = options;
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);

  const validateFile = useCallback((file) => {
    if (!file) return { valid: false, error: 'No file selected' };

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const maxSize = isImage ? MAX_IMAGE_SIZE : isVideo ? MAX_VIDEO_SIZE : 0;

    if (!isImage && !isVideo) {
      return { valid: false, error: 'File must be an image or video' };
    }

    if (file.size > maxSize) {
      const limit = isImage ? '5MB' : '20MB';
      return { valid: false, error: `File too large. Maximum size: ${limit}` };
    }

    return { valid: true, type: isImage ? 'image' : 'video' };
  }, []);

  const generatePreview = useCallback((file) => {
    if (!file) {
      setPreview(null);
      return;
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  }, []);

  const upload = useCallback(async (file) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      onError?.(validation.error);
      return null;
    }

    setUploading(true);
    setProgress(0);
    generatePreview(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setProgress(percent);
            onProgress?.(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            setProgress(100);
            onSuccess?.(data);
            resolve(data);
          } else {
            reject(new Error(xhr.responseText || 'Upload failed'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        const token = useStore.getState().currentUser?.token;
        xhr.open('POST', `${apiClient.baseUrl}/uploads/media`);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      const result = await uploadPromise;
      return result;

    } catch (error) {
      const message = error.message || 'Upload failed';
      onError?.(message);
      return null;
    } finally {
      setUploading(false);
    }
  }, [validateFile, generatePreview, onProgress, onSuccess, onError]);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
  }, [preview]);

  return {
    upload,
    validateFile,
    generatePreview,
    reset,
    uploading,
    progress,
    preview,
  };
}