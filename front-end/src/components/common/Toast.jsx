import React from 'react';

export const Toast = ({ message, type = 'info', onClose }) => {
  if (!message) return null;

  const bgColors = {
    success: 'bg-primary text-on-primary',
    error: 'bg-error text-on-error',
    info: 'bg-inverse-surface text-white'
  };

  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info'
  };

  return (
    <div className="fixed bottom-20 right-6 z-50 animate-fade-in flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-label-bold text-sm border border-white/10">
      <div className={`p-1.5 rounded-full ${bgColors[type] || bgColors.info} flex items-center justify-center`}>
        <span className="material-symbols-outlined text-lg">{icons[type] || 'info'}</span>
      </div>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-2 text-white/70 hover:text-white">
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      )}
    </div>
  );
};
