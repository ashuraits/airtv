import React, { useState } from 'react';

// Group editor modal: rename/delete and quick create

export default function GroupEditor({ open, onClose, groups, counts, onChanged }) {
  if (!open) return null;
  const [editing, setEditing] = useState({}); // id -> name
  const [creating, setCreating] = useState('');
  const [deleting, setDeleting] = useState(null); // groupId or null
  const [deleteStrategy, setDeleteStrategy] = useState('ungroup');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const nameFor = (g) => editing[g.id] ?? g.name;
  const isDirty = (g) => editing[g.id] !== undefined && editing[g.id] !== g.name;

  const saveRename = async (g) => {
    const name = (editing[g.id] ?? '').trim();
    if (!name || name === g.name) {
      setEditing((e) => ({ ...e, [g.id]: undefined }));
      return;
    }
    try {
      setBusy(true);
      setError('');
      await window.electronAPI.groupRename(g.id, name);
      await onChanged?.();
      setEditing((e) => ({ ...e, [g.id]: undefined }));
    } catch (e) {
      setError(String(e && e.message ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const createGroup = async () => {
    const name = creating.trim();
    if (!name) return;
    try {
      setBusy(true);
      setError('');
      await window.electronAPI.groupCreate(name);
      setCreating('');
      await onChanged?.();
    } catch (e) {
      setError(String(e && e.message ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      setBusy(true);
      setError('');
      await window.electronAPI.groupDelete(deleting, deleteStrategy);
      setDeleting(null);
      await onChanged?.();
    } catch (e) {
      setError(String(e && e.message ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') action();
  };

  // Exclude virtual groups
  const realGroups = groups.filter(g => g && g.id);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="modal" style={{ width: '640px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px' }}>Manage Groups</h2>

        <div className="modal-section">
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#ccc', marginBottom: '8px' }}>Create New Group</label>
          <div className="row-gap">
            <input
              className="search-input"
              style={{ flex: 1 }}
              placeholder="Enter group name"
              value={creating}
              onChange={(e) => setCreating(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, createGroup)}
              disabled={busy}
            />
            <button
              className="btn-primary"
              onClick={createGroup}
              disabled={busy || !creating.trim()}
              style={{ minWidth: '80px' }}
            >
              {busy && creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>

        <div className="modal-section" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #333' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#ccc', marginBottom: '12px' }}>
            Your Groups ({realGroups.length})
          </label>
          <div style={{ maxHeight: 320, overflowY: 'auto', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '8px' }}>
            {realGroups.length === 0 && (
              <div style={{ color: '#999', fontSize: 14, padding: '20px', textAlign: 'center' }}>
                No groups yet. Create one above!
              </div>
            )}
            {realGroups.map(g => (
              <div
                key={g.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px',
                  background: isDirty(g) ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
                  borderRadius: '6px',
                  marginBottom: '4px',
                  border: isDirty(g) ? '1px solid rgba(102, 126, 234, 0.2)' : '1px solid transparent'
                }}
              >
                <input
                  className="search-input"
                  style={{ flex: 1, fontSize: '14px' }}
                  value={nameFor(g)}
                  onChange={(e) => setEditing(prev => ({ ...prev, [g.id]: e.target.value }))}
                  onKeyDown={(e) => handleKeyPress(e, () => saveRename(g))}
                  disabled={busy}
                />
                <span
                  style={{
                    color: '#999',
                    fontSize: '12px',
                    minWidth: '40px',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}
                >
                  {counts[g.id] || 0}
                </span>
                {isDirty(g) ? (
                  <>
                    <button
                      className="icon-btn icon-btn-success"
                      onClick={() => saveRename(g)}
                      disabled={busy}
                      title="Save changes"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 7L5.5 10.5L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      className="icon-btn icon-btn-cancel"
                      onClick={() => setEditing(prev => ({ ...prev, [g.id]: undefined }))}
                      disabled={busy}
                      title="Cancel"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </>
                ) : (
                  <button
                    className="icon-btn icon-btn-danger"
                    onClick={() => { setDeleting(g.id); setDeleteStrategy('ungroup'); }}
                    disabled={busy}
                    title="Delete group"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 3.5H13M5.5 1H8.5M5.5 6V11M8.5 6V11M2.5 3.5L3.5 13H10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {deleting && (
          <div className="modal-section" style={{ marginTop: 16, padding: 16, background: 'rgba(255, 107, 107, 0.05)', border: '1px solid rgba(255, 107, 107, 0.2)', borderRadius: 8 }}>
            <div style={{ color: '#ff6b6b', fontSize: '14px', fontWeight: 500, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 1L17 16H1L9 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M9 7V10M9 13V13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Delete Group?
            </div>
            <div style={{ color: '#ccc', fontSize: '13px', marginBottom: 12 }}>
              What should happen to the channels in this group?
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: '14px', color: '#ccc' }}>
              <input
                type="radio"
                checked={deleteStrategy==='ungroup'}
                onChange={() => setDeleteStrategy('ungroup')}
                style={{ cursor: 'pointer' }}
              />
              Move channels to Ungrouped
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '14px', color: '#ccc' }}>
              <input
                type="radio"
                checked={deleteStrategy==='delete-channels'}
                onChange={() => setDeleteStrategy('delete-channels')}
                style={{ cursor: 'pointer' }}
              />
              Delete all channels in this group
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255, 107, 107, 0.2)' }}>
              <button className="btn-secondary" onClick={() => setDeleting(null)} disabled={busy}>Cancel</button>
              <button
                className="btn-primary"
                onClick={confirmDelete}
                disabled={busy}
                style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)' }}
              >
                {busy ? 'Deleting...' : 'Delete Group'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="error-text" style={{
            padding: '12px',
            background: 'rgba(255, 107, 107, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            marginTop: '12px'
          }}>
            {error}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Close</button>
        </div>
      </div>
    </div>
  );
}

