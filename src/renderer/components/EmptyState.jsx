import React from 'react';

export default function EmptyState({ onLoadSource }) {
  return (
    <div className="empty-state">
      <div className="empty-content">
        <div className="tv-icon">📺</div>
        <h1>Welcome to AirTV</h1>
        <p>Add a source to get started</p>
        <button onClick={onLoadSource} className="load-btn">
          Add Source
        </button>
      </div>
    </div>
  );
}
