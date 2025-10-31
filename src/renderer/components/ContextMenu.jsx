import React, { useEffect, useRef, useState } from 'react';

export default function ContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = x;
      let top = y;

      // Adjust horizontal position if menu goes off-screen
      if (left + menuRect.width > viewportWidth) {
        left = viewportWidth - menuRect.width - 8;
      }

      // Adjust vertical position if menu goes off-screen
      if (top + menuRect.height > viewportHeight) {
        top = viewportHeight - menuRect.height - 8;
      }

      setPosition({ left, top });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleContextMenu = (e) => {
      e.preventDefault();
      onClose();
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [onClose]);

  if (!items || items.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: position.left,
        top: position.top,
        zIndex: 1000
      }}
    >
      {items.map((item, idx) => {
        if (item.divider) {
          return <div key={idx} className="context-menu-divider" />;
        }
        return (
          <button
            key={idx}
            className={`context-menu-item ${item.danger ? 'danger' : ''}`}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            disabled={item.disabled}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
