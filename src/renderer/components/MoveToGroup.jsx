import React, { useState } from 'react';

// Move selected channels to group modal

export default function MoveToGroup({ open, onClose, groups, onConfirm }) {
  if (!open) return null;
  const [targetId, setTargetId] = useState('');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    try {
      setBusy(true);
      setError('');
      let gid = targetId || undefined;
      if (!gid && newName.trim()) {
        const g = await window.electronAPI.groupCreate(newName.trim());
        gid = g?.id;
      }
      await onConfirm(gid || null); // null => Ungrouped
      onClose();
    } catch (e) {
      setError(String(e && e.message ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="modal" style={{ width: '480px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px' }}>Move to Group</h2>

        <div className="modal-section">
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#ccc', marginBottom: '8px' }}>
            Select Destination
          </label>
          <select
            className="search-input"
            value={targetId}
            onChange={(e)=>setTargetId(e.target.value)}
            style={{ marginBottom: '12px' }}
            disabled={busy}
          >
            <option value="">Select existing group...</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>

          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#ccc', marginBottom: '8px' }}>
            Or Create New Group
          </label>
          <input
            className="search-input"
            value={newName}
            onChange={(e)=>setNewName(e.target.value)}
            placeholder="Enter new group name"
            disabled={busy}
          />
        </div>

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
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-primary" onClick={confirm} disabled={busy}>
            {busy ? 'Moving...' : 'Move Channels'}
          </button>
        </div>
      </div>
    </div>
  );
}

