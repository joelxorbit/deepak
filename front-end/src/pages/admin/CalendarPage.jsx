import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';

export const CalendarPage = () => {
  const { bookings } = useBooking();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('Day');

  const filteredBookings = bookings.filter((b) => {
    const bDate = typeof b.date === 'string' ? b.date.split('T')[0] : b.dateStr;
    return bDate === selectedDate;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-3xl font-extrabold text-on-surface">Interactive Turf Calendar</h1>
          <p className="text-on-surface-variant font-body-md text-sm mt-1">
            Visual reservation schedule and time-slot availability overview.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-black/10 rounded-2xl px-4 py-2.5 text-sm font-label-bold focus:outline-none focus:border-primary shadow-sm"
          />
          <div className="flex rounded-2xl border border-black/10 bg-white p-1 shadow-sm">
            {['Day', 'Week', 'Month'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-label-bold transition-all ${
                  viewMode === mode ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-black/5 pb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">calendar_today</span>
            <h2 className="font-bold text-lg text-on-surface">
              Schedule for {selectedDate} ({filteredBookings.length} booking{filteredBookings.length === 1 ? '' : 's'})
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs font-label-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Confirmed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span> Pending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span> Cancelled
            </span>
          </div>
        </div>

        {filteredBookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBookings.map((b) => {
              const displayId = b.bookingId || b.id || b._id;
              const customerName = b.customerName || b.customer?.name || 'N/A';
              const mobileNumber = b.mobileNumber || b.customerPhone || b.customer?.phone || 'N/A';
              const slotsList = Array.isArray(b.slots) ? b.slots : (Array.isArray(b.timeSlots) ? b.timeSlots : []);
              const totalAmt = b.totalAmount || (slotsList.length * 354);

              const statusColors = {
                Confirmed: 'border-l-4 border-l-emerald-500 bg-emerald-50/50',
                Pending: 'border-l-4 border-l-amber-500 bg-amber-50/50',
                Cancelled: 'border-l-4 border-l-rose-500 bg-rose-50/50 opacity-60'
              };

              return (
                <div 
                  key={displayId} 
                  className={`p-5 rounded-2xl border border-black/5 shadow-sm space-y-3 ${
                    statusColors[b.status] || 'border-l-4 border-l-primary bg-surface-container-low'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-primary text-sm">{displayId}</span>
                      <h3 className="font-headline-md font-bold text-on-surface text-base">{customerName}</h3>
                      <p className="text-xs text-on-surface-variant">{mobileNumber}</p>
                    </div>
                    <span className="font-bold text-primary text-sm">₹{totalAmt}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-label-bold text-on-surface-variant block uppercase tracking-wider">Time Slots:</span>
                    <div className="flex flex-wrap gap-1">
                      {slotsList.map((s, idx) => (
                        <span key={idx} className="bg-primary/10 text-primary text-[11px] font-label-bold px-2.5 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-black/5 flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant font-medium">Payment: {b.paymentMethod}</span>
                    <span className="font-label-bold uppercase text-[11px]">{b.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-on-surface-variant space-y-2">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">event_busy</span>
            <p className="font-medium text-sm">No reservations scheduled for {selectedDate}.</p>
          </div>
        )}
      </div>
    </div>
  );
};
