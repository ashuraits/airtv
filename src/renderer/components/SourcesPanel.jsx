import React from 'react';

// Simple sources list with actions


export default function SourcesPanel({ sources, onAdd, onToggle, onResync, onDelete }) {
  return (
    <div className="sources-panel">
      <div className="sources-header">
        <h2 className="sources-title">Sources</h2>
        <button className="btn-primary" onClick={onAdd}>Add Source</button>
      </div>
      <div className="sources-list">
        {sources.length === 0 ? (
          <div className="empty-sources">No sources</div>
        ) : (
          sources.map((s) => (
            <div className="source-item" key={s.id}>
              <div className="source-main">
                <span className="source-indicator" title={s.enabled ? 'Enabled' : 'Disabled'}>
                  {s.enabled ? '●' : '○'}
                </span>
                <span className="source-type">{s.type}</span>
                <span className="source-name">{s.name}</span>
              </div>
              <div className="source-actions">
                <button onClick={() => onToggle(s)} title="Enable/Disable">{s.enabled ? 'Disable' : 'Enable'}</button>
                <button onClick={() => onResync(s)} title="Re-sync">Re-sync</button>
                <button onClick={() => onDelete(s)} title="Delete">Delete</button>
              </div>
              <div className="source-meta">
                <span className="source-sync">{s.lastSync ? new Date(s.lastSync).toLocaleString() : 'Never synced'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

