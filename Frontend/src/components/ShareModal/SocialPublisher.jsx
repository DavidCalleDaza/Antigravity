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
              onClick={addHashtag}
              disabled={!hashtagInput.trim()}
            >
              + Agregar
            </button>
            <div style={{ flex: 1 }} />
            <span className={`share-char-counter ${shareText.length > 2200 ? 'share-char-counter--warn' : ''}`}>
              {shareText.length} / 2200
            </span>
          </div>
        </>
      )}
    </div>
  );

  return (
    <AccordionSection
      icon={<Share2 width={18} height={18} />}
      title="3. REDES SOCIALES META Y TIKTOK"
      isOpen={openSection === 'social'}
      onToggle={() => setOpenSection(openSection === 'social' ? null : 'social')}
      summary={socialSummary}
    >
      {!isExpanded ? (
        /* ── MODO CLÁSICO (Sin expandir - 560px) ── */
        <div className="share-sec-grid">
          <div className="share-sec-col-main">
            {renderTextEditor()}
          </div>
          <div className="share-sec-col-accounts">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
      ) : (
        /* ── MODO EXPANDIDO (Wizard de 4 pasos) ── */
        <div className="share-wizard-container">
          {/* Barra superior de 4 pasos */}
          <div className="share-wizard-steps">
            <button
              type="button"
              className={`share-wizard-step ${activeStep === 'redactar' ? 'is-active' : ''}`}
              onClick={() => activeStep !== 'publicado' && setActiveStep('redactar')}
            >
              <span className="share-wizard-step-num">1</span>
              <span className="share-wizard-step-label">Redactar</span>
            </button>
            <div className="share-wizard-step-line" />
            <button
              type="button"
              className={`share-wizard-step ${activeStep === 'cuentas' ? 'is-active' : ''}`}
              onClick={() => activeStep !== 'publicado' && setActiveStep('cuentas')}
            >
              <span className="share-wizard-step-num">2</span>
              <span className="share-wizard-step-label">Seleccionar cuentas</span>
            </button>
            <div className="share-wizard-step-line" />
            <button
              type="button"
              className={`share-wizard-step ${activeStep === 'revisar' ? 'is-active' : ''}`}
              onClick={() => activeStep !== 'publicado' && setActiveStep('revisar')}
            >
              <span className="share-wizard-step-num">3</span>
              <span className="share-wizard-step-label">Revisar</span>
            </button>
            <div className="share-wizard-step-line" />
            <button
              type="button"
              className={`share-wizard-step ${activeStep === 'publicado' ? 'is-active' : 'is-disabled'}`}
              disabled={activeStep !== 'publicado'}
            >
              <span className="share-wizard-step-num">
                {activeStep === 'publicado' ? <Check width={12} height={12} /> : '4'}
              </span>
              <span className="share-wizard-step-label">Publicado</span>
            </button>
          </div>

          {/* Contenido del paso activo */}
          <div className="share-wizard-content mt-4">
            {/* ── PASO 1: REDACTAR ── */}
            {activeStep === 'redactar' && (
              <div className="share-wizard-step-body">
                {renderTextEditor()}
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setActiveStep('cuentas')}
                  >
                    Siguiente: Cuentas <ChevronRight width={14} height={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ── PASO 2: SELECCIONAR CUENTAS ── */}
            {activeStep === 'cuentas' && (
              <div className="share-wizard-step-body">
                {activeAccounts.length === 0 ? (
                  <div className="share-connect-cta-card">
                    <div className="share-connect-cta-icon">
                      <Share2 width={28} height={28} />
                    </div>
                    <div className="share-connect-cta-text">
                      <h4>Conecta tus Redes Sociales</h4>
                      <p>
                        Empieza por vincular tus páginas de Facebook, Instagram o cuentas de TikTok para publicar automáticamente tus productos.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary w-full mt-2"
                      onClick={() => navigate('/profile?tab=social')}
                    >
                      <Plus width={16} height={16} /> Conectar cuentas ahora <ExternalLink width={14} height={14} className="ml-1" />
                    </button>
                  </div>
                ) : (
                  <div className="form-group">
                    {/* Filtros de plataforma opcionales */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="share-filter-pills">
                        <button
                          type="button"
                          className={`share-filter-pill ${platformFilter === 'all' ? 'is-active' : ''}`}
                          onClick={() => setPlatformFilter('all')}
                        >
                          Todas ({activeAccounts.length})
                        </button>
                        <button
                          type="button"
                          className={`share-filter-pill ${platformFilter === 'meta' ? 'is-active' : ''}`}
                          onClick={() => setPlatformFilter('meta')}
                        >
                          Meta ({accounts.filter((a) => a.platform === 'facebook' || a.platform === 'instagram').length})
                        </button>
                        <button
                          type="button"
                          className={`share-filter-pill ${platformFilter === 'tiktok' ? 'is-active' : ''}`}
                          onClick={() => setPlatformFilter('tiktok')}
                        >
                          TikTok ({accounts.filter((a) => a.platform === 'tiktok').length})
                        </button>
                      </div>

                      <label className="share-network-option" style={{ padding: '0', border: 'none', background: 'transparent' }}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          className="form-checkbox"
                        />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Seleccionar todas</span>
                      </label>
                    </div>

                    <div className="share-networks">
                      {filteredActiveAccounts.map((account) => {
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
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-between mt-3">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setActiveStep('redactar')}
                  >
                    <ArrowLeft width={14} height={14} /> Atrás
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setActiveStep('revisar')}
                  >
                    Siguiente: Revisar <ChevronRight width={14} height={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ── PASO 3: REVISAR ── */}
            {activeStep === 'revisar' && (
              <div className="share-wizard-step-body">
                <div className="share-review-card">
                  <div className="share-review-header">
                    <CheckCircle2 width={18} height={18} className="text-gold" />
                    <span>Resumen de la publicación</span>
                  </div>

                  <div className="share-review-grid">
                    <div className="share-review-item-col">
                      {previewUrl && (
                        <img src={previewUrl} alt="Vista previa" className="share-review-img" />
                      )}
                      {item && (
                        <div className="share-review-item-meta">
                          <span className="font-semibold text-sm">{item.name}</span>
                          <span className="text-xs text-gold">$ {Number(item.price || 0).toLocaleString('es-CO')}</span>
                        </div>
                      )}
                    </div>

                    <div className="share-review-text-col">
                      <label className="share-detail-label">Texto final:</label>
                      <p className="share-review-caption">{shareText || '*Sin texto*'}</p>
                    </div>
                  </div>

                  <div className="share-review-target-accounts mt-3">
                    <label className="share-detail-label">Cuentas destino ({selectedAccounts.length}):</label>
                    {selectedAccounts.length === 0 ? (
                      <p className="text-xs text-danger mt-1">⚠️ Ninguna cuenta seleccionada. Vuelve al paso anterior o selecciona cuentas.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedAccounts.map((id) => {
                          const acc = accounts.find((a) => a.id === id);
                          if (!acc) return null;
                          const Icon = NETWORK_ICONS[acc.platform] || Share2;
                          return (
                            <span key={id} className="share-account-chip">
                              <Icon width={12} height={12} />
                              <span>{acc.display_label || acc.platform_username || acc.platform_user_id}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setActiveStep('cuentas')}
                  >
                    <ArrowLeft width={14} height={14} /> Modificar cuentas
                  </button>
                  <span className="text-xs text-secondary">
                    Usa el botón <strong>PUBLICAR</strong> del pie para confirmar.
                  </span>
                </div>
              </div>
            )}

            {/* ── PASO 4: PUBLICADO ── */}
            {activeStep === 'publicado' && (
              <div className="share-wizard-step-body">
                <div className="share-success-card">
                  <div className="share-success-icon">
                    <CheckCircle2 width={48} height={48} />
                  </div>
                  <h3>¡Publicado con éxito!</h3>
                  <p className="text-sm text-secondary text-center mb-3">
                    Tu publicación se envió correctamente a las siguientes cuentas seleccionadas:
                  </p>
                  <div className="flex flex-col gap-2 w-full max-w-sm">
                    {selectedAccounts.map((id) => {
                      const acc = accounts.find((a) => a.id === id);
                      if (!acc) return null;
                      const Icon = NETWORK_ICONS[acc.platform] || Share2;
                      return (
                        <div key={id} className="share-success-account-row">
                          <Icon width={16} height={16} className="text-gold" />
                          <span className="font-medium text-sm flex-1">{acc.display_label || acc.platform_username || acc.platform_user_id}</span>
                          <Check width={16} height={16} className="text-success" />
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary mt-4"
                    onClick={handleClose}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AccordionSection>
  );
}
