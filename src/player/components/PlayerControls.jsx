import React from 'react';

export default function PlayerControls({
  channelName,
  isPlaying,
  isPinned,
  isFavorite,
  showControls,
  onPlayPause,
  onNext,
  onPrev,
  onTogglePin,
  onToggleFavorite,
  onClose,
  hasNext,
  hasPrev
}) {
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
    </div>
  );
}
