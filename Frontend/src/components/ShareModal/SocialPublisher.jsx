import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Share2,
  Facebook,
  Instagram,
  Video,
  Copy,
  Download,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Check,
  Plus,
  ExternalLink,
  Wand2,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import AccordionSection from '../ui/AccordionSection';
import AiCopyGenerator from '../AI/AiCopyGenerator';
import MarkdownEditor from '../ui/MarkdownEditor';
import { buildShareText } from './hooks/useShareModal';

const NETWORK_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Video,
};

const NETWORK_LABELS = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

export default function SocialPublisher({
  openSection,
  setOpenSection,
  socialSummary,
  isExpanded,
  activeStep,
  setActiveStep,
  stepAiOptimizing,
  setStepAiOptimizing,
  shareText,
  setShareText,
  item,
  mode,
  setIsAiGeneratedPost,
  hashtagInput,
  setHashtagInput,
  addHashtag,
  activeAccounts,
  accounts,
  platformFilter,
  setPlatformFilter,
  isAllSelected,
  handleSelectAll,
  filteredActiveAccounts,
  selectedAccounts,
  toggleAccount,
  showInstagramPanel,
  handleCopyText,
  imageBlob,
  handleDownloadImage,
  previewUrl,
  handleClose,
}) {
  const navigate = useNavigate();
  const isOpen = openSection === 'social';

  const renderTextEditor = () => (
    <div className="form-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <label className="form-label" style={{ marginBottom: 0 }}>Texto para publicar</label>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <label className="share-checkbox-label" style={{ fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              className="form-checkbox"
              onChange={(e) => {
                if (e.target.checked && item) {
                  setShareText(buildShareText(item, mode));
                }
              }}
            />
            <span>Auto-rellenar detalles</span>
          </label>
          <label className="share-checkbox-label" style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              className="form-checkbox"
              checked={stepAiOptimizing}
              onChange={(e) => setStepAiOptimizing(e.target.checked)}
            />
            <span><Wand2 width={12} height={12} className="inline mr-1" />Optimizar con IA</span>
          </label>
        </div>
      </div>

      {stepAiOptimizing ? (
        <div className="share-step-ai-panel">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase text-gold">Generador de Copy IA</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon-only"
              onClick={() => setStepAiOptimizing(false)}
            >
              <X width={14} height={14} />
            </button>
          </div>
          <AiCopyGenerator
            item={item}
            onGenerated={(text) => {
              setShareText(text);
              setIsAiGeneratedPost(true);
              setStepAiOptimizing(false);
            }}
          />
        </div>
      ) : (
        <>
          <MarkdownEditor
            value={shareText}
            onChange={(val) => setShareText(val)}
            rows={isExpanded ? 6 : 4}
          />
          <div className="share-hashtag-row mt-2">
            <span className="share-hashtag-label">#</span>
            <input
              type="text"
              className="share-hashtag-input"
              placeholder="agrega una etiqueta y presiona Enter"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value.replace(/\s/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addHashtag();
                }
              }}
            />
            <button
              type="button"
              className="share-hashtag-add-btn"
              onClick={(e) => {
                e.preventDefault();
                addHashtag();
              }}
            >
              <Plus width="14" height="14" />
            </button>
            <div style={{ flex: 1 }} />
            <span className={`share-char-counter ${shareText.length > 2200 ? 'share-char-counter--warn' : ''}`}>
              {shareText.length}/2200
            </span>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className={`share-step-card ${isOpen ? 'is-open' : ''}`} style={{ padding: isExpanded ? 0 : undefined, background: isExpanded ? 'transparent' : undefined, border: isExpanded ? 'none' : undefined, boxShadow: isExpanded ? 'none' : undefined }}>
      <div 
        className="share-step-header" 
        style={{ cursor: 'pointer', marginBottom: isOpen ? '1.25rem' : '0', borderBottom: isOpen ? '1px solid var(--border)' : 'none', paddingBottom: isOpen ? '1rem' : '0', display: isExpanded ? 'none' : 'flex' }}
        onClick={() => setOpenSection(isOpen ? null : 'social')}
      >
        <Share2 width={18} height={18} />
        <h3 className="share-step-title">COMPARTIR EN REDES</h3>
        <div style={{ marginLeft: 'auto' }}>
          {isOpen ? <ChevronUp width={20} height={20} /> : <ChevronDown width={20} height={20} />}
        </div>
      </div>
      {(isOpen || isExpanded) && (
      <div className="share-step-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            {renderTextEditor()}
          </div>
          <div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Selecciona las cuentas
                </label>
                <label className="share-network-option" style={{ padding: '0', border: 'none', background: 'transparent' }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    disabled={activeAccounts.length === 0}
                    className="form-checkbox"
                  />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Seleccionar todas</span>
                </label>
              </div>
              <div className="share-networks">
                {activeAccounts.length === 0 ? (
                  <div className="text-sm text-secondary p-3 border border-dashed border-neutral-700 rounded-lg w-full text-center">
                    No hay cuentas conectadas y activas.
                    <Link to="/profile?tab=social" className="text-primary ml-1 hover:underline">
                      Ir a Configuración <ExternalLink width={12} height={12} className="inline ml-1" />
                    </Link>
                  </div>
                ) : (
                  activeAccounts.map((account) => {
                    const Icon = NETWORK_ICONS[account.platform] || Share2;
                    const label = account.display_label || account.platform_username || account.platform_user_id;
                    const platformName = NETWORK_LABELS[account.platform] || account.platform;
                    return (
                      <div
                        key={account.id}
                        className="share-network-container"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', width: '100%' }}
                      >
                        <label className="share-network-option" style={{ flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={selectedAccounts.includes(account.id)}
                            onChange={() => toggleAccount(account.id)}
                            className="form-checkbox"
                          />
                          <span className="share-network-icon">
                            <Icon width="18" height="18" />
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.875rem' }}>{label}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              {platformName} {account.account_type === 'business' ? '(Business)' : ''}{' '}
                              {account.is_default ? '⭐' : ''}
                            </span>
                          </div>
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {showInstagramPanel && (
              <div className="share-instagram-panel">
                <p className="share-instagram-title">Instrucciones para Instagram</p>
                <p className="share-instagram-text">
                  Abre Instagram en tu móvil y pega el texto junto con la imagen descargada.
                </p>
                <div className="share-instagram-actions">
                  <button className="btn btn-outline btn-sm" onClick={handleCopyText}>
                    <Copy width="14" height="14" />
                    Copiar texto
                  </button>
                  {imageBlob && (
                    <button className="btn btn-outline btn-sm" onClick={handleDownloadImage}>
                      <Download width="14" height="14" />
                      Descargar imagen
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
