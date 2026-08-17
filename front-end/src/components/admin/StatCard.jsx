import React, { memo } from 'react';

export const StatCard = memo(({ title, count, subtitle, icon, iconBg = 'bg-primary/10', iconColor = 'text-primary' }) => {
  return (
    <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
      {/* Decorative subtle ambient gradient fill */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none"></div>

      <div className="flex justify-between items-start mb-4 relative z-10">
        <span className="text-xs font-label-bold text-on-surface-variant uppercase tracking-wider">{title}</span>
        <div className={`w-11 h-11 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300`}>
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
      </div>

      <div className="relative z-10">
        <p className="font-display-lg text-3xl md:text-4xl text-on-surface font-extrabold tracking-tight">{count}</p>
        {subtitle && <span className="text-xs font-medium text-on-surface-variant/80 mt-2 block">{subtitle}</span>}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';
