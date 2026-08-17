import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';

export const TrackBookingModal = () => {
  const { isTrackModalOpen, setIsTrackModalOpen, findBookingsByIdOrPhone, isTrackingBooking } = useBooking();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searched, setSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isTrackModalOpen) return null;

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim() || isTrackingBooking) return;

    setErrorMessage('');
    try {
      const found = await findBookingsByIdOrPhone(query);
      setResults(found || []);
      setSearched(true);
    } catch (err) {
      setErrorMessage('Unable to fetch bookings. Please try again.');
    }
  };

  const handleRetry = () => {
    setResults(null);
    setSearched(false);
    setErrorMessage('');
  };

  const handleClose = () => {
    setIsTrackModalOpen(false);
    setQuery('');
    setResults(null);
    setSearched(false);
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 relative text-slate-900">
        <button 
          onClick={handleClose}
          aria-label="Close track booking modal"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-xl hover:bg-slate-100"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">search</span>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-900">Track Booking</h3>
            <p className="text-slate-500 text-xs font-normal">Enter Booking ID or Registered Mobile Number</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 mb-1.5">
              Booking ID or Phone Number *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. BK-20260814-0001 or 9876543210"
                aria-label="Booking ID or Mobile Number"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-normal"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isTrackingBooking || !query.trim()}
            className="w-full min-h-[44px] bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-lg">
              {isTrackingBooking ? 'sync' : 'search'}
            </span>
            {isTrackingBooking ? 'Searching...' : 'Search Booking'}
          </button>
        </form>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs font-medium flex items-center gap-2 mb-4 border border-rose-200">
            <span className="material-symbols-outlined text-base">error</span>
            {errorMessage}
          </div>
        )}

        {searched && !isTrackingBooking && (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {results && results.length > 0 ? (
              results.map((booking) => {
                const displayId = booking.bookingId || booking.id || booking._id;
                const customerName = booking.customerName || booking.customer?.name || 'N/A';
                const customerPhone = booking.customerPhone || booking.mobileNumber || booking.customer?.phone || 'N/A';
                const dateStr = typeof booking.date === 'string' ? booking.date.split('T')[0] : booking.dateStr;
                const slotsList = booking.timeSlots || booking.slots || [];
                const totalAmt = booking.totalAmount || (slotsList.length * 354);

                return (
                  <div key={displayId} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-emerald-600 text-sm">{displayId}</span>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                        booking.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        booking.status === 'Cancelled' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="text-slate-600 space-y-1 font-normal">
                      <p><strong className="text-slate-900 font-medium">Name:</strong> {customerName}</p>
                      <p><strong className="text-slate-900 font-medium">Phone:</strong> {customerPhone}</p>
                      <p><strong className="text-slate-900 font-medium">Date:</strong> {dateStr}</p>
                      <p><strong className="text-slate-900 font-medium">Slots:</strong> {slotsList.join(', ')}</p>
                      <p><strong className="text-slate-900 font-medium">Payment:</strong> {booking.paymentMethod}</p>
                      <p><strong className="text-slate-900 font-medium">Total:</strong> <span className="font-semibold text-emerald-600">₹{totalAmt}</span></p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-slate-500 space-y-3">
                <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                <p className="text-xs font-normal">No booking found. Check your Booking ID or registered phone number.</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 font-medium text-xs rounded-xl hover:bg-slate-200 transition-all"
                >
                  Retry Search
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
