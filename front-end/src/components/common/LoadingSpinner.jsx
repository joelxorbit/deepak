import React from 'react';

export const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
      <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-black/5">
        <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="font-label-bold text-sm text-on-surface">Processing...</span>
      </div>
    </div>
  );
};
