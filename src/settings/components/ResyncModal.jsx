import React from 'react';

// Re-sync preview modal for a single source


export default function ResyncModal({ open, source, counts, sample, onApply, onCancel }) {
  if (!open) return null;
  const a = counts?.added || 0;
  const u = counts?.updated || 0;
  const r = counts?.removed || 0;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}>
      <div className="modal" style={{ width: '560px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px' }}>Re-sync Preview</h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#ccc', marginBottom: '8px' }}>
            Source
          </label>
          <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '16px' }}>
            {source?.name}
          </div>

          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#ccc', marginBottom: '12px' }}>
            Changes
          </label>
          <div style={{ display: 'flex', gap: '16px', padding: '12px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#4ade80' }}>+{a}</div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Added</div>
            </div>
            <div style={{ width: '1px', background: '#333' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#fbbf24' }}>∆{u}</div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Updated</div>
            </div>
            <div style={{ width: '1px', background: '#333' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#ff6b6b' }}>−{r}</div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Removed</div>
            </div>
          </div>
        </div>

        {(sample && (sample.added?.length || sample.updated?.length || sample.removed?.length)) && (
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#ccc', marginBottom: '8px' }}>
              Examples
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '6px' }}>Added</div>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  {(sample.added || []).map((n, i) => <li key={`a${i}`} style={{ fontSize: '12px', color: '#bbb' }}>{n}</li>)}
                </ul>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '6px' }}>Updated</div>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  {(sample.updated || []).map((n, i) => <li key={`u${i}`} style={{ fontSize: '12px', color: '#bbb' }}>{n}</li>)}
                </ul>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '6px' }}>Removed</div>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  {(sample.removed || []).map((n, i) => <li key={`r${i}`} style={{ fontSize: '12px', color: '#bbb' }}>{n}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={onApply}>Apply Changes</button>
        </div>
      </div>
    </div>
  );
}
