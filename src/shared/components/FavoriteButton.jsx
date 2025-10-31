import React, { useEffect, useState } from 'react';
import './FavoriteButton.css';

// Universal favorite button with cool animation

export default function FavoriteButton({ isFavorite, onClick, className = '', size = 24 }) {
  const [justFavorited, setJustFavorited] = useState(false);
  const [isInitialRender, setIsInitialRender] = useState(true);

  useEffect(() => {
    // Skip animation on initial render
    if (isInitialRender) {
      setIsInitialRender(false);
      return;
    }

    // Only animate when becoming favorite
    if (isFavorite) {
      setJustFavorited(true);
      const timer = setTimeout(() => setJustFavorited(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isFavorite]);

  return (
    <button
      className={`favorite-button ${isFavorite ? 'is-favorite' : ''} ${justFavorited ? 'just-favorited' : ''} ${className}`}
      onClick={onClick}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="favorite-icon"
      >
        <path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          className="star-fill"
          fill="currentColor"
        />
        <path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          className="star-stroke"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {justFavorited && (
        <div className="favorite-particles">
          <div className="particle particle-1"></div>
          <div className="particle particle-2"></div>
          <div className="particle particle-3"></div>
          <div className="particle particle-4"></div>
        </div>
      )}
    </button>
  );
}

// Static icon version for menus/headers (no interaction)
export function FavoriteIcon({ filled = true, size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`favorite-icon-static ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        fill={filled ? '#ffd700' : 'none'}
        stroke="#ffd700"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
