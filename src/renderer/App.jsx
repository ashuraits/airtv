import React, { useState, useEffect } from 'react';
import './App.css';
import { Loading, EmptyState, Sidebar, MainContent } from './components';

function App() {
  const [playlist, setPlaylist] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    loadStoredPlaylist();
  }, []);

  useEffect(() => {
    if (playlist && !selectedCategory) {
      // Default to Favorites if available, otherwise first category
      setSelectedCategory('⭐ Favorites');
    }
  }, [playlist]);

  const loadStoredPlaylist = async () => {
    try {
      const data = await window.electronAPI.getPlaylist();
      if (data) {
        setPlaylist(data);
      }
      const favs = await window.electronAPI.getFavorites();
      setFavorites(favs);
    } catch (error) {
      console.error('Error loading stored playlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (channel) => {
    const isFav = favorites.find(f => f.url === channel.url);
    if (isFav) {
      const updated = await window.electronAPI.removeFavorite(channel.url);
      setFavorites(updated);
    } else {
      const updated = await window.electronAPI.addFavorite(channel);
      setFavorites(updated);
    }
  };

  const handleLoadPlaylist = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.loadPlaylist();
      if (data) {
        setPlaylist(data);
        // Default to Favorites
        setSelectedCategory('⭐ Favorites');
      }
    } catch (error) {
      console.error('Error loading playlist:', error);
      alert('Failed to load playlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayChannel = async (channel) => {
    try {
      // Get current channel list and index
      const channelList = getDisplayChannels();
      const currentIndex = channelList.findIndex(c => c.url === channel.url);
      const isFavorite = favorites.some(f => f.url === channel.url);

      await window.electronAPI.playChannel({
        channel,
        channelList,
        currentIndex: currentIndex >= 0 ? currentIndex : 0,
        isFavorite
      });
    } catch (error) {
      console.error('Error playing channel:', error);
      alert('Failed to open player window.');
    }
  };

  const getDisplayChannels = () => {
    // Global search overrides category
    if (globalSearch) {
      return getGlobalSearchResults();
    }

    if (selectedCategory === '⭐ Favorites') {
      if (!categorySearch) return favorites;
      return favorites.filter(channel =>
        channel.name.toLowerCase().includes(categorySearch.toLowerCase())
      );
    }
    return getFilteredChannels();
  };

  const getFilteredChannels = () => {
    if (!playlist || !selectedCategory) return [];

    const channels = playlist.categories[selectedCategory] || [];

    if (!categorySearch) return channels;

    return channels.filter(channel =>
      channel.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  };

  const getGlobalSearchResults = () => {
    if (!playlist) return [];

    const allChannels = [];
    Object.entries(playlist.categories).forEach(([category, channels]) => {
      channels.forEach(channel => {
        allChannels.push({ ...channel, category });
      });
    });

    if (!globalSearch) return [];

    return allChannels.filter(channel =>
      channel.name.toLowerCase().includes(globalSearch.toLowerCase())
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (!playlist) {
    return <EmptyState onLoadPlaylist={handleLoadPlaylist} />;
  }

  const filteredChannels = getDisplayChannels();
  const displayCategory = globalSearch ? `Search: "${globalSearch}"` : (selectedCategory || 'All Channels');

  return (
    <div className="app">
      <Sidebar
        playlist={playlist}
        favorites={favorites}
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onLoadPlaylist={handleLoadPlaylist}
      />
      <MainContent
        displayCategory={displayCategory}
        globalSearch={globalSearch}
        categorySearch={categorySearch}
        setCategorySearch={setCategorySearch}
        filteredChannels={filteredChannels}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onPlayChannel={handlePlayChannel}
      />
    </div>
  );
}

export default App;
