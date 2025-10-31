import React from 'react';
import FavoriteButton from './FavoriteButton';

export default function ChannelCard({ channel, isFavorite, onToggleFavorite, onPlay, selectable, selected, onToggleSelect, sourceLabel, sourceTitle }) {
  return (
    <div className="channel-card">
      <div className="favorite-btn-wrapper">
        <FavoriteButton
          isFavorite={isFavorite}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(channel);
          }}
          size={20}
        />
      </div>

      {sourceLabel && (
        <div className="source-badge" title={sourceTitle || ''}>
          {sourceLabel}
        </div>
      )}

      {selectable && (
        <label
          className="channel-select-label"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="channel-select"
            checked={!!selected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(channel);
            }}
            title="Select"
          />
        </label>
      )}

      <div className="channel-content" onClick={() => onPlay(channel)}>
        {channel.logo ? (
          <div className="channel-logo">
            <img
              src={channel.logo}
              alt={channel.name}
              onError={(e) => {
                e.target.style.display = 'none';
                const iconDiv = document.createElement('div');
                iconDiv.className = 'channel-icon';
                iconDiv.innerHTML = `
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="6" y="10" width="36" height="24" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                    <rect x="9" y="13" width="30" height="18" rx="1" fill="currentColor" opacity="0.2"/>
                    <line x1="18" y1="34" x2="18" y2="38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <line x1="30" y1="34" x2="30" y2="38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <line x1="14" y1="38" x2="34" y2="38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="38" cy="14" r="1.5" fill="currentColor"/>
                  </svg>
                `;
                e.target.parentElement.appendChild(iconDiv);
              }}
            />
          </div>
        ) : (
          <div className="channel-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="10" width="36" height="24" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
              <rect x="9" y="13" width="30" height="18" rx="1" fill="currentColor" opacity="0.2"/>
              <line x1="18" y1="34" x2="18" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="30" y1="34" x2="30" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="14" y1="38" x2="34" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="38" cy="14" r="1.5" fill="currentColor"/>
            </svg>
          </div>
        )}
        <div className="channel-info">
          <h3 className="channel-name">{channel.name}</h3>
        </div>
      </div>
    </div>
  );
}
