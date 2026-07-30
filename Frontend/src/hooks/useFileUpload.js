import { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { apiClient } from '../utils/apiClient';

const IMAGE_COMPRESS_THRESHOLD = 2 * 1024 * 1024;
const IMAGE_MAX_RAW_SIZE       = 10 * 1024 * 1024;
const IMAGE_TARGET_MAX_SIZE    = 1.5 * 1024 * 1024;
const IMAGE_TARGET_MAX_DIM     = 1920;
const COMPRESS_MAX_ITERATIONS  = 6;
const COMPRESS_MIN_QUALITY     = 0.5;

const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // TODO: límite de 20MB para video no verificado empíricamente en Docker+WSL2. Ajustar si se detectan fallos de red al subir videos grandes.

export function useFileUpload(options = {}) {
  const { onProgress, onSuccess, onError } = options;
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);

  const validateFile = useCallback((file) => {
    if (!file) return { valid: false, error: 'No file selected' };

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      return { valid: false, error: 'File must be an image or video' };
    }

    if (isImage && file.size > IMAGE_MAX_RAW_SIZE) {
      return { valid: false, error: `File too large. Max size: 10MB.` };
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      return { valid: false, error: 'El video supera el límite de 20MB. Comprímelo externamente e inténtalo de nuevo.' };
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

  const compressImage = useCallback(async (file) => {
    const img = await new Promise((resolve, reject) => {
      const imgEl = new Image();
      imgEl.onload = () => resolve(imgEl);
      imgEl.onerror = () => reject(new Error('Failed to load image'));
      imgEl.src = URL.createObjectURL(file);
    });

    const isPNG = file.type === 'image/png';
    let outputFormat = file.type;

    if (isPNG) {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let hasAlpha = false;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] < 255) { hasAlpha = true; break; }
      }
      outputFormat = hasAlpha ? 'image/png' : 'image/jpeg';
    } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      outputFormat = 'image/jpeg';
    } else if (file.type === 'image/webp') {
      outputFormat = 'image/webp';
    }

    let width = img.naturalWidth;
    let height = img.naturalHeight;
    if (width > IMAGE_TARGET_MAX_DIM || height > IMAGE_TARGET_MAX_DIM) {
      const ratio = Math.min(IMAGE_TARGET_MAX_DIM / width, IMAGE_TARGET_MAX_DIM / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const qualitySteps = [0.9, 0.8, 0.7, 0.6, 0.5];
    let bestBlob = null;
    let bestQuality = COMPRESS_MIN_QUALITY;

    for (let i = 0; i < Math.min(COMPRESS_MAX_ITERATIONS, qualitySteps.length); i++) {
      const q = qualitySteps[i];
      const blob = await new Promise((resolve) => {
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        c.toBlob((b) => resolve(b), outputFormat, q);
      });

      bestBlob = blob;
      bestQuality = q;

      if (blob.size <= IMAGE_TARGET_MAX_SIZE) break;
    }

    if (bestBlob && bestBlob.size > IMAGE_TARGET_MAX_SIZE) {
      console.warn(`[useFileUpload] No se alcanzó el target de compresión. Archivo: ${file.name}, tamaño final: ${(bestBlob.size / 1024 / 1024).toFixed(2)}MB`);
    }

    URL.revokeObjectURL(img.src);

    const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
    const ext = extMap[outputFormat] || '.jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([bestBlob], `${baseName}${ext}`, { type: outputFormat });
  }, []);

  const upload = useCallback(async (file) => {
    let fileToUpload = file;

    const esImagen = file.type.startsWith('image/');

    if (esImagen && file.size > IMAGE_COMPRESS_THRESHOLD) {
      setCompressing(true);
      fileToUpload = await compressImage(file);
      setCompressing(false);
    }

    const validation = validateFile(fileToUpload);
    if (!validation.valid) {
      onError?.(validation.error);
      return null;
    }

    setUploading(true);
    setProgress(0);
    generatePreview(fileToUpload);

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);

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
    compressing,
    progress,
    preview,
  };
}