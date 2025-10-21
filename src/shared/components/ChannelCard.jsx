import React from 'react';

export default function ChannelCard({ channel, isFavorite, onToggleFavorite, onPlay }) {
  return (
    <div className="channel-card">
      <button
        className="favorite-btn"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(channel);
        }}
      >
        {isFavorite ? '⭐' : '☆'}
      </button>
      <div onClick={() => onPlay(channel)} className="channel-content">
        {channel.logo ? (
          <div className="channel-logo">
            <img
              src={channel.logo}
              alt={channel.name}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<div class="channel-icon">📺</div>';
              }}
            />
          </div>
        ) : (
          <div className="channel-icon">📺</div>
        )}
        <div className="channel-info">
          <h3 className="channel-name">{channel.name}</h3>
        </div>
      </div>
    </div>
  );
}
