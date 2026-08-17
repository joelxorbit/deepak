import React, { memo } from 'react';
import { TIME_SLOTS, isPastSlotForToday } from '../../utils/bookingUtils';

export const TimeSlotPicker = memo(({ bookedSlots = [], selectedSlots = [], handleSlotToggle, bookingDate }) => {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface">
          Select Time Slots * <span className="text-on-surface-variant font-normal lowercase">(consecutive hours)</span>
        </label>
        {selectedSlots.length > 0 && (
          <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
            {selectedSlots.length} slot(s) selected
          </span>
        )}
      </div>

      {/* Legend Indicators */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-normal text-on-surface-variant pb-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-white border border-emerald-400"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-emerald-600"></span>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-200"></span>
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-200"></span>
          <span>Passed</span>
        </div>
      </div>

      {/* Controlled Internal Slot List Scroll Only (max-h-52) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-2 border border-black/10 rounded-2xl bg-surface-container-lowest">
        {TIME_SLOTS.map((slot) => {
          const isBooked = bookedSlots.includes(slot);
          const isPast = isPastSlotForToday(slot, bookingDate);
          const isDisabled = isBooked || isPast;
          const isSelected = selectedSlots.includes(slot);

          return (
            <button
              key={slot}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSlotToggle(slot)}
              className={`py-2 px-2.5 rounded-xl text-xs transition-all flex flex-col items-center justify-center gap-0.5 border min-h-[46px] ${
                isBooked
                  ? 'bg-rose-50 text-rose-800 border-rose-200 cursor-not-allowed opacity-75'
                  : isPast
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through opacity-60'
                  : isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-sm scale-[1.01]'
                  : 'bg-white text-on-surface border-black/10 hover:border-emerald-500 hover:bg-emerald-50/50'
              }`}
            >
              <span className="font-mono text-[11px] font-medium">{slot}</span>
              {isBooked ? (
                <span className="text-[9px] uppercase font-semibold text-rose-600">Booked</span>
              ) : isPast ? (
                <span className="text-[9px] uppercase font-semibold text-slate-400">Passed</span>
              ) : isSelected ? (
                <span className="text-[9px] uppercase font-semibold text-emerald-100 flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[11px]">check_circle</span> Selected
                </span>
              ) : (
                <span className="text-[9px] uppercase font-medium text-emerald-600">Available</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

TimeSlotPicker.displayName = 'TimeSlotPicker';
