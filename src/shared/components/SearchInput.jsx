import React from 'react';

export default function SearchInput({
  value,
  onChange,
  placeholder,
  className = ''
}) {
  const handleClear = () => {
    onChange({ target: { value: '' } });
  };

  return (
    <div className="search-input-wrapper">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={className}
      />
      {value && (
        <button
          onClick={handleClear}
          className="search-clear-btn"
          title="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}
