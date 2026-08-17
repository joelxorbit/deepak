import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { parseSlotToDate } from '../../utils/bookingUtils';

export const CancelBookingModal = () => {
  const { isCancelModalOpen, setIsCancelModalOpen, findBookingsByIdOrPhone, cancelBooking } = useBooking();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searched, setSearched] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(null);
  const [cancelError, setCancelError] = useState(null);

  if (!isCancelModalOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setCancelError(null);
    setCancelSuccess(null);
    const found = await findBookingsByIdOrPhone(query);
    setResults(found || []);
    setSearched(true);
  };

  const isEligibleForCancellation = (booking) => {
    if (booking.status === 'Cancelled') return { eligible: false, reason: 'Booking is already cancelled.' };

    const slotsList = booking.timeSlots || booking.slots || [];
    if (slotsList.length === 0) return { eligible: true };

    const earliestSlot = slotsList[0];
    const slotStartTime = parseSlotToDate(booking.date, earliestSlot);
    const now = new Date();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    if (slotStartTime.getTime() - now.getTime() < twoHoursMs) {
      return { eligible: false, reason: 'Cancellation not allowed within 2 hours of slot start time.' };
    }

    return { eligible: true };
  };

  const handleConfirmCancel = async (bookingId) => {
    setCancelError(null);
    setCancelSuccess(null);

    const targetDoc = results.find(b => (b.bookingId === bookingId || b.id === bookingId || b._id === bookingId));
    if (targetDoc) {
      const { eligible, reason } = isEligibleForCancellation(targetDoc);
      if (!eligible) {
        setCancelError(reason);
        return;
      }
    }

    const res = await cancelBooking(bookingId);
    if (res) {
      const displayId = res.bookingId || res.id || bookingId;
      setCancelSuccess(`Booking ${displayId} has been successfully cancelled.`);
      setResults(prev => prev.map(b => (b.bookingId === bookingId || b.id === bookingId || b._id === bookingId) ? { ...b, status: 'Cancelled' } : b));
    } else {
      setCancelError('Failed to cancel booking or cancellation window has closed.');
    }
  };

  const handleClose = () => {
    setIsCancelModalOpen(false);
    setQuery('');
    setResults(null);
    setSearched(false);
    setCancelSuccess(null);
    setCancelError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 relative text-slate-900">
        <button 
          onClick={handleClose}
          aria-label="Close cancel booking modal"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-xl hover:bg-slate-100"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">cancel</span>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-900">Cancel Booking</h3>
            <p className="text-slate-500 text-xs font-normal">Enter Booking ID or Mobile (Min 2 hours notice required)</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 mb-1.5">
              Booking ID or Phone Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. BK-20260802-0001 or 9876543210"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 transition-all font-normal"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-lg">search</span>
            Find Booking To Cancel
          </button>
        </form>

        {cancelSuccess && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 text-emerald-800 font-medium text-xs flex items-center gap-2 border border-emerald-200">
            <span className="material-symbols-outlined text-base">check_circle</span>
            {cancelSuccess}
          </div>
        )}

        {cancelError && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 text-rose-800 font-medium text-xs flex items-center gap-2 border border-rose-200">
            <span className="material-symbols-outlined text-base">error</span>
            {cancelError}
          </div>
        )}

        {searched && (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1 text-xs">
            {results && results.length > 0 ? (
              results.map((booking) => {
                const displayId = booking.bookingId || booking.id || booking._id;
                const customerName = booking.customerName || booking.customer?.name || 'N/A';
                const dateStr = typeof booking.date === 'string' ? booking.date.split('T')[0] : booking.dateStr;
                const slotsList = booking.timeSlots || booking.slots || [];
                const { eligible, reason } = isEligibleForCancellation(booking);

                return (
                  <div key={displayId} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-900 text-sm">{displayId}</span>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                        booking.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        booking.status === 'Cancelled' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="text-slate-600 space-y-1 font-normal mb-3">
                      <p><strong className="text-slate-900 font-medium">Name:</strong> {customerName}</p>
                      <p><strong className="text-slate-900 font-medium">Date:</strong> {dateStr}</p>
                      <p><strong className="text-slate-900 font-medium">Slots:</strong> {slotsList.join(', ')}</p>
                      <p><strong className="text-slate-900 font-medium">Total Amount:</strong> ₹{booking.totalAmount || (slotsList.length * 354)}</p>
                    </div>

                    {booking.status !== 'Cancelled' ? (
                      eligible ? (
                        <button
                          onClick={() => handleConfirmCancel(displayId)}
                          className="w-full bg-rose-600 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl hover:bg-rose-700 transition-all flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">block</span> Confirm Cancel Booking
                        </button>
                      ) : (
                        <div className="text-xs text-rose-700 font-medium bg-rose-50 p-2 rounded-lg text-center border border-rose-200">
                          {reason}
                        </div>
                      )
                    ) : (
                      <div className="text-xs text-rose-600 font-medium italic text-center py-1">
                        This booking has already been cancelled.
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-slate-500 font-normal">
                No matching booking found to cancel.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
