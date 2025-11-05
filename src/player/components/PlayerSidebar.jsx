import React, { useState, useEffect } from 'react';
import ChannelListItem from './ChannelListItem';

export default function PlayerSidebar({ channels, currentIndex, favorites, showControls, onChannelSelect }) {
  const [isHovered, setIsHovered] = useState(false);

  // Hide sidebar when mouse leaves window
  useEffect(() => {
    const handleMouseLeave = (e) => {
      // Check if mouse left the window bounds
      if (e.clientY <= 0 || e.clientX <= 0 ||
          e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsHovered(false);
      }
    };

    document.addEventListener('mouseout', handleMouseLeave);
    return () => document.removeEventListener('mouseout', handleMouseLeave);
  }, []);

  if (!channels || channels.length === 0) {
    return null;
  }

  // Show sidebar only if controls are visible AND sidebar is hovered
  const isSidebarVisible = showControls && isHovered;

  return (
    <>
      <div
        className="sidebar-trigger"
        onMouseEnter={() => setIsHovered(true)}
      />
      <div
        className={`player-sidebar ${isSidebarVisible ? 'visible' : ''}`}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="player-sidebar-header">
          <h3>Channels ({channels.length})</h3>
        </div>
        <div className="player-sidebar-content">
          {channels.map((channel, index) => {
            const isFavorite = favorites?.some(f => f.url === channel.url) || false;
            return (
              <ChannelListItem
                key={`${channel.url}-${index}`}
                channel={channel}
                isActive={index === currentIndex}
                isFavorite={isFavorite}
                onClick={() => onChannelSelect(channel, index)}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
