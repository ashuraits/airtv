import React from 'react';
import { FavoriteIcon } from '../../shared/components/FavoriteButton';

export default function ChannelListItem({ channel, isActive, isFavorite, onClick }) {
  return (
    <div
      className={`channel-list-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      {channel.logo && (
        <img
          src={channel.logo}
          alt={channel.name}
          className="channel-list-logo"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      )}
      <div className="channel-list-name">{channel.name}</div>
      {isFavorite && (
        <span className="channel-list-favorite">
          <FavoriteIcon filled={true} size={14} />
        </span>
      )}
    </div>
  );
}
