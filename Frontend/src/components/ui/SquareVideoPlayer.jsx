import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Video, Maximize2, PictureInPicture2 } from 'lucide-react';

/**
 * SquareVideoPlayer
 * 
 * Renderiza un reproductor de video compacto con el diseño IDÉNTICO al del audio:
 * - Fondo blanco transparente translúcido con efecto glassmorphism
 * - Etiqueta superior verde "Video" y botones de ventana flotante (PiP) y expandir a pantalla completa
 * - Botón central de Play / Pause con fondo y borde verde
 * - Barra de progreso verde y contadores de tiempo idénticos al audio
 */
export default function SquareVideoPlayer({
  src,
  name,
  className = '',
  style = {},
  compact = false,
  isSingle = false,
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('pause', handlePause);
    video.addEventListener('play', handlePlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('play', handlePlay);
    };
  }, [src]);

  const togglePlay = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      // Pausar cualquier otro video o audio que se esté reproduciendo
      document.querySelectorAll('video, audio').forEach((el) => {
        if (el !== video && !el.paused) el.pause();
      });
      video.play().catch((err) => console.log('Video playback error:', err));
    }
  };

  const handleTogglePiP = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        if (video.paused) await video.play();
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.log('Error Picture-in-Picture:', err);
    }
  };

  const handleToggleFullscreen = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (video.requestFullscreen) {
        await video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        await video.webkitRequestFullscreen();
      }
    } catch (err) {
      console.log('Error Fullscreen:', err);
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(duration, pos * duration));
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remSecs = Math.floor(secs % 60);
    return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`square-video-card ${isPlaying ? 'is-playing' : ''} ${compact ? 'is-compact' : ''} ${isSingle ? 'is-single' : ''} ${className}`}
      style={style}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
      />

      {/* Capa de Controles Overlay con Fondo Blanco Translúcido Idéntico al Audio */}
      <div className="square-video-overlay">
        {/* Cabecera / Badge "Video" Verde + Acciones PiP y Fullscreen */}
        <div className="square-audio-top">
          <div className="square-audio-badge">
            <Video size={11} />
            <span>Video</span>
          </div>

          <div className="square-video-actions">
            <button
              type="button"
              className="square-video-action-btn"
              onClick={handleTogglePiP}
              title="Ventana flotante (Picture-in-Picture)"
              aria-label="Ventana flotante"
            >
              <PictureInPicture2 size={11} />
            </button>
            <button
              type="button"
              className="square-video-action-btn"
              onClick={handleToggleFullscreen}
              title="Expandir a pantalla completa"
              aria-label="Expandir a pantalla completa"
            >
              <Maximize2 size={11} />
            </button>
          </div>
        </div>

        {/* Botón Central de Play / Pause Verde */}
        <div className="square-audio-center">
          <button
            type="button"
            className="square-audio-play-btn"
            aria-label={isPlaying ? 'Pausar video' : 'Reproducir video'}
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" style={{ marginLeft: '2px' }} />
            )}
          </button>
        </div>

        {/* Barra de progreso y tiempos idénticos al Audio */}
        <div className="square-audio-bottom">
          <div className="square-audio-progress-bar" onClick={handleSeek}>
            <div
              className="square-audio-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="square-audio-time">
            <span>{formatTime(currentTime)}</span>
            <span>{duration > 0 ? formatTime(duration) : '0:00'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
