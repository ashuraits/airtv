import React, { useState } from 'react';
import { FavoriteIcon } from '../../shared/components/FavoriteButton';
import ContextMenu from './ContextMenu';

// Groups list with counts; includes Favorites and Ungrouped

export default function GroupsTree({
  groups,
  counts,
  selectedGroupId,
  onSelectGroup,
  favoritesCount,
  totalChannels,
  onRenameGroup,
  onDeleteGroup
}) {
  const [contextMenu, setContextMenu] = useState(null);
  const [renameGroupId, setRenameGroupId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [draggedGroupId, setDraggedGroupId] = useState(null);
  const [dragOverGroupId, setDragOverGroupId] = useState(null);

  const handleContextMenu = (e, group) => {
    e.preventDefault();
    e.stopPropagation();

    // Only show context menu for groups, not empty space
    if (!group) return;

    const channelCount = counts[group.id] || 0;

    const items = [
      {
        label: 'Rename',
        onClick: () => {
          setRenameGroupId(group.id);
          setRenameValue(group.name);
        }
      },
      { divider: true },
      {
        label: channelCount > 0 ? `Delete (${channelCount} channels)` : 'Delete',
        danger: true,
        onClick: () => handleDelete(group, channelCount)
      },
      ...(channelCount > 0
        ? [
            {
              label: 'Ungroup channels',
              onClick: () => onDeleteGroup(group.id, 'ungroup')
            }
          ]
        : [])
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const handleDelete = (group, channelCount) => {
    if (channelCount === 0) {
      if (confirm(`Delete group "${group.name}"?`)) {
        onDeleteGroup(group.id, 'delete');
      }
    } else {
      if (confirm(`Delete group "${group.name}" and ${channelCount} channel(s)?`)) {
        onDeleteGroup(group.id, 'delete');
      }
    }
  };

  const handleRename = async (groupId) => {
    if (renameValue.trim() && renameValue !== groups.find(g => g.id === groupId)?.name) {
      await onRenameGroup(groupId, renameValue.trim());
    }
    setRenameGroupId(null);
    setRenameValue('');
  };

  const handleKeyDown = (e, groupId) => {
    if (e.key === 'Enter') {
      handleRename(groupId);
    } else if (e.key === 'Escape') {
      setRenameGroupId(null);
      setRenameValue('');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, groupId) => {
    setDraggedGroupId(groupId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', groupId);
  };

  const handleDragOver = (e, groupId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedGroupId && draggedGroupId !== groupId) {
      // Determine if we're hovering over top or bottom half
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const isAbove = e.clientY < midpoint;
      
      setDragOverGroupId({ id: groupId, position: isAbove ? 'above' : 'below' });
    }
  };

  const handleDragLeave = () => {
    setDragOverGroupId(null);
  };

  const handleDrop = async (e, targetGroupId) => {
    e.preventDefault();
    if (!draggedGroupId || !dragOverGroupId || draggedGroupId === targetGroupId) {
      setDraggedGroupId(null);
      setDragOverGroupId(null);
      return;
    }

    // Reorder groups
    const draggedIndex = groups.findIndex(g => g.id === draggedGroupId);
    const targetIndex = groups.findIndex(g => g.id === targetGroupId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedGroupId(null);
      setDragOverGroupId(null);
      return;
    }

    // Create new order
    const newGroups = [...groups];
    const [removed] = newGroups.splice(draggedIndex, 1);
    
    // Insert based on position (above or below)
    let insertIndex = targetIndex;
    if (dragOverGroupId.position === 'below') {
      insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
      insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }
    
    newGroups.splice(insertIndex, 0, removed);

    // Send new order to backend
    const newOrderIds = newGroups.map(g => g.id);
    await window.electronAPI.groupReorder(newOrderIds);

    setDraggedGroupId(null);
    setDragOverGroupId(null);
  };

  const handleDragEnd = () => {
    setDraggedGroupId(null);
    setDragOverGroupId(null);
  };

  return (
    <div className="categories">
      <div className="category-label">
        <span>Groups</span>
        {totalChannels !== undefined && (
          <span className="category-label-count">{totalChannels}</span>
        )}
      </div>
      <button
        className={`category-item ${selectedGroupId === '__favorites__' ? 'active' : ''}`}
        onClick={() => onSelectGroup('__favorites__')}
      >
        <span className="category-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FavoriteIcon filled={true} size={16} /> Favorites
        </span>
        <span className="category-count">{favoritesCount || 0}</span>
      </button>
      {groups.map((g) => (
        <div key={g.id}>
          {renameGroupId === g.id ? (
            <input
              type="text"
              className="category-item active"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => handleRename(g.id)}
              onKeyDown={(e) => handleKeyDown(e, g.id)}
              autoFocus
              style={{
                width: '100%',
                background: 'rgba(102, 126, 234, 0.1)',
                border: '1px solid #667eea',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          ) : (
            <button
              className={`category-item ${selectedGroupId === g.id ? 'active' : ''} ${draggedGroupId === g.id ? 'dragging' : ''} ${dragOverGroupId?.id === g.id ? (dragOverGroupId.position === 'above' ? 'drag-over-above' : 'drag-over-below') : ''}`}
              onClick={() => onSelectGroup(g.id)}
              onDoubleClick={() => {
                setRenameGroupId(g.id);
                setRenameValue(g.name);
              }}
              onContextMenu={(e) => handleContextMenu(e, g)}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, g.id)}
              onDragOver={(e) => handleDragOver(e, g.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, g.id)}
              onDragEnd={handleDragEnd}
            >
              <span className="category-name">{g.name}</span>
              <span className="category-count">{counts[g.id] || 0}</span>
            </button>
          )}
        </div>
      ))}
      <button
        className={`category-item ${selectedGroupId === null ? 'active' : ''}`}
        onClick={() => onSelectGroup(null)}
      >
        <span className="category-name">Ungrouped</span>
        <span className="category-count">{counts['__ungrouped__'] || 0}</span>
      </button>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
