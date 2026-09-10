import React from 'react';
import { createPortal } from 'react-dom';

export const LoadingSpinner = () => {
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-black/5">
        <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="font-semibold text-sm text-slate-900">Processing...</span>
      </div>
    </div>,
    document.body
  );
};
