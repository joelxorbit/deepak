import React from 'react';
import { BookingForm } from '../../components/booking/BookingForm';

export const BookingPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in text-on-surface">
      <div className="text-center space-y-1.5 max-w-xl mx-auto">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          RESERVATION TERMINAL
        </span>
        <h1 className="font-bold text-2xl sm:text-4xl uppercase tracking-tight">RESERVE YOUR TURF SLOT</h1>
        <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
          Enter player details, select available consecutive 1-hour slots, and receive instant confirmation.
        </p>
      </div>

      <BookingForm />
    </div>
  );
};
