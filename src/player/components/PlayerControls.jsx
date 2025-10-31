import React, { useState } from 'react';
import FavoriteButton from '../../shared/components/FavoriteButton';

export default function PlayerControls({
  channelName,
  isPlaying,
  isPinned,
  isFavorite,
  showControls,
  volume,
  isMuted,
  hasError,
  onPlayPause,
  onNext,
  onPrev,
  onTogglePin,
  onToggleFavorite,
  onVolumeChange,
  onToggleMute,
  onClose,
  hasNext,
  hasPrev
}) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  return (
    <div className={`player-controls ${showControls ? 'visible' : ''}`}>
      <div className="controls-top">
        <div className="channel-name">{channelName}</div>
        <div className="control-buttons-top">
          <FavoriteButton
            isFavorite={isFavorite}
            onClick={onToggleFavorite}
            size={20}
            className="player-favorite-btn"
          />
          <button onClick={handleFullscreen} className="fullscreen-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              {isFullscreen ? (
                <>
                  <path d="M5 1V5H1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M11 1V5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M11 15V11H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 15V11H1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </>
              ) : (
                <>
                  <path d="M1 5V1H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M11 1H15V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 11V15H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 15H1V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </>
              )}
            </svg>
            <span className="button-label">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
          <button onClick={() => window.location.reload()} className="reload-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C10.3995 2 12.5 3.29521 13.5 5.25M13.5 2V5.25M13.5 5.25H10.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="button-label">Reload</span>
          </button>
          <button onClick={onTogglePin} className={`pin-btn ${isPinned ? 'pinned' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 13V7M5 5.5L6.5 4L7 2L9 2L9.5 4L11 5.5L11 7L5 7L5 5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              {isPinned && <circle cx="8" cy="8" r="2" fill="currentColor" opacity="0.3"/>}
            </svg>
            <span className="button-label">{isPinned ? 'Unpin' : 'Pin'}</span>
          </button>
          <button onClick={onClose} className="close-btn" title="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="controls-center">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="control-btn prev-btn"
          title="Previous channel"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 4L9 12L19 20V4Z" fill="currentColor"/>
            <path d="M5 4V20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
        <button
          onClick={onPlayPause}
          className={`control-btn play-pause-btn ${hasError ? 'error-btn' : ''}`}
          title={hasError ? 'Reload Stream' : (isPlaying ? 'Pause' : 'Play')}
        >
          {hasError ? (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 14C24 19.5228 19.5228 24 14 24C8.47715 24 4 19.5228 4 14C4 8.47715 8.47715 4 14 4C17.3995 4 20.5 5.79521 22 8.5M22 4V8.5M22 8.5H17.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : isPlaying ? (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="6" width="4" height="16" rx="1" fill="currentColor"/>
              <rect x="16" y="6" width="4" height="16" rx="1" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 6L21 14L9 22V6Z" fill="currentColor"/>
            </svg>
          )}
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="control-btn next-btn"
          title="Next channel"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 4L15 12L5 20V4Z" fill="currentColor"/>
            <path d="M19 4V20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="volume-control-wrapper">
        <div
          className="volume-control"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          {showVolumeSlider && (
            <div className="volume-slider-container">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="volume-slider"
                orient="vertical"
              />
            </div>
          )}
          <button
            onClick={onToggleMute}
            className="volume-btn"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4L6 7H3V13H6L10 16V4Z" fill="currentColor"/>
                <path d="M14 7L17 13M17 7L14 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : volume > 0.5 ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4L6 7H3V13H6L10 16V4Z" fill="currentColor"/>
                <path d="M13 6C14.5 7.5 14.5 12.5 13 14M15 4C17.5 6.5 17.5 13.5 15 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : volume > 0 ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4L6 7H3V13H6L10 16V4Z" fill="currentColor"/>
                <path d="M13 8C13.5 8.5 13.5 11.5 13 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4L6 7H3V13H6L10 16V4Z" fill="currentColor"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
