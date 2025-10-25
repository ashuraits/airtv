import React from 'react';
import SearchInput from '../../shared/components/SearchInput';

export default function Sidebar({
  playlist,
  favorites,
  globalSearch,
  setGlobalSearch,
  selectedCategory,
  setSelectedCategory,
  onLoadPlaylist
}) {
  const categories = ['⭐ Favorites', ...Object.keys(playlist.categories)];

  const handleOpenSettings = async () => {
    await window.electronAPI.openSettings();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="app-title">AirTV</h1>
        <div className="header-actions">
          <button onClick={handleOpenSettings} className="settings-btn" title="Settings">
            ⚙
          </button>
          <button onClick={onLoadPlaylist} className="reload-btn" title="Load new playlist">
            ↻
          </button>
        </div>
      </div>

      <div className="search-box">
        <SearchInput
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          placeholder="Search all channels..."
          className="search-input"
        />
      </div>

      <div className="stats">
        <span>{playlist.totalCategories} categories</span>
        <span>•</span>
        <span>{playlist.totalChannels} channels</span>
      </div>

      <div className="categories">
        <div className="category-label">Categories</div>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`category-item ${selectedCategory === category ? 'active' : ''}`}
          >
            <span className="category-name">{category}</span>
            <span className="category-count">
              {category === '⭐ Favorites' ? favorites.length : playlist.categories[category]?.length || 0}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
