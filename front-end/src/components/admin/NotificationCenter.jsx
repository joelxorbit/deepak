import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';

export const NotificationCenter = () => {
  const { bookings, events } = useBooking();
  const [isOpen, setIsOpen] = useState(false);

  // Generate real-time system alerts from bookings
  const notifications = bookings.slice(0, 5).map((b) => ({
    id: b.id || b._id || b.bookingId,
    title: b.status === 'Confirmed' ? 'Booking Confirmed' : b.status === 'Pending' ? 'New Reservation Pending' : 'Booking Alert',
    message: `${b.customerName || 'Customer'} reserved slot ${b.slots?.[0] || b.timeSlots?.[0] || 'today'} (${b.paymentMethod})`,
    time: typeof b.createdAt === 'string' ? new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
    unread: b.status === 'Pending' || b.paymentStatus === 'Pending'
  }));

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="relative p-2 min-h-[44px] min-w-[44px] rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
      >
        <span className="material-symbols-outlined text-2xl">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-surface-dark animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40"
          ></div>

          <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-black/5 z-50 overflow-hidden animate-slide-up text-on-surface">
            <div className="p-4 bg-surface-container-low border-b border-black/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">notifications_active</span>
                <h3 className="font-bold text-sm">System Notifications</h3>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            </div>

            <div className="divide-y divide-black/5 max-h-72 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div key={n.id} className={`p-4 space-y-1 hover:bg-surface-container-lowest transition-colors ${n.unread ? 'bg-primary/5' : ''}`}>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-xs text-on-surface">{n.title}</h4>
                      <span className="text-[10px] text-on-surface-variant">{n.time}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{n.message}</p>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-on-surface-variant">
                  No new notifications.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
