import React from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { useShareModal } from './hooks/useShareModal';
import ItemEditor from './ItemEditor';
import AiEnhancer from './AiEnhancer';
import SocialPublisher from './SocialPublisher';
import Drawer from '../ui/Drawer';
import Modal from '../ui/Modal';

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
      width={isExpanded ? 'min(1120px, 92vw)' : '560px'}
      onToggleExpand={handleToggleExpand}
      isExpanded={isExpanded}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Share2 width="20" height="20" />
          Publicar en redes sociales
        </div>
      }
    >
      <div className={`share-modal-body ${isExpanded ? 'share-modal--expanded' : ''}`}>
        <form id="share-modal-accordion-form" className="d-flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <ItemEditor {...modalState} dbCategories={dbCategories} onCategoryCreated={onCategoryCreated} />
          <AiEnhancer {...modalState} />
          <SocialPublisher {...modalState} mode={mode} />
        </form>

        <div className="drawer-form-actions" style={{ borderTop: '1px solid var(--border)' }}>
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

<style>{`
        /* ── Layout del Modal Body & Footer Fijo al Fondo ── */
        .share-modal-body {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .share-modal-body #share-modal-accordion-form {
          flex: 1;
        }

        .share-modal-body .drawer-form-actions {
          position: sticky;
          bottom: 0;
          margin-top: auto;
          padding: 12px 16px;
          z-index: 20;
        }

        /* ── Glassmorphism Theme Overrides ── */
        .share-modal-body {
          background: transparent !important;
        }

        .share-modal-body .accordion-section-header {
          background: rgba(28, 25, 36, 0.45) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-radius: var(--radius-2xl) !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06) !important;
          transition: all 0.3s ease !important;
          padding: 14px 18px !important;
        }

        .share-modal-body .accordion-section-icon,
        .share-modal-body .accordion-section-title {
          color: var(--text-primary) !important;
          font-weight: 600 !important;
        }

        .share-modal-body .accordion-section-summary {
          color: var(--text-tertiary) !important;
        }

        .share-modal-body .share-product-details-card,
        .share-modal-body .share-review-card,
        .share-modal-body .share-success-card,
        .share-modal-body .share-connect-cta-card,
        .share-modal-body .share-wizard-steps,
        .share-modal-body .ai-card-btn,
        .share-modal-body .share-edit-form-card,
        .share-modal-body .share-preview-card {
          background: rgba(28, 25, 36, 0.45) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-radius: var(--radius-2xl) !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06) !important;
        }

        .share-modal-body .drawer-form-actions {
          background: rgba(28, 25, 36, 0.65) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.12) !important;
          padding: 16px 20px !important;
        }

        /* ── Glassmorphism Light Mode ── */
        [data-theme="light"] .share-modal-body .accordion-section-header {
          background: rgba(255, 255, 255, 0.65) !important;
          border-color: rgba(255, 255, 255, 0.6) !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04) !important;
          color: var(--text-primary) !important;
        }

        [data-theme="light"] .share-modal-body .accordion-section-header .accordion-section-icon,
        [data-theme="light"] .share-modal-body .accordion-section-header .accordion-section-title {
          color: var(--text-primary) !important;
        }

        [data-theme="light"] .share-modal-body .share-product-details-card,
        [data-theme="light"] .share-modal-body .share-review-card,
        [data-theme="light"] .share-modal-body .share-success-card,
        [data-theme="light"] .share-modal-body .share-connect-cta-card,
        [data-theme="light"] .share-modal-body .share-wizard-steps,
        [data-theme="light"] .share-modal-body .ai-card-btn,
        [data-theme="light"] .share-modal-body .share-edit-form-card,
        [data-theme="light"] .share-modal-body .share-preview-card {
          background: rgba(255, 255, 255, 0.65) !important;
          border-color: rgba(255, 255, 255, 0.6) !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04) !important;
        }

        [data-theme="light"] .share-modal-body .drawer-form-actions {
          background: rgba(255, 255, 255, 0.75) !important;
          border-top-color: rgba(0, 0, 0, 0.08) !important;
        }

        [data-theme="light"] .share-modal-body .share-filter-pill.is-active {
          background: #000000 !important;
          border-color: #000000 !important;
          color: #ffffff !important;
        }

        [data-theme="light"] .share-modal-body .share-network-option input:checked {
          accent-color: #000000 !important;
        }

        [data-theme="light"] .share-modal-body .share-multi-img-thumb--primary {
          border-color: #000000 !important;
        }

        [data-theme="light"] .share-modal-body .share-multi-img-thumb-badge {
          background: #000000 !important;
          color: #ffffff !important;
        }

        [data-theme="light"] .share-modal-body .share-hashtag-label,
        [data-theme="light"] .share-modal-body .share-hashtag-add-btn {
          color: #000000 !important;
          border-color: #000000 !important;
        }

        /* ── Edición Real del Ítem ── */
        .share-edit-form-card {
          border: 1px solid var(--gold);
          border-radius: var(--radius-md);
          padding: 1rem;
        }

        /* ── Wizard de 4 pasos (Modo Expandido) ── */
        .share-wizard-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .share-wizard-steps {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
        }

        .share-wizard-step {
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }

        .share-wizard-step:hover:not(.is-disabled) {
          color: var(--text-primary);
          background: var(--surface-hover);
        }

        .share-wizard-step.is-active {
          color: var(--gold);
          font-weight: 700;
        }

        .share-wizard-step.is-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .share-wizard-step-num {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          font-size: 0.75rem;
          font-weight: 700;
        }

        .share-wizard-step.is-active .share-wizard-step-num {
          background: var(--gold-dim);
          border-color: var(--gold);
          color: var(--gold);
        }

        .share-wizard-step-label {
          font-size: 0.8rem;
        }

        @media (max-width: 640px) {
          .share-wizard-step-label {
            display: none;
          }
        }

        .share-wizard-step-line {
          flex: 1;
          height: 1px;
          background: var(--border-color);
          margin: 0 8px;
        }

        /* Inline IA Panel */
        .share-step-ai-panel {
          background: var(--surface-raised);
          border: 1px dashed var(--gold);
          border-radius: var(--radius-md);
          padding: 12px;
          margin-bottom: 12px;
        }

        /* CTA Card Conectar Cuentas */
        .share-connect-cta-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 10px;
          padding: 24px;
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-lg);
        }

        .share-connect-cta-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--gold-dim);
          color: var(--gold);
        }

        /* Filter Pills */
        .share-filter-pills {
          display: flex;
          gap: 6px;
        }

        .share-filter-pill {
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-secondary);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .share-filter-pill:hover,
        .share-filter-pill.is-active {
          border-color: var(--gold);
          color: var(--gold);
          background: var(--gold-dim);
        }

        /* Review Step Card */
        .share-review-card {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .share-review-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
        }

        .share-review-grid {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 16px;
        }

        @media (max-width: 520px) {
          .share-review-grid {
            grid-template-columns: 1fr;
          }
        }

        .share-review-img {
          width: 100%;
          height: 100px;
          object-fit: cover;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .share-review-caption {
          font-size: 0.82rem;
          color: var(--text-primary);
          background: var(--card-bg);
          padding: 10px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          white-space: pre-wrap;
          max-height: 120px;
          overflow-y: auto;
          margin-top: 4px;
        }

        .share-account-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 999px;
          font-size: 0.75rem;
        }

        /* Success Step Screen */
        .share-success-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
        }

        .share-success-icon {
          color: var(--success);
          margin-bottom: 12px;
        }

        .share-success-account-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }

        /* Grid Layout de Secciones */
        .share-sec-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .share-sec-grid.is-expanded-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        @media (max-width: 768px) {
          .share-sec-grid.is-expanded-grid {
            grid-template-columns: 1fr;
          }
        }

        .share-sec-col-main {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .share-sec-col-details,
        .share-sec-col-accounts {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* Product Details Card */
        .share-product-details-card {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .share-details-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
        }

        .share-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .share-detail-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: var(--card-bg);
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .share-detail-label {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 600;
        }

        .share-detail-val {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .share-detail-desc-block {
          margin-top: 4px;
          background: var(--card-bg);
          padding: 10px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .share-detail-desc {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 4px;
          line-height: 1.4;
          white-space: pre-wrap;
          max-height: 140px;
          overflow-y: auto;
        }

        /* AI Grid Cards */
        .ai-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .ai-cards-grid.is-expanded {
          gap: 16px;
        }

        @media (max-width: 520px) {
          .ai-cards-grid {
            grid-template-columns: 1fr;
          }
        }

        .ai-card-btn {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 14px 10px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .ai-cards-grid.is-expanded .ai-card-btn {
          padding: 20px 14px;
        }

        .ai-card-disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .ai-card-video {
          background: rgba(196, 168, 224, 0.1);
          border-color: rgba(196, 168, 224, 0.3);
        }

        .ai-card-badge {
          position: absolute;
          top: 6px;
          right: 6px;
        }

        .ai-card-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--gold-dim);
          color: var(--gold);
          margin-bottom: 8px;
        }

        .ai-card-title {
          font-size: 0.82rem;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .ai-card-desc {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .share-preview {
          margin-bottom: var(--space-2);
        }

        .share-preview-card {
          border-radius: var(--radius-lg);
          overflow: hidden;
          display: flex;
          flex-direction: row;
          height: 90px;
          border: 1px solid var(--border-color);
        }

        .share-preview-card--wallpost {
          height: auto;
          flex-direction: column;
        }

        .share-preview-card--wallpost .share-preview-image {
          width: 100%;
          height: auto;
          max-height: 250px;
          object-fit: cover;
        }

        .share-preview-card--wallpost .share-preview-loading,
        .share-preview-card--wallpost .share-preview-placeholder {
          width: 100%;
          height: 120px;
        }

        .share-preview-image {
          width: 90px;
          height: 90px;
          object-fit: cover;
        }

        .share-preview-loading,
        .share-preview-placeholder {
          width: 90px;
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-tertiary);
        }

        .share-preview-info {
          flex: 1;
          padding: var(--space-2) var(--space-3);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          gap: 2px;
        }

        .share-preview-name {
          font-weight: var(--font-semibold);
          color: var(--text-primary);
          font-size: var(--text-sm);
        }

        .share-preview-price {
          color: var(--gold);
          font-weight: var(--font-bold);
        }

        .ai-section-expanded {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .ai-context-ref {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .ai-context-ref-label {
          font-size: var(--text-xs);
          font-weight: var(--font-semibold);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
          color: var(--text-tertiary);
        }

        .ai-context-ref-body {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
        }

        .ai-context-ref-image {
          width: 64px;
          height: 64px;
          object-fit: cover;
          border-radius: var(--radius-md);
          flex-shrink: 0;
          border: 1px solid var(--border-color);
        }

        .ai-context-ref-text {
          margin: 0;
          font-size: var(--text-xs);
          color: var(--text-secondary);
          line-height: var(--leading-relaxed);
          white-space: pre-line;
          max-height: 80px;
          overflow-y: auto;
        }

        .share-networks {
          display: flex;
          gap: var(--space-3);
          flex-wrap: wrap;
        }

        .share-network-option {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          cursor: pointer;
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          transition: all var(--transition-fast);
          font-size: var(--text-sm);
        }

        .share-network-option:hover {
          border-color: var(--gold);
        }

        .share-network-option input {
          accent-color: var(--gold);
        }

        .share-network-icon {
          color: var(--text-secondary);
        }

        .share-instagram-panel {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          margin-top: var(--space-3);
        }

        .share-instagram-title {
          font-weight: var(--font-semibold);
          color: var(--text-primary);
          margin-bottom: var(--space-2);
        }

        .share-instagram-text {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin-bottom: var(--space-3);
        }

        .share-instagram-actions {
          display: flex;
          gap: var(--space-2);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .share-modal-body .drawer-form-actions {
          justify-content: center;
        }

        .btn-publish-dark {
          background: #000000 !important;
          color: #ffffff !important;
          border: none !important;
        }

        .btn-publish-dark:hover:not(:disabled) {
          background: #222222 !important;
        }

        .btn-publish-dark:disabled {
          background: #555555 !important;
          opacity: 0.6 !important;
        }

        .share-hashtag-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .share-hashtag-label {
          font-size: 1rem;
          font-weight: 700;
          color: var(--gold);
          flex-shrink: 0;
        }

        .share-hashtag-input {
          flex: 1;
          min-width: 0;
          padding: 5px 10px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-primary);
          font-size: 0.8rem;
          outline: none;
          transition: border-color var(--transition-fast);
        }

        .share-hashtag-input:focus {
          border-color: var(--gold);
        }

        .share-hashtag-add-btn {
          flex-shrink: 0;
          padding: 5px 10px;
          border-radius: var(--radius-md);
          border: 1px solid var(--gold);
          background: transparent;
          color: var(--gold);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }

        .share-hashtag-add-btn:hover:not(:disabled) {
          background: var(--gold);
          color: #fff;
        }

        .share-hashtag-add-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .share-char-counter {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          white-space: nowrap;
        }

        .share-char-counter--warn {
          color: #ef4444;
          font-weight: 600;
        }

        .share-multi-img {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .share-multi-img-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .share-multi-img-count {
          font-size: 0.72rem;
          color: var(--text-tertiary);
        }

        .share-multi-img-tiktok-warn {
          font-size: 0.72rem;
          color: #f59e0b;
          font-weight: 600;
        }

        .share-multi-img-strip {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .share-multi-img-thumb {
          position: relative;
          width: 64px;
          height: 64px;
          border-radius: 8px;
          overflow: visible;
          flex-shrink: 0;
          border: 2px solid var(--border-color);
        }

        .share-multi-img-thumb--primary {
          border-color: var(--gold);
        }

        .share-multi-img-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 6px;
          display: block;
        }

        .share-multi-img-thumb-badge {
          position: absolute;
          bottom: -6px;
          right: -6px;
          width: 18px;
          height: 18px;
          background: var(--gold);
          color: #fff;
          font-size: 0.6rem;
          font-weight: 700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--card-bg);
        }

        .share-multi-img-remove {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: none;
          background: #ef4444;
          color: #fff;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          z-index: 1;
          transition: background var(--transition-fast);
        }

        .share-multi-img-remove:hover {
          background: #dc2626;
        }

        .share-multi-img-add {
          width: 64px;
          height: 64px;
          border: 2px dashed var(--border-color);
          border-radius: 8px;
          background: var(--surface-raised);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          color: var(--text-tertiary);
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .share-multi-img-add:hover {
          border-color: var(--gold);
          color: var(--gold);
          background: var(--gold-dim);
        }

        .share-multi-img-add-plus {
          font-size: 1.2rem;
          font-weight: 300;
          line-height: 1;
        }

        .share-multi-img-add-label {
          font-size: 0.6rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      `}</style>
    </Drawer>
  );
}
