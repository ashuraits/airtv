import React, { useState } from 'react';

// Startup sync preview modal for multiple sources


export default function StartupSyncModal({ open, previews, onApplyAll, onSkipAll, onApplyOne }) {
  if (!open) return null;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const total = previews.reduce((acc, p) => ({
    added: acc.added + (p.counts?.added || 0),
    updated: acc.updated + (p.counts?.updated || 0),
    removed: acc.removed + (p.counts?.removed || 0),
  }), { added: 0, updated: 0, removed: 0 });

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ width: '560px' }}>
        <h2>Updates on startup</h2>

        <div className="update-summary">
          <span className="update-stat update-added">+{total.added}</span>
          <span className="update-stat update-modified">∆{total.updated}</span>
          <span className="update-stat update-removed">−{total.removed}</span>
        </div>

        <div className="update-list">
          {previews.length === 0 && (
            <div className="empty-state">No updates available</div>
          )}
          {previews.map((p) => (
            <div key={p.source.id} className="update-item">
              <div className="update-item-info">
                <div className="update-source-name">{p.source.name}</div>
                <div className="update-counts">
                  <span className="update-stat-small update-added">+{p.counts.added}</span>
                  <span className="update-stat-small update-modified">∆{p.counts.updated}</span>
                  <span className="update-stat-small update-removed">−{p.counts.removed}</span>
                </div>
              </div>
              <button className="btn-secondary" disabled={busy} onClick={async () => {
                try { setBusy(true); setError(''); await onApplyOne?.(p.source.id); } catch(e){ setError(String(e?.message||e)); } finally { setBusy(false); }
              }}>Apply</button>
            </div>
          ))}
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onSkipAll} disabled={busy}>Skip all</button>
          <button className="btn-primary" onClick={onApplyAll} disabled={busy || previews.length === 0}>Apply all</button>
        </div>
      </div>
    </div>
  );
}

