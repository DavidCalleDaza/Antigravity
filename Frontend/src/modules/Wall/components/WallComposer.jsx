import React, { useState } from 'react';
import {
  Image as ImageIcon, ChevronDown, ChevronUp
} from 'lucide-react';
import AccordionSection from '../../../components/ui/AccordionSection';
import MediaCarousel from '../../../components/ui/MediaCarousel';
import WallProductInfoSection from './WallProductInfoSection';
import WallSocialSection from './WallSocialSection';
import WallMediaEnhancePanel from './WallMediaEnhancePanel';

export default function WallComposer({ composer, renderAvatarContent, currentUser }) {
  const [multimediaOpen, setMultimediaOpen] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
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
              isOpen={multimediaOpen}
              onToggle={() => setMultimediaOpen(!multimediaOpen)}
              summary={multimediaSummary}
            >
              {/* Galería de imágenes adicionales */}
              <MediaCarousel
                existingUrls={[]}
                primaryUrl=""
                newImages={additionalImages}
                onRemoveNew={handleRemoveAdditionalImage}
                onAddFile={handleAddAdditionalImage}
                onItemClick={(item) =>
                  openEnhanceModal('image', { ...additionalImages[item.newIndex], newIndex: item.newIndex })
                }
              />

              {/* Audios adicionales */}
              <MediaCarousel
                label="Audios adicionales"
                kind="audio"
                accept="audio/*"
                items={audioItems}
                onAddFile={handleAddAudio}
                onItemClick={(item) =>
                  openEnhanceModal('audio', additionalAudios.find((a) => a.id === item.id))
                }
              />
              {audioError && <div className="text-xs text-danger mt-1">{audioError}</div>}

              {/* Videos adicionales */}
              <MediaCarousel
                label="Videos adicionales"
                kind="video"
                accept="video/*"
                items={videoItems}
                onAddFile={handleAddVideo}
                onItemClick={(item) =>
                  openEnhanceModal('video', additionalVideos.find((v) => v.id === item.id))
                }
              />
              {videoError && <div className="text-xs text-danger mt-1">{videoError}</div>}
            </AccordionSection>

            <WallProductInfoSection entity={entity} />

            <WallSocialSection accounts={accounts} shareOnSave={shareOnSave} setShareOnSave={setShareOnSave} />
          </>
        )}

        <div className="post-composer-actions">
          <button type="submit" className="btn btn-primary btn-sm">
            Publicar
          </button>
        </div>

        <p className="text-xs text-tertiary mt-2">
          Publica evidencia solo si cuentas con el consentimiento de las personas que aparecen en ella.
        </p>
      </form>

      {enhanceTarget && (
        <WallMediaEnhancePanel
          item={enhanceTarget.item}
          kind={enhanceTarget.kind}
          onApply={(file) => {
            applyEnhancedItem(enhanceTarget.kind, enhanceTarget.item, file);
            closeEnhanceModal();
          }}
          onTextGenerated={insertGeneratedText}
          onClose={closeEnhanceModal}
        />
      )}
    </>
  );
}
