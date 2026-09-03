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
  FileText,
  Sparkles,
} from 'lucide-react';
import AccordionSection from '../ui/AccordionSection';
import AiCopyGenerator from '../AI/AiCopyGenerator';
import MarkdownEditor from '../ui/MarkdownEditor';
import { buildShareText } from './hooks/useShareModal';
import { FacebookBrandIcon, InstagramBrandIcon, TikTokBrandIcon } from '../ui/SocialBrandIcons';

const BRAND_ICONS = {
  facebook: FacebookBrandIcon,
  instagram: InstagramBrandIcon,
  tiktok: TikTokBrandIcon,
};

const BRAND_NAMES = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

const BRAND_THEMES = {
  facebook: {
    badgeBg: 'rgba(24, 119, 242, 0.12)',
    badgeColor: '#1877F2',
  },
  instagram: {
    badgeBg: 'rgba(225, 48, 108, 0.12)',
    badgeColor: '#E1306C',
  },
  tiktok: {
    badgeBg: 'rgba(37, 244, 238, 0.12)',
    badgeColor: '#25F4EE',
  },
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
    <div className="share-text-group">
      <div className="share-text-header-toolbar">
        <div className="share-text-title-wrap">
          <FileText width={14} height={14} className="text-primary" />
          <span className="share-text-title">Texto para publicar</span>
        </div>

        <div className="share-text-actions-wrap">
          {item && (
            <button
              type="button"
              className="share-action-btn"
              onClick={() => setShareText(buildShareText(item, mode))}
              title="Cargar automáticamente datos y precio del producto/servicio"
            >
              <Sparkles width={12} height={12} />
              <span>Auto-rellenar</span>
            </button>
          )}

          <button
            type="button"
            className={`share-ai-toggle-btn ${stepAiOptimizing ? 'is-active' : ''}`}
            onClick={() => setStepAiOptimizing(!stepAiOptimizing)}
            title="Abrir generador inteligente de copy con IA"
          >
            <Wand2 width={12} height={12} />
            <span>{stepAiOptimizing ? 'Cerrar IA' : 'Optimizar con IA'}</span>
          </button>
        </div>
      </div>

      {stepAiOptimizing ? (
        <div className="share-step-ai-panel">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1 text-xs font-semibold uppercase text-gold">
              <Wand2 width={14} height={14} />
              <span>Generador de Copy IA</span>
            </div>
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
          <div className="share-hashtag-bar">
            <div className="share-hashtag-input-wrap">
              <span className="share-hashtag-symbol">#</span>
              <input
                type="text"
                className="share-hashtag-field"
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
                className="share-hashtag-submit-btn"
                onClick={(e) => {
                  e.preventDefault();
                  addHashtag();
                }}
                title="Añadir hashtag"
              >
                <Plus width={13} height={13} />
              </button>
            </div>
            <span className={`share-char-pill ${shareText.length > 2200 ? 'share-char-pill--warn' : ''}`}>
              {shareText.length} / 2200
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
            <div className="share-accounts-section">
              <div className="share-accounts-header">
                <span className="share-accounts-title">
                  <Share2 width={13} height={13} className="text-primary" />
                  Selecciona las cuentas
                  {activeAccounts.length > 0 && (
                    <span className="text-xs text-secondary font-normal ml-1">
                      ({selectedAccounts.length} de {activeAccounts.length})
                    </span>
                  )}
                </span>
                {activeAccounts.length > 0 && (
                  <label className="share-accounts-select-all">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      disabled={activeAccounts.length === 0}
                      className="form-checkbox"
                    />
                    <span>Seleccionar todas</span>
                  </label>
                )}
              </div>

              <div className="share-accounts-list">
                {activeAccounts.length === 0 ? (
                  <div className="text-sm text-secondary p-3 border border-dashed border-neutral-700 rounded-lg w-full text-center">
                    No hay cuentas conectadas y activas.
                    <Link to="/profile?tab=social" className="text-primary ml-1 hover:underline">
                      Ir a Configuración <ExternalLink width={12} height={12} className="inline ml-1" />
                    </Link>
                  </div>
                ) : (
                  activeAccounts.map((account) => {
                    const isSelected = selectedAccounts.includes(account.id);
                    const Icon = BRAND_ICONS[account.platform] || Share2;
                    const brandTheme = BRAND_THEMES[account.platform] || {
                      badgeBg: 'rgba(62, 180, 137, 0.12)',
                      badgeColor: 'var(--primary)',
                    };
                    const platformName = BRAND_NAMES[account.platform] || account.platform;
                    const rawName =
                      account.display_label ||
                      account.platform_username ||
                      account.platform_user_id ||
                      'Cuenta conectada';

                    return (
                      <div
                        key={account.id}
                        className={`share-account-card ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => toggleAccount(account.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="share-account-checkbox">
                          {isSelected && <Check width={12} height={12} strokeWidth={3} />}
                        </div>

                        <div className="share-account-brand-icon" style={{ background: brandTheme.badgeBg }}>
                          <Icon size={18} />
                        </div>

                        <div className="share-account-info">
                          <span className="share-account-name" title={rawName}>
                            {rawName}
                          </span>
                          <div className="share-account-meta">
                            <span className="share-account-platform-badge" style={{ color: brandTheme.badgeColor }}>
                              {platformName}
                            </span>
                            {account.account_type && (
                              <span className="share-account-type-badge">
                                {account.account_type === 'business' ? 'Business' : account.account_type}
                              </span>
                            )}
                            {account.is_default && (
                              <span className="share-account-default-badge" title="Cuenta principal">
                                ⭐ Principal
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {activeAccounts.length > 0 && (
                <Link
                  to="/profile?tab=social"
                  className="share-on-save-profile-btn mt-2"
                  style={{ textDecoration: 'none' }}
                >
                  <ExternalLink width={13} height={13} />
                  <span>Gestionar cuentas en Mi Perfil &rarr; Redes sociales</span>
                </Link>
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
      )}
    </div>
  );
}
