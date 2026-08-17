import React from 'react';

export const Input = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-label-bold font-label-bold text-on-surface mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-error font-label-bold mt-1">{error}</p>}
    </div>
  );
};
