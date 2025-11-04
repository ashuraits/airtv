import React from 'react';
import ChannelCard from '../../shared/components/ChannelCard';
import SearchInput from '../../shared/components/SearchInput';

export default function MainContent({
  displayCategory,
  globalSearch,
  categorySearch,
  setCategorySearch,
  filteredChannels,
  favorites,
  onToggleFavorite,
  onPlayChannel,
  selectedIds = [],
  onToggleSelect,
  onMoveRequested,
  onUngroupRequested,
  onClearSelection,
  onSelectAll,
  onDeleteSelected,
  onRemoveFromFavorites,
  isFavoritesView = false,
}) {
  const [visibleCount, setVisibleCount] = React.useState(200);
  const selectionCount = selectedIds.length;

  // Reset visible count when filters change
  React.useEffect(() => {
    setVisibleCount(200);
  }, [displayCategory, globalSearch, categorySearch]);
  return (
    <main className="main-content">
      <div className="content-header">
        <div className="header-top">
          <h2>{displayCategory}</h2>
          {!globalSearch && (
            <SearchInput
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Search in group..."
              className="category-search-input"
            />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minHeight: '38px' }}>
          <p className="channel-count" style={{ lineHeight: '38px' }}>
            {filteredChannels.length} {filteredChannels.length === 1 ? 'channel' : 'channels'}
          </p>
          <div style={{ width: '1px', height: '24px', background: '#333' }} />
          <div className="selection-toolbar">
            {selectionCount > 0 ? (
              <>
                <span style={{ color: '#667eea', fontSize: '14px', fontWeight: 500, lineHeight: '38px' }}>
                  {selectionCount} selected
                </span>
                {isFavoritesView ? (
                  <button
                    className="btn-secondary"
                    onClick={onRemoveFromFavorites}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      background: 'rgba(251, 191, 36, 0.1)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      color: '#fbbf24'
                    }}
                  >
                    Remove from Favorites
                  </button>
                ) : (
                  <>
                    <button className="btn-primary" onClick={onMoveRequested} style={{ padding: '6px 12px', fontSize: '13px' }}>
                      Move
                    </button>
                    <button className="btn-secondary" onClick={onUngroupRequested} style={{ padding: '6px 12px', fontSize: '13px' }}>
                      Ungroup
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={onDeleteSelected}
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444'
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
                <button className="btn-secondary" onClick={onClearSelection} style={{ padding: '6px 12px', fontSize: '13px' }}>
                  Clear
                </button>
              </>
            ) : (
              <button className="btn-secondary" onClick={onSelectAll} style={{ padding: '6px 12px', fontSize: '13px' }}>
                Select All
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="channels-grid">
        {filteredChannels.length === 0 ? (
          <div className="no-results">
            <p>No channels found</p>
          </div>
        ) : (
          <>
            {filteredChannels.slice(0, visibleCount).map((channel, index) => {
              const isFavorite = favorites.find(f => f.url === channel.url);
              const selected = selectedIds.includes(channel.id);
              const srcInfo = channel.sourceInfo || {};
              return (
                <ChannelCard
                  key={`${channel.name}-${index}`}
                  channel={channel}
                  isFavorite={isFavorite}
                  onToggleFavorite={onToggleFavorite}
                  // ensure player receives exactly this list
                  onPlay={() => onPlayChannel(channel, filteredChannels)}
                  selectable={true}
                  selected={selected}
                  onToggleSelect={onToggleSelect}
                  sourceLabel={srcInfo.label}
                  sourceTitle={srcInfo.title}
                />
              );
            })}
            {visibleCount < filteredChannels.length && (
              <div style={{
                gridColumn: '1 / -1',
                display: 'flex',
                justifyContent: 'center',
                padding: '20px'
              }}>
                <button
                  className="btn-secondary"
                  onClick={() => setVisibleCount(prev => prev + 200)}
                  style={{ padding: '10px 24px' }}
                >
                  Load More ({filteredChannels.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
