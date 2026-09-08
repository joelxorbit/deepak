import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';

const ALL_TIME_SLOTS = [
  '06:00 AM - 07:00 AM',
  '07:00 AM - 08:00 AM',
  '08:00 AM - 09:00 AM',
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
  '05:00 PM - 06:00 PM',
  '06:00 PM - 07:00 PM',
  '07:00 PM - 08:00 PM',
  '08:00 PM - 09:00 PM',
  '09:00 PM - 10:00 PM',
  '10:00 PM - 11:00 PM',
  '11:00 PM - 12:00 AM'
];

export const CalendarPage = () => {
  const { bookings, blockedSlots, blockSlot, unblockSlot } = useBooking();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('Day');

  // Slot Blocking Form State
  const [blockType, setBlockType] = useState('slot'); // 'slot' | 'fullday'
  const [targetSlot, setTargetSlot] = useState(ALL_TIME_SLOTS[0]);
  const [blockReason, setBlockReason] = useState('');
  const [blockError, setBlockError] = useState('');
  const [blockSuccess, setBlockSuccess] = useState('');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  const filteredBookings = bookings.filter((b) => {
    const bDate = typeof b.date === 'string' ? b.date.split('T')[0] : b.dateStr;
    return bDate === selectedDate;
  });

  const currentDayBlocks = (blockedSlots || []).filter((b) => {
    const bDate = typeof b.date === 'string' ? b.date.split('T')[0] : b.dateStr;
    return bDate === selectedDate;
  });

  const handleCreateBlock = async (e) => {
    e.preventDefault();
    setBlockError('');
    setBlockSuccess('');

    if (!blockReason || blockReason.trim().length < 3) {
      setBlockError('Please enter a valid reason for blocking (minimum 3 characters).');
      return;
    }

    try {
      setIsSubmittingBlock(true);
      const isFullDay = blockType === 'fullday';
      await blockSlot({
        dateStr: selectedDate,
        isFullDay,
        slot: isFullDay ? null : targetSlot,
        slots: isFullDay ? null : [targetSlot],
        reason: blockReason.trim()
      });

      setBlockSuccess(
        isFullDay
          ? `Full-day closure active for ${selectedDate}.`
          : `Slot "${targetSlot}" successfully blocked.`
      );
      setBlockReason('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to block slot. Check for conflicting active bookings.';
      setBlockError(msg);
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const handleUnblock = async (blockId) => {
    try {
      setBlockError('');
      setBlockSuccess('');
      await unblockSlot(blockId);
      setBlockSuccess('Slot block removed successfully.');
    } catch (err) {
      setBlockError(err.response?.data?.message || 'Failed to unblock slot.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-3xl font-extrabold text-on-surface">Interactive Turf Calendar & Availability</h1>
          <p className="text-on-surface-variant font-body-md text-sm mt-1">
            Visual reservation schedule, slot blocking, maintenance closures, and conflict detection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setBlockSuccess('');
              setBlockError('');
            }}
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

      {/* Availability Blocking Console */}
      <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-black/5 pb-3">
          <span className="material-symbols-outlined text-primary text-xl">block</span>
          <h2 className="font-bold text-base text-on-surface">Availability Management Console</h2>
        </div>

        <form onSubmit={handleCreateBlock} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-label-bold text-on-surface uppercase tracking-wider mb-1.5">
              Block Scope
            </label>
            <select
              value={blockType}
              onChange={(e) => setBlockType(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            >
              <option value="slot">Single Time Slot</option>
              <option value="fullday">Full-Day Closure</option>
            </select>
          </div>

          {blockType === 'slot' && (
            <div>
              <label className="block text-xs font-label-bold text-on-surface uppercase tracking-wider mb-1.5">
                Target Slot
              </label>
              <select
                value={targetSlot}
                onChange={(e) => setTargetSlot(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              >
                {ALL_TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          )}

          <div className={blockType === 'fullday' ? 'md:col-span-2' : 'md:col-span-1'}>
            <label className="block text-xs font-label-bold text-on-surface uppercase tracking-wider mb-1.5">
              Reason <span className="text-error">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Grass maintenance, private tournament..."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmittingBlock}
              className="w-full min-h-[44px] bg-primary text-white rounded-2xl text-xs font-label-bold hover:shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">lock</span>
              {isSubmittingBlock ? 'Blocking...' : 'Block Slot / Day'}
            </button>
          </div>
        </form>

        {blockError && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-2xl text-error text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{blockError}</span>
          </div>
        )}

        {blockSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>{blockSuccess}</span>
          </div>
        )}

        {/* Active Blocks on Selected Date */}
        {currentDayBlocks.length > 0 && (
          <div className="pt-3 border-t border-black/5 space-y-2">
            <h3 className="text-xs font-label-bold text-on-surface-variant uppercase tracking-wider">
              Active Blocks on {selectedDate}:
            </h3>
            <div className="flex flex-wrap gap-2">
              {currentDayBlocks.map((b) => (
                <div
                  key={b.id || b._id}
                  className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-1.5 rounded-xl"
                >
                  <span className="font-bold">
                    {b.isFullDay ? 'Full-Day Closed' : (b.slot || (Array.isArray(b.slots) ? b.slots.join(', ') : 'Blocked'))}
                  </span>
                  <span className="text-rose-600 text-[11px]">({b.reason})</span>
                  <button
                    onClick={() => handleUnblock(b.id || b._id)}
                    className="ml-1 text-rose-700 hover:text-rose-900 font-bold"
                    title="Unblock this slot"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Schedule Overview */}
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
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary text-sm">{displayId}</span>
                        {b.isReviewed && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-label-bold px-1.5 py-0.5 rounded-full">
                            Reviewed
                          </span>
                        )}
                      </div>
                      <h3 className="font-headline-md font-bold text-on-surface text-base mt-1">{customerName}</h3>
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

