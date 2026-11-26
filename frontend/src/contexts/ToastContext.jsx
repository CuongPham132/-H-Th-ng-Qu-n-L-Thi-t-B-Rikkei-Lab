import React, { createContext, useContext, useState, useCallback } from 'react';
import Icon from '../components/common/Icon.jsx';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const success = useCallback((msg, duration) => showToast(msg, 'success', duration), [showToast]);
  const error = useCallback((msg, duration) => showToast(msg, 'error', duration), [showToast]);
  const info = useCallback((msg, duration) => showToast(msg, 'info', duration), [showToast]);
  const warning = useCallback((msg, duration) => showToast(msg, 'warning', duration), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning, removeToast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item toast-${t.type}`} role="status">
            <span className="toast-icon">
              {t.type === 'success' && <Icon name="check" size={16} />}
              {t.type === 'error' && <Icon name="alert" size={16} />}
              {t.type === 'warning' && <Icon name="clock" size={16} />}
              {t.type === 'info' && <Icon name="info" size={16} />}
            </span>
            <span className="toast-message">{t.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(t.id)}
              aria-label="Đóng"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback if outside provider
    return {
      showToast: (msg) => console.log('[Toast fallback]:', msg),
      success: (msg) => console.log('[Toast success]:', msg),
      error: (msg) => console.error('[Toast error]:', msg),
      info: (msg) => console.info('[Toast info]:', msg),
      warning: (msg) => console.warn('[Toast warning]:', msg),
      removeToast: () => {},
    };
  }
  return ctx;
}

export default ToastContext;
