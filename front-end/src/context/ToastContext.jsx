import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4"
      >
        {toasts.map((toast) => {
          const typeStyles = {
            success: 'bg-emerald-800 text-white border-emerald-600',
            error: 'bg-rose-900 text-white border-rose-700',
            warning: 'bg-amber-900 text-white border-amber-700',
            info: 'bg-surface-dark text-white border-white/20'
          };

          const typeIcons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
          };

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto p-4 rounded-2xl border shadow-xl flex items-center justify-between gap-3 animate-slide-up transition-all duration-300 ${
                typeStyles[toast.type] || typeStyles.info
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl shrink-0">
                  {typeIcons[toast.type] || typeIcons.info}
                </span>
                <p className="text-sm font-label-bold leading-tight">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Close notification"
                className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 shrink-0"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
