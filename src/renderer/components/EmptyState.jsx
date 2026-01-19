import React from 'react';

export default function EmptyState({ onLoadSource, onImportData }) {
  return (
    <div className="empty-state">
      <div className="empty-content">
        <div className="tv-icon-animated">📺</div>
        <h1 className="welcome-title">Welcome to AirTV</h1>
        <p className="welcome-subtitle">Start your streaming journey</p>
        <div className="welcome-buttons">
          <button onClick={onLoadSource} className="welcome-btn welcome-btn-primary">
            <span className="btn-icon">➕</span>
            <span className="btn-text">Add Source</span>
          </button>
          <button onClick={onImportData} className="welcome-btn welcome-btn-secondary">
            <span className="btn-icon">📥</span>
            <span className="btn-text">Import Data</span>
          </button>
        </div>
        <div className="welcome-hint">
          <span className="hint-icon">💡</span>
          <span>Add M3U playlist, URL, or Xtream Codes to get started</span>
        </div>
      </div>
    </div>
  );
}
