import React, { useState, useEffect, useRef } from 'react';

export default function SearchInput({
  value,
  onChange,
  placeholder,
  className = ''
}) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef(null);

  // Sync with external value changes (like clear from parent)
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Small debounce
    timerRef.current = setTimeout(() => {
      onChange({ target: { value: newValue } });
    }, 300);
  };

  const handleClear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLocalValue('');
    onChange({ target: { value: '' } });
  };

  return (
    <div className="search-input-wrapper">
      <input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        className={className}
      />
      {localValue && (
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
