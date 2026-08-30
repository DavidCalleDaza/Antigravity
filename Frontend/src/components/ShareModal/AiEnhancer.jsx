import React from 'react';
import { Sparkles, Image as ImageIcon, Video, ArrowLeft } from 'lucide-react';
import AccordionSection from '../ui/AccordionSection';
import AiCopyGenerator from '../AI/AiCopyGenerator';
import AiImageEnhancer from '../AI/AiImageEnhancer';
import AiVideoGenerator from '../AI/AiVideoGenerator';

export default function AiEnhancer({
  openSection,
  setOpenSection,
  aiSummary,
  isExpanded,
  activeAiSection,
  setActiveAiSection,
  previewUrl,
  shareText,
  item,
  setShareText,
  setIsAiGeneratedPost,
  imageBlob,
  handleEnhancedImage,
  setAiVideoUrl,
}) {
  return (
    <AccordionSection
      icon={<Sparkles width={18} height={18} />}
      title="2. MEJORAR CON IA"
      isOpen={openSection === 'ai'}
      onToggle={() => setOpenSection(openSection === 'ai' ? null : 'ai')}
      summary={aiSummary}
    >
      {activeAiSection === null ? (
        <div className={`ai-cards-grid ${isExpanded ? 'is-expanded' : ''}`}>
          {/* Tarjeta 1: Generar Texto (Activa) */}
          <button
            type="button"
            className="ai-card-btn"
            onClick={() => setActiveAiSection('copy')}
          >
            <div className="ai-card-icon-wrapper">
              <Sparkles width={20} height={20} />
            </div>
            <div className="ai-card-title">Generar Texto</div>
            <div className="ai-card-desc">
              {isExpanded
                ? 'Redacta descripciones atractivas con diferentes tonos de voz'
                : 'Crea copys para redes'}
            </div>
          </button>

          {/* Tarjeta 2: Mejorar Imágenes (Próximamente / Disabled) */}
          <button
            type="button"
            className="ai-card-btn ai-card-disabled"
            disabled={true}
            title="Próximamente — Mejora de imágenes con IA"
          >
            <span className="badge-coming-soon ai-card-badge">Próximamente</span>
            <div className="ai-card-icon-wrapper">
              <ImageIcon width={20} height={20} />
            </div>
            <div className="ai-card-title">Mejorar Imágenes</div>
            <div className="ai-card-desc">
              {isExpanded
                ? 'Aplica retoques, quita fondos y mejora la iluminación de fotos'
                : 'Retoques y filtros'}
            </div>
          </button>

          {/* Tarjeta 3: Generar Video (Próximamente / Disabled) */}
          <button
            type="button"
            className="ai-card-btn ai-card-disabled ai-card-video"
            disabled={true}
            title="Próximamente — Generación de video con IA"
          >
            <span className="badge-coming-soon ai-card-badge">Próximamente</span>
            <div className="ai-card-icon-wrapper">
              <Video width={20} height={20} />
            </div>
            <div className="ai-card-title">Generar Video</div>
            <div className="ai-card-desc">
              {isExpanded
                ? 'Convierte las fotos de tu producto en clips de video dinámicos'
                : 'Promos animadas'}
            </div>
          </button>
        </div>
      ) : (
        <div className="ai-section-expanded">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setActiveAiSection(null)}
            style={{ alignSelf: 'flex-start' }}
          >
            <ArrowLeft width="16" height="16" />
            Volver a opciones de IA
          </button>

          {activeAiSection !== 'video' && (
            <div className="ai-context-ref">
              <span className="ai-context-ref-label">Contenido actual</span>
              <div className="ai-context-ref-body">
                {previewUrl && (
                  <img src={previewUrl} alt="Imagen actual" className="ai-context-ref-image" />
                )}
                <p className="ai-context-ref-text">{shareText}</p>
              </div>
            </div>
          )}

          {activeAiSection === 'copy' && (
            <AiCopyGenerator
              item={item}
              onGenerated={(text) => {
                setShareText(text);
                setIsAiGeneratedPost(true);
                setActiveAiSection(null);
              }}
            />
          )}

          {activeAiSection === 'image' && (
            <AiImageEnhancer
              imageBlob={imageBlob}
              onEnhanced={(blob, mimeType) => {
                handleEnhancedImage(blob, mimeType);
                setActiveAiSection(null);
              }}
            />
          )}

          {activeAiSection === 'video' && (
            <AiVideoGenerator
              item={item}
              imageBlob={imageBlob}
              onVideoGenerated={(url) => {
                setAiVideoUrl(url);
                setIsAiGeneratedPost(true);
              }}
            />
          )}
        </div>
      )}
    </AccordionSection>
  );
}
