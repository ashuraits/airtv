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
  onPlayChannel
}) {
  return (
    <main className="main-content">
      <div className="content-header">
        <div className="header-top">
          <h2>{displayCategory}</h2>
          {!globalSearch && (
            <SearchInput
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Search in category..."
              className="category-search-input"
            />
          )}
        </div>
        <p className="channel-count">
          {filteredChannels.length} {filteredChannels.length === 1 ? 'channel' : 'channels'}
        </p>
      </div>

      <div className="channels-grid">
        {filteredChannels.length === 0 ? (
          <div className="no-results">
            <p>No channels found</p>
          </div>
        ) : (
          filteredChannels.map((channel, index) => {
            const isFavorite = favorites.find(f => f.url === channel.url);
            return (
              <ChannelCard
                key={`${channel.name}-${index}`}
                channel={channel}
                isFavorite={isFavorite}
                onToggleFavorite={onToggleFavorite}
                onPlay={onPlayChannel}
              />
            );
          })
        )}
      </div>
    </main>
  );
}
