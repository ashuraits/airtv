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
              className={`category-item ${selectedGroupId === g.id ? 'active' : ''}`}
              onClick={() => onSelectGroup(g.id)}
              onDoubleClick={() => {
                setRenameGroupId(g.id);
                setRenameValue(g.name);
              }}
              onContextMenu={(e) => handleContextMenu(e, g)}
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
