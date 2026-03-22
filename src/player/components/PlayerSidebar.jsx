import React, { useEffect, useRef } from 'react';
import ChannelListItem from './ChannelListItem';

export default function PlayerSidebar({ channels, currentIndex, favorites, onChannelSelect, isOpen, onOpenChange }) {
  const activeItemRef = useRef(null);

  // Scroll active channel into view when sidebar opens
  useEffect(() => {
    if (isOpen && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'center' });
    }
  }, [isOpen]);

  // Hide sidebar when mouse leaves window
  useEffect(() => {
    const handleMouseLeave = (e) => {
      // Check if mouse left the window bounds
      if (e.clientY <= 0 || e.clientX <= 0 ||
          e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        onOpenChange(false);
      }
    };

    document.addEventListener('mouseout', handleMouseLeave);
    return () => document.removeEventListener('mouseout', handleMouseLeave);
  }, [onOpenChange]);

  if (!channels || channels.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className="sidebar-trigger"
        onMouseEnter={() => onOpenChange(true)}
      />
      <div
        className={`player-sidebar ${isOpen ? 'visible' : ''}`}
        onMouseLeave={() => onOpenChange(false)}
      >
        <div className="player-sidebar-header">
          <h3>Channels ({channels.length})</h3>
        </div>
        <div className="player-sidebar-content">
          {channels.map((channel, index) => {
            const isFavorite = favorites?.some(f => f.url === channel.url) || false;
            const isActive = index === currentIndex;
            return (
              <div key={`${channel.url}-${index}`} ref={isActive ? activeItemRef : null}>
                <ChannelListItem
                  channel={channel}
                  isActive={isActive}
                  isFavorite={isFavorite}
                  onClick={() => onChannelSelect(channel, index)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
