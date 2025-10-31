import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Simple toast system


const ToastContext = createContext({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'info', timeout = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type, removing: false }]);
    if (timeout) {
      setTimeout(() => {
        // Start fade-out animation
        setToasts((t) => t.map(x => x.id === id ? { ...x, removing: true } : x));
        // Remove after animation
        setTimeout(() => {
          setToasts((t) => t.filter(x => x.id !== id));
        }, 300);
      }, timeout);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 9999,
        pointerEvents: 'none'
      }}>
        {toasts.map(t => {
          const colors = t.type === 'error'
            ? { bg: 'rgba(220, 38, 38, 0.15)', border: 'rgba(239, 68, 68, 0.6)', glow: 'rgba(239, 68, 68, 0.4)' }
            : t.type === 'success'
            ? { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(74, 222, 128, 0.6)', glow: 'rgba(74, 222, 128, 0.4)' }
            : { bg: 'rgba(102, 126, 234, 0.15)', border: 'rgba(139, 92, 246, 0.6)', glow: 'rgba(139, 92, 246, 0.4)' };

          return (
            <div
              key={t.id}
              style={{
                background: `linear-gradient(135deg, ${colors.bg}, ${colors.bg.replace('0.15', '0.25')})`,
                backdropFilter: 'blur(20px) saturate(180%)',
                border: `1px solid ${colors.border}`,
                boxShadow: `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px ${colors.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
                color: '#fff',
                padding: '14px 18px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
                minWidth: '280px',
                maxWidth: '420px',
                animation: t.removing ? 'slideOut 0.3s ease-in forwards' : 'slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                pointerEvents: 'auto',
                transform: 'translateZ(0)',
                willChange: 'transform, opacity'
              }}
            >
              {t.message}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(120%) translateZ(0);
            opacity: 0;
          }
          to {
            transform: translateX(0) translateZ(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0) translateZ(0);
            opacity: 1;
          }
          to {
            transform: translateX(120%) translateZ(0);
            opacity: 0;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

