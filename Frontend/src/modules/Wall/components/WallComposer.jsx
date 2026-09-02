import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon, ChevronDown, ChevronUp, LayoutGrid, LayoutList, Check
} from 'lucide-react';
import AccordionSection from '../../../components/ui/AccordionSection';
import MediaCarousel from '../../../components/ui/MediaCarousel';
import WallProductInfoSection from './WallProductInfoSection';
import WallSocialSection from './WallSocialSection';
import WallMediaEnhancePanel from './WallMediaEnhancePanel';

export default function WallComposer({ composer, renderAvatarContent, currentUser }) {
  const [activeSection, setActiveSection] = useState(null); // 'multimedia' | 'product' | 'social' | null
  const toggleSection = (key) => setActiveSection((prev) => (prev === key ? null : key));
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  
  // Layout switch state: 'columns' | 'rows'
  const [multimediaLayout, setMultimediaLayout] = useState('columns');
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const layoutDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (layoutDropdownRef.current && !layoutDropdownRef.current.contains(e.target)) {
        setIsLayoutMenuOpen(false);
      }
    };
    if (isLayoutMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLayoutMenuOpen]);

  const {
    additionalImages,
    additionalAudios,
    additionalVideos,
    audioError,
    videoError,
    textareaRef,
    entity,
    enhanceTarget,
    openEnhanceModal,
    closeEnhanceModal,
    applyEnhancedItem,
    insertGeneratedText,
    accounts,
    shareOnSave,
    setShareOnSave,
    handleAddAdditionalImage,
    handleRemoveAdditionalImage,
    handleAddAudio,
    handleRemoveAudio,
    handleAddVideo,
    handleRemoveVideo,
    handlePublish
  } = composer;

  const multimediaCount = additionalImages.length + additionalAudios.length + additionalVideos.length;
  const multimediaSummary = `${multimediaCount} elemento${multimediaCount === 1 ? '' : 's'}`;

  const audioItems = additionalAudios.map((audio) => ({
    id: audio.id,
    url: audio.previewUrl,
    name: audio.name,
    isNew: true,
    onRemove: () => handleRemoveAudio(audio.id),
  }));

  const videoItems = additionalVideos.map((video) => ({
    id: video.id,
    url: video.previewUrl,
    name: video.name,
    isNew: true,
    onRemove: () => handleRemoveVideo(video.id),
  }));

  const hasMultimediaData = multimediaCount > 0;
  const hasProductData = entity.entityMode === 'edit' || Boolean(entity.entityFormData.name?.trim());
  const hasSocialData = shareOnSave.length > 0;
  const moreOptionsCount = [hasMultimediaData, hasProductData, hasSocialData].filter(Boolean).length;

  return (
    <>
      <form className="post-composer-input" onSubmit={handlePublish}>
        <div className="post-composer-top">
          <div className="avatar">
            {renderAvatarContent(currentUser)}
            <div className="wall-avatar-overlay" />
          </div>
          <textarea
            ref={textareaRef}
            name="text"
            placeholder="¿Qué historia de impacto quieres contar hoy?"
            rows="1"
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          ></textarea>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm wall-more-options-toggle"
          onClick={() => setMoreOptionsOpen(!moreOptionsOpen)}
        >
          {moreOptionsOpen ? <ChevronUp width={14} height={14} /> : <ChevronDown width={14} height={14} />}
          Mostrar más opciones ({moreOptionsCount}/3 con datos)
        </button>

        {moreOptionsOpen && (
          <>
            <AccordionSection
              icon={<ImageIcon width={16} height={16} />}
              title="MULTIMEDIA ADICIONAL"
              isOpen={activeSection === 'multimedia'}
              onToggle={() => toggleSection('multimedia')}
              summary={multimediaSummary}
            >
              {/* Barra de opciones de visualización (Columnas / Filas) */}
              <div className="wall-multimedia-toolbar">
                <div className="wall-layout-dropdown-container" ref={layoutDropdownRef}>
                  <button
                    type="button"
                    className={`wall-layout-toggle-btn ${isLayoutMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
                    title="Cambiar disposición (Columnas o Filas)"
                    aria-label="Cambiar disposición de multimedia"
                  >
                    {multimediaLayout === 'columns' ? <LayoutGrid size={13} /> : <LayoutList size={13} />}
                    <span className="wall-layout-label">
                      {multimediaLayout === 'columns' ? 'Columnas' : 'Filas'}
                    </span>
                    <ChevronDown size={12} className={`wall-layout-chevron ${isLayoutMenuOpen ? 'open' : ''}`} />
                  </button>

                  {isLayoutMenuOpen && (
                    <div className="wall-layout-dropdown-menu">
                      <button
                        type="button"
                        className={`wall-layout-option ${multimediaLayout === 'columns' ? 'selected' : ''}`}
                        onClick={() => {
                          setMultimediaLayout('columns');
                          setIsLayoutMenuOpen(false);
                        }}
                      >
                        <LayoutGrid size={13} />
                        <span>Columnas</span>
                        {multimediaLayout === 'columns' && <Check size={13} className="ml-auto" />}
                      </button>
                      <button
                        type="button"
                        className={`wall-layout-option ${multimediaLayout === 'rows' ? 'selected' : ''}`}
                        onClick={() => {
                          setMultimediaLayout('rows');
                          setIsLayoutMenuOpen(false);
                        }}
                      >
                        <LayoutList size={13} />
                        <span>Filas</span>
                        {multimediaLayout === 'rows' && <Check size={13} className="ml-auto" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Despliegue según opción elegida: Columnas o Filas */}
              <div className={multimediaLayout === 'columns' ? 'wall-multimedia-horizontal-grid' : 'wall-multimedia-vertical-list'}>
                {/* Galería de imágenes adicionales */}
                <div className="wall-multimedia-column">
                  <MediaCarousel
                    label="Imágenes adicionales"
                    existingUrls={[]}
                    primaryUrl=""
                    newImages={additionalImages}
                    onRemoveNew={handleRemoveAdditionalImage}
                    onAddFile={handleAddAdditionalImage}
                    onItemClick={(item) =>
                      openEnhanceModal('image', { ...additionalImages[item.newIndex], newIndex: item.newIndex })
                    }
                    multiple
                    compact={multimediaLayout === 'columns'}
                  />
                </div>

                {/* Audios adicionales */}
                <div className="wall-multimedia-column">
                  <MediaCarousel
                    label="Audios adicionales"
                    kind="audio"
                    accept="audio/*"
                    items={audioItems}
                    onAddFile={handleAddAudio}
                    onItemClick={(item) =>
                      openEnhanceModal('audio', additionalAudios.find((a) => a.id === item.id))
                    }
                    multiple
                    compact={multimediaLayout === 'columns'}
                  />
                  {audioError && <div className="text-xs text-danger mt-1">{audioError}</div>}
                </div>

                {/* Videos adicionales */}
                <div className="wall-multimedia-column">
                  <MediaCarousel
                    label="Videos adicionales"
                    kind="video"
                    accept="video/*"
                    items={videoItems}
                    onAddFile={handleAddVideo}
                    onItemClick={(item) =>
                      openEnhanceModal('video', additionalVideos.find((v) => v.id === item.id))
                    }
                    multiple
                    compact={multimediaLayout === 'columns'}
                  />
                  {videoError && <div className="text-xs text-danger mt-1">{videoError}</div>}
                </div>
              </div>
            </AccordionSection>

            <WallProductInfoSection
              entity={entity}
              isOpen={activeSection === 'product'}
              onToggle={() => toggleSection('product')}
            />

            <WallSocialSection
              accounts={accounts}
              shareOnSave={shareOnSave}
              setShareOnSave={setShareOnSave}
              isOpen={activeSection === 'social'}
              onToggle={() => toggleSection('social')}
            />
          </>
        )}

        <div className="post-composer-actions">
          <div className="post-composer-buttons">
            <button
              type="submit"
              className="btn btn-primary btn-sm wall-btn-publish"
              disabled={composer.isSubmitting}
            >
              {composer.isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true" />
                  Publicando...
                </>
              ) : (
                'PUBLICAR'
              )}
            </button>
          </div>
        </div>
      </form>

      {enhanceTarget && (
        <WallMediaEnhancePanel
          target={enhanceTarget}
          onClose={closeEnhanceModal}
          onApply={applyEnhancedItem}
          onInsertText={insertGeneratedText}
        />
      )}
    </>
  );
}
