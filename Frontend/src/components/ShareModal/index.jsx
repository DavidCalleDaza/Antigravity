import React from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { useShareModal } from './hooks/useShareModal';
import ItemEditor from './ItemEditor';
import AiEnhancer from './AiEnhancer';
import SocialPublisher from './SocialPublisher';
import Drawer from '../ui/Drawer';
import Modal from '../ui/Modal';
import './share-modal.css';

export default function ShareModal({
  isOpen,
  onClose,
  item: initialItem,
  onPublish,
  mode = 'item', // 'item' | 'wallPost'
  view,
  setView,
  dbCategories = [],
  onCategoryCreated,
  onItemUpdated,
}) {
  const modalState = useShareModal({
    isOpen,
    onClose,
    initialItem,
    onPublish,
    mode,
    view,
    setView,
    onItemUpdated,
  });

  const {
    isExpanded,
    handleClose,
    handleToggleExpand,
    publishing,
    hasSelected,
    handlePublishClick,
    isImagePreviewOpen,
    setIsImagePreviewOpen,
    previewUrl,
    isWallPost,
  } = modalState;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      position="right"
      width={isExpanded ? 'calc(100vw - var(--sidebar-collapsed, 72px))' : '560px'}
      onToggleExpand={handleToggleExpand}
      isExpanded={isExpanded}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Share2 width="20" height="20" />
          Publicar
        </div>
      }
    >
      <div className={`share-modal-body ${isExpanded ? 'share-modal--expanded' : ''}`}>
        <form id="share-modal-accordion-form" onSubmit={(e) => e.preventDefault()}>
          <div className="share-modal-left-col">
            <ItemEditor {...modalState} mode={mode} dbCategories={dbCategories} onCategoryCreated={onCategoryCreated} />
            <AiEnhancer {...modalState} />
            <SocialPublisher {...modalState} mode={mode} />
          </div>
          
          {isExpanded && (
            <div className="share-modal-right-col">
              <div className="smartphone-mockup">
                <div className="smartphone-mockup-header">
                  <div className="mockup-avatar"></div>
                  <div className="mockup-username">Tu Página</div>
                </div>
                <div className="smartphone-mockup-body">
                  <div className="mockup-image-container">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="mockup-image" />
                    ) : (
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Sin imagen</div>
                    )}
                  </div>
                  <div className="mockup-caption-container">
                    {modalState.productSummary || 'Escribe un caption para ver la vista previa aquí...'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="drawer-form-actions">
          <button className="btn btn-outline" onClick={handleClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary btn-publish-dark"
            onClick={handlePublishClick}
            disabled={!hasSelected || publishing}
          >
            {publishing ? (
              <>
                <Loader2 width="16" height="16" className="spin" />
                Publicando...
              </>
            ) : (
              <>PUBLICAR</>
            )}
          </button>
        </div>
      </div>

      <Modal
        isOpen={isImagePreviewOpen}
        onClose={() => setIsImagePreviewOpen(false)}
        title="Vista previa detallada"
        size="sm"
        actions={[{ label: 'Cerrar', onClick: () => setIsImagePreviewOpen(false) }]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', gridColumn: '1 / -1', width: '100%' }}>
          <img
            src={previewUrl}
            alt="Vista previa detallada"
            style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px' }}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', margin: 0, textWrap: 'wrap' }}>
            {isWallPost
              ? 'Esta es la imagen que acompañará la publicación.'
              : 'Esta imagen incluye el texto incrustado que se publicará en las redes.'}
          </p>
        </div>
      </Modal>

    </Drawer>
  );
}
