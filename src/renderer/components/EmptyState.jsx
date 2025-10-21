import React from 'react';

export default function EmptyState({ onLoadPlaylist }) {
  return (
    <div className="empty-state">
      <div className="empty-content">
        <div className="tv-icon">📺</div>
        <h1>Welcome to AirTV</h1>
        <p>Load an M3U playlist to get started</p>
        <button onClick={onLoadPlaylist} className="load-btn">
          Load Playlist
        </button>
      </div>
    </div>
  );
}
