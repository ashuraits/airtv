import React, { useState } from 'react';

export default function PlayerControls({
  channelName,
  isPlaying,
  isPinned,
  isFavorite,
  showControls,
  volume,
  isMuted,
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
  return (
    <div className={`player-controls ${showControls ? 'visible' : ''}`}>
      <div className="controls-top">
        <div className="channel-name">{channelName}</div>
        <div className="control-buttons-top">
          <button onClick={onToggleFavorite} className={`favorite-btn ${isFavorite ? 'favorited' : ''}`}>
            {isFavorite ? '⭐' : '☆'}
          </button>
          <button onClick={onTogglePin} className={`pin-btn ${isPinned ? 'pinned' : ''}`}>
            {isPinned ? '📍 Unpin' : '📌 Pin'}
          </button>
          <button onClick={onClose} className="close-btn">
            ✕ Close
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
          ⏮
        </button>
        <button
          onClick={onPlayPause}
          className="control-btn play-pause-btn"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="control-btn next-btn"
          title="Next channel"
        >
          ⏭
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
            {isMuted ? '🔇' : volume > 0.5 ? '🔊' : volume > 0 ? '🔉' : '🔈'}
          </button>
        </div>
      </div>
    </div>
  );
}
