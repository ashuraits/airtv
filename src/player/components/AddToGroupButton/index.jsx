import React, { useState, useEffect, useRef } from 'react';
import './AddToGroupButton.css';

export default function AddToGroupButton({ channel, pickerOpenRef }) {
  const [isOpen, setIsOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [currentGroupId, setCurrentGroupId] = useState(channel?.groupId ?? null);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [previousGroupId, setPreviousGroupId] = useState(null);
  const [moved, setMoved] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const closeTimerRef = useRef(null);

  // Sync groupId when channel changes (e.g. next/prev navigation)
  useEffect(() => {
    setCurrentGroupId(channel?.groupId ?? null);
  }, [channel?.id]);

  // On open: update picker ref, fetch groups, reset state; focus input
  useEffect(() => {
    if (pickerOpenRef) pickerOpenRef.current = isOpen;

    if (!isOpen) return;

    setMoved(false);
    setNewGroupName('');
    window.electronAPI.groupsList().then(setGroups).catch(console.error);

    const focusTimer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  // Cleanup close timer on unmount
  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  if (!channel?.id) return null;

  const scheduleClose = () => {
    closeTimerRef.current = setTimeout(() => setIsOpen(false), 2500);
  };

  const handleMove = async (groupId) => {
    try {
      setPreviousGroupId(currentGroupId);
      await window.electronAPI.channelsMove([channel.id], groupId);
      setCurrentGroupId(groupId);
      setMoved(true);
      scheduleClose();
    } catch (e) {
      console.error('Failed to move channel:', e);
    }
  };

  const handleUndo = async () => {
    try {
      clearTimeout(closeTimerRef.current);
      await window.electronAPI.channelsMove([channel.id], previousGroupId);
      setCurrentGroupId(previousGroupId);
      setMoved(false);
    } catch (e) {
      console.error('Failed to undo move:', e);
    }
  };

  const handleCreate = async () => {
    const name = newGroupName.trim();
    if (!name || isCreating) return;
    setIsCreating(true);
    try {
      const group = await window.electronAPI.groupCreate(name);
      setPreviousGroupId(currentGroupId);
      await window.electronAPI.channelsMove([channel.id], group.id);
      setCurrentGroupId(group.id);
      setMoved(true);
      scheduleClose();
    } catch (e) {
      console.error('Failed to create group and move channel:', e);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="atg-wrapper" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`add-to-group-btn ${isOpen ? 'active' : ''}`}
        title="Move to group"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 4.5C1 3.67 1.67 3 2.5 3H6L7.5 5H13.5C14.33 5 15 5.67 15 6.5V12.5C15 13.33 14.33 14 13.5 14H2.5C1.67 14 1 13.33 1 12.5V4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M8 8V12M6 10H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="button-label">Move to Group</span>
      </button>

      {isOpen && (
        <div className="atg-popup" onClick={(e) => e.stopPropagation()}>
          {moved ? (
            <div className="atg-success">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Moved
              <div className="atg-undo-btn" onClick={handleUndo}>Undo</div>
            </div>
          ) : (
            <>
              <div className="atg-header">Move to group</div>
              <div className="atg-list">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className={`atg-item ${currentGroupId === g.id ? 'atg-item-current' : ''}`}
                    onClick={() => handleMove(g.id)}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M1 3.5C1 2.95 1.45 2.5 2 2.5H4.5L5.8 4H11C11.55 4 12 4.45 12 5V10.5C12 11.05 11.55 11.5 11 11.5H2C1.45 11.5 1 11.05 1 10.5V3.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                    </svg>
                    {g.name}
                    {currentGroupId === g.id && <span className="atg-current-mark">current</span>}
                  </div>
                ))}
                <div className="atg-item atg-item-ungrouped" onClick={() => handleMove(null)}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <rect x="1" y="3.5" width="11" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 1.5"/>
                  </svg>
                  Ungrouped
                </div>
              </div>
              <div className="atg-divider" />
              <div className="atg-new">
                <input
                  ref={inputRef}
                  className="atg-input"
                  placeholder="New group name..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') setIsOpen(false);
                    e.stopPropagation();
                  }}
                />
                <button
                  className="atg-create-btn"
                  onClick={handleCreate}
                  disabled={!newGroupName.trim() || isCreating}
                  title="Create and move"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 2V11M2 6.5H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
