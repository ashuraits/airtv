import React, { useState, useEffect } from 'react';
import VideoPlayer from './components/VideoPlayer';
import PlayerControls from './components/PlayerControls';
import PlayerSidebar from './components/PlayerSidebar';

export default function PlayerApp() {
  const [channelData, setChannelData] = useState(null);
  const [channelList, setChannelList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPinned, setIsPinned] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [videoRef, setVideoRef] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const inactivityTimerRef = React.useRef(null);

  useEffect(() => {
    // Parse channel data from query params
    const urlParams = new URLSearchParams(window.location.search);
    const data = JSON.parse(decodeURIComponent(urlParams.get('data') || '{}'));

    if (data.channel) {
      setChannelData(data.channel);
      setChannelList(data.channelList || [data.channel]);
      setCurrentIndex(data.currentIndex || 0);
      setIsFavorite(data.isFavorite || false);
      setVolume(data.volume !== undefined ? data.volume : 1.0);
      setIsMuted(data.muted !== undefined ? data.muted : false);
    }

    // Load favorites
    loadFavorites();
  }, []);

  // Reset inactivity timer
  const resetInactivityTimer = React.useCallback(() => {
    setShowControls(true);

    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Set new timer to hide controls after 3 seconds
    inactivityTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      resetInactivityTimer();
    };

    const handleClick = (e) => {
      // Don't hide if clicking on controls or sidebar
      const isControlClick = e.target.closest('.player-controls') ||
                            e.target.closest('.player-sidebar') ||
                            e.target.closest('.sidebar-trigger') ||
                            e.target.closest('.volume-control-wrapper');

      if (isControlClick) {
        // Reset timer on control clicks
        resetInactivityTimer();
        return;
      }

      // Hide controls immediately on video area click
      setShowControls(false);

      // Clear any existing timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);

    // Initial timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);

  const loadFavorites = async () => {
    try {
      const favs = await window.electronAPI.getFavorites();
      setFavorites(favs);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const handlePlayPause = () => {
    // If buffer stalled, manually retry
    if (hasError) {
      window.location.reload();
      return;
    }

    if (videoRef) {
      if (isPlaying) {
        videoRef.pause();
      } else {
        videoRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const checkIsFavorite = async (channel) => {
    try {
      const favorites = await window.electronAPI.getFavorites();
      return favorites.some(f => f.url === channel.url);
    } catch (error) {
      console.error('Error checking favorite:', error);
      return false;
    }
  };

  const updateURL = (index, channel, isFav, vol, mut) => {
    const urlParams = new URLSearchParams(window.location.search);
    const data = JSON.parse(decodeURIComponent(urlParams.get('data') || '{}'));

    data.currentIndex = index;
    data.channel = channel;
    data.isFavorite = isFav;
    if (vol !== undefined) data.volume = vol;
    if (mut !== undefined) data.muted = mut;

    const newURL = `${window.location.pathname}?data=${encodeURIComponent(JSON.stringify(data))}`;
    window.history.replaceState({}, '', newURL);
  };

  const handleNext = async () => {
    if (currentIndex < channelList.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextChannel = channelList[nextIndex];
      setCurrentIndex(nextIndex);
      setChannelData(nextChannel);
      setHasError(false); // Reset error state
      const isFav = await checkIsFavorite(nextChannel);
      setIsFavorite(isFav);
      updateURL(nextIndex, nextChannel, isFav, volume, isMuted);
    }
  };

  const handlePrev = async () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevChannel = channelList[prevIndex];
      setCurrentIndex(prevIndex);
      setChannelData(prevChannel);
      setHasError(false); // Reset error state
      const isFav = await checkIsFavorite(prevChannel);
      setIsFavorite(isFav);
      updateURL(prevIndex, prevChannel, isFav, volume, isMuted);
    }
  };

  const handleChannelSelect = async (channel, index) => {
    setCurrentIndex(index);
    setChannelData(channel);
    setHasError(false); // Reset error state
    const isFav = await checkIsFavorite(channel);
    setIsFavorite(isFav);
    updateURL(index, channel, isFav, volume, isMuted);
  };

  const handleTogglePin = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    window.electronAPI.togglePin(newPinned);
  };

  const handleToggleFavorite = async () => {
    try {
      if (isFavorite) {
        await window.electronAPI.removeFavorite(channelData.url);
        setIsFavorite(false);
      } else {
        await window.electronAPI.addFavorite(channelData);
        setIsFavorite(true);
      }
      // Reload favorites to update sidebar
      await loadFavorites();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (videoRef) {
      videoRef.volume = newVolume;
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
        videoRef.muted = false;
        updateURL(currentIndex, channelData, isFavorite, newVolume, false);
        window.electronAPI.saveVolumeSettings(newVolume, false);
      } else {
        updateURL(currentIndex, channelData, isFavorite, newVolume, isMuted);
        window.electronAPI.saveVolumeSettings(newVolume, isMuted);
      }
    }
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef) {
      videoRef.muted = newMuted;
    }
    updateURL(currentIndex, channelData, isFavorite, volume, newMuted);
    window.electronAPI.saveVolumeSettings(volume, newMuted);
  };

  useEffect(() => {
    if (videoRef) {
      videoRef.volume = volume;
      videoRef.muted = isMuted;
    }
  }, [videoRef, volume, isMuted]);

  const handleClose = () => {
    window.electronAPI.closePlayer();
  };

  if (!channelData) {
    return (
      <div style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="player-container">
      <VideoPlayer
        channel={channelData}
        onVideoRef={setVideoRef}
        onPlayStateChange={setIsPlaying}
        onError={setHasError}
      />
      <PlayerControls
        channelName={channelData.name}
        isPlaying={isPlaying}
        isPinned={isPinned}
        isFavorite={isFavorite}
        showControls={showControls}
        volume={volume}
        isMuted={isMuted}
        hasError={hasError}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrev={handlePrev}
        onTogglePin={handleTogglePin}
        onToggleFavorite={handleToggleFavorite}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onClose={handleClose}
        hasNext={currentIndex < channelList.length - 1}
        hasPrev={currentIndex > 0}
      />
      <PlayerSidebar
        channels={channelList}
        currentIndex={currentIndex}
        favorites={favorites}
        showControls={showControls}
        onChannelSelect={handleChannelSelect}
      />
    </div>
  );
}
