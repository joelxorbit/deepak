import React from 'react';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyles = 'font-label-bold transition-all duration-300 min-h-[44px] min-w-[44px] px-5 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm cursor-pointer select-none active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/40';
  
  const variants = {
    primary: 'bg-primary text-on-primary shadow-lg shadow-primary/25 hover:bg-primary-dark hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30',
    secondary: 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-variant/60 hover:scale-[1.01] hover:border-black/20 shadow-sm',
    outline: 'bg-surface-container-lowest border-2 border-primary text-primary hover:bg-primary/10 hover:scale-[1.01] shadow-sm',
    danger: 'bg-error text-on-error shadow-lg shadow-error/25 hover:scale-[1.02] hover:shadow-xl hover:shadow-error/30',
    dangerOutline: 'bg-surface-container-lowest border-2 border-error text-error hover:bg-error/10 hover:scale-[1.01]'
  };

  return (
    <button className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
};
