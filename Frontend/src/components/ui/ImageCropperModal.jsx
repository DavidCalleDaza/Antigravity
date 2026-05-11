import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import Modal from './Modal';

const ASPECT_RATIO = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const size = Math.min(pixelCrop.width, pixelCrop.height);
  canvas.width = size;
  canvas.height = size;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        resolve(file);
      },
      'image/jpeg',
      0.85
    );
  });
}

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (err) => reject(err));
    image.src = url;
  });
}

export default function ImageCropperModal({
  isOpen,
  onClose,
  imageFile,
  onCropComplete,
}) {
  const [zoom, setZoom] = useState(1);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    if (isOpen && imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageSrc(url);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setCroppedAreaPixels(null);
    }
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [isOpen, imageFile]);

  const onCropCompleteCallback = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleClose = () => {
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc);
    }
    setImageSrc(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
    onClose();
  };

  const handleApply = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      handleClose();
      onCropComplete(croppedFile);
    } catch (err) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay active" onClick={(e) => e.target.classList.contains('modal-overlay') && handleClose()}>
      <div className="modal modal-lg animate-scaleUp" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3 className="modal-title">Recortar Imagen</h3>
          <button className="modal-close" onClick={handleClose} aria-label="Cerrar">
            <X width="20" height="20" />
          </button>
        </div>

        <div className="modal-body" style={{ padding: 0 }}>
          {imageSrc && (
            <div className="cropper-wrapper">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={ASPECT_RATIO}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropCompleteCallback}
                showGrid={false}
              />
            </div>
          )}

          <div className="cropper-controls">
            <button
              type="button"
              className="btn btn-ghost btn-icon-only"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.2))}
              disabled={zoom <= MIN_ZOOM}
            >
              <ZoomOut width="18" height="18" />
            </button>

            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="cropper-zoom-slider"
            />

            <button
              type="button"
              className="btn btn-ghost btn-icon-only"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.2))}
              disabled={zoom >= MAX_ZOOM}
            >
              <ZoomIn width="18" height="18" />
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={handleClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleApply}>
            Aplicar Recorte
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
