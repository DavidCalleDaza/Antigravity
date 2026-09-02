import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Music } from 'lucide-react';

/**
 * SquareAudioPlayer
 * 
 * Renderiza un reproductor de audio compacto, cuadrado (aspect-ratio 1:1)
 * idéntico en dimensiones y bordes a las tarjetas de imagen y video del Muro.
 */
export default function SquareAudioPlayer({
  src,
  name,
  className = '',
  style = {},
  compact = false,
  icon = 'mic',
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
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

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [src]);

  const togglePlay = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // Pausar cualquier otro reproductor de audio activo
      document.querySelectorAll('audio').forEach((el) => {
        if (el !== audio && !el.paused) el.pause();
      });
      audio.play().catch((err) => console.log('Audio playback error:', err));
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(duration, pos * duration));
    audio.currentTime = newTime;
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
      className={`square-audio-card ${isPlaying ? 'is-playing' : ''} ${compact ? 'is-compact' : ''} ${className}`}
      style={style}
      onClick={togglePlay}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Cabecera / Badge e Icono de ondas */}
      <div className="square-audio-top">
        <div className="square-audio-badge">
          {icon === 'mic' ? <Mic size={11} /> : <Music size={11} />}
          <span>Audio</span>
        </div>
        <div className="square-audio-soundwave">
          <span className="wave-bar bar-1"></span>
          <span className="wave-bar bar-2"></span>
          <span className="wave-bar bar-3"></span>
          <span className="wave-bar bar-4"></span>
        </div>
      </div>

      {/* Botón Central de Play / Pause */}
      <div className="square-audio-center">
        <button
          type="button"
          className="square-audio-play-btn"
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" style={{ marginLeft: '2px' }} />
          )}
        </button>
      </div>

      {/* Barra de progreso y tiempo */}
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
  );
}
