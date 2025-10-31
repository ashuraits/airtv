import React from 'react';

// Simple dropdown to filter by source

export default function SourceFilter({ sources, value, onChange }) {
  return (
    <div className="search-input-wrapper">
      <select
        className="search-input"
        value={value || 'all'}
        onChange={(e) => onChange(e.target.value === 'all' ? undefined : e.target.value)}
      >
        <option value="all">All sources</option>
        {sources.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  );
}
