import React from 'react';

export default function Loading() {
  return (
    <div className="loading">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading AirTV...</p>
      </div>
    </div>
  );
}
