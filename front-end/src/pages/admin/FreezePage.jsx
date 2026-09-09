import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  getBlockedSlotsService,
  blockSlotService,
  unblockSlotService
} from '../../services/bookingService';
import { TIME_SLOTS } from '../../utils/bookingUtils';
import { getTodayString } from '../../utils/dateUtils';

const formatDate = (raw) => {
  if (!raw) return 'N/A';
  const d = new Date(raw + 'T00:00:00');
  if (isNaN(d)) return raw;
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

export const FreezePage = () => {
  const { addToast } = useToast();
  const todayStr = getTodayString();

  const [freezes, setFreezes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictMsg, setConflictMsg] = useState('');

  const [freezeDate, setFreezeDate] = useState(todayStr);
  const [isFullDay, setIsFullDay] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [freezeType, setFreezeType] = useState('maintenance');
  const [description, setDescription] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const loadFreezes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getBlockedSlotsService();
      const sorted = (data || []).sort((a, b) => (b.dateStr || '').localeCompare(a.dateStr || ''));
      setFreezes(sorted);
    } catch {
      addToast('Failed to load freeze records.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadFreezes(); }, [loadFreezes]);

  const openModal = () => {
    setFreezeDate(todayStr);
    setIsFullDay(false);
    setSelectedSlots([]);
    setFreezeType('maintenance');
    setDescription('');
    setPayerName('');
    setPayerPhone('');
    setPaymentAmount('');
    setPaymentNote('');
    setConflictMsg('');
    setIsModalOpen(true);
  };

  const toggleSlot = (slot) => {
    setSelectedSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setConflictMsg('');
    if (!freezeDate) { addToast('Please select a date.', 'error'); return; }
    if (!isFullDay && selectedSlots.length === 0) { addToast('Select at least one slot or enable Full Day.', 'error'); return; }
    if (!description.trim() || description.trim().length < 3) { addToast('Description must be at least 3 characters.', 'error'); return; }

    const paymentInfo = freezeType === 'private_booking' ? {
      name: payerName.trim(), phone: payerPhone.trim(),
      amount: paymentAmount ? Number(paymentAmount) : null, note: paymentNote.trim()
    } : null;

    try {
      setIsSubmitting(true);
      await blockSlotService({
        dateStr: freezeDate, slots: isFullDay ? [] : selectedSlots,
        isFullDay, reason: description.trim(), blockType: freezeType, paymentInfo, sportId: 'all'
      });
      addToast(isFullDay ? `Full day frozen on ${freezeDate}.` : `${selectedSlots.length} slot(s) frozen on ${freezeDate}.`, 'success');
      setIsModalOpen(false);
      loadFreezes();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to freeze slots.';
      const conflicts = err.response?.data?.conflicts;
      if (conflicts && conflicts.length > 0) {
        setConflictMsg(`Conflict: Active bookings exist on requested slots \u2014 ${conflicts.map(c => c.bookingId || c.slot).join(', ')}. Cancel them first.`);
      } else { setConflictMsg(msg); }
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to unfreeze this record?')) return;
    try {
      setDeletingId(id);
      await unblockSlotService(id);
      addToast('Freeze removed successfully.', 'success');
      setFreezes(prev => prev.filter(f => f.id !== id && f._id !== id));
    } catch { addToast('Failed to remove freeze.', 'error'); }
    finally { setDeletingId(null); }
  };

  const upcomingFreezes = freezes.filter(f => f.dateStr >= todayStr);
  const pastFreezes = freezes.filter(f => f.dateStr < todayStr);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-extrabold text-3xl text-on-surface">Freeze Manager</h1>
          <p className="text-on-surface-variant text-sm mt-1">Block specific slots or entire days for maintenance, private events, or advance reservations.</p>
        </div>
        <button onClick={openModal} className="flex items-center gap-2 bg-primary text-white font-bold px-5 py-3 rounded-2xl hover:shadow-lg hover:shadow-primary/25 transition-all">
          <span className="material-symbols-outlined text-xl">add_circle</span>
          New Freeze
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Records</p>
          <p className="font-extrabold text-2xl text-slate-800 mt-1">{freezes.length}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Upcoming</p>
          <p className="font-extrabold text-2xl text-amber-700 mt-1">{upcomingFreezes.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Full Day Freezes</p>
          <p className="font-extrabold text-2xl text-slate-800 mt-1">{freezes.filter(f => f.isFullDay).length}</p>
        </div>
      </div>

      {/* Upcoming Freeze List */}
      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600">lock_clock</span>
            <h2 className="font-bold text-slate-800">Active & Upcoming Freezes</h2>
          </div>
          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">{upcomingFreezes.length}</span>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center gap-3 text-slate-400">
            <span className="material-symbols-outlined animate-spin">sync</span>
            <span className="text-sm">Loading freeze records...</span>
          </div>
        ) : upcomingFreezes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-3xl text-slate-400">lock_open</span>
            </div>
            <p className="font-bold text-slate-600">No upcoming freezes</p>
            <p className="text-slate-400 text-sm mt-1">All dates are currently open for booking.</p>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {upcomingFreezes.map((f) => {
              const fId = f.id || f._id;
              const slotList = f.isFullDay ? [] : (f.slots || (f.slot ? [f.slot] : []));
              const isPrivate = f.blockType === 'private_booking';
              return (
                <div key={fId} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPrivate ? 'bg-indigo-100' : 'bg-amber-100'}`}>
                        <span className={`material-symbols-outlined text-xl ${isPrivate ? 'text-indigo-600' : 'text-amber-600'}`}>
                          {isPrivate ? 'person_pin' : 'engineering'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-800">{formatDate(f.dateStr)}</p>
                          {f.isFullDay
                            ? <span className="text-[11px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">Full Day</span>
                            : <span className="text-[11px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">{slotList.length} slot(s)</span>}
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${isPrivate ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {isPrivate ? 'Private Booking' : 'Maintenance'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">{f.reason}</p>
                        {!f.isFullDay && slotList.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {slotList.map((s, i) => (
                              <span key={i} className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">{s}</span>
                            ))}
                          </div>
                        )}
                        {isPrivate && f.paymentInfo && (f.paymentInfo.name || f.paymentInfo.phone || f.paymentInfo.amount) && (
                          <div className="mt-2 p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-xs text-indigo-800 space-y-0.5">
                            {f.paymentInfo.name && <p><span className="font-semibold">Payer:</span> {f.paymentInfo.name}</p>}
                            {f.paymentInfo.phone && <p><span className="font-semibold">Phone:</span> {f.paymentInfo.phone}</p>}
                            {f.paymentInfo.amount && <p><span className="font-semibold">Amount:</span> {'\u20B9'}{f.paymentInfo.amount}</p>}
                            {f.paymentInfo.note && <p><span className="font-semibold">Note:</span> {f.paymentInfo.note}</p>}
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1.5">By {f.blockedBy} {'\u2022'} {f.createdAt ? new Date(f.createdAt).toLocaleString('en-IN') : ''}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(fId)} disabled={deletingId === fId}
                      className="flex items-center gap-1.5 border border-red-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-red-50 transition-all disabled:opacity-50 shrink-0">
                      {deletingId === fId
                        ? <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        : <span className="material-symbols-outlined text-sm">lock_open</span>}
                      Unfreeze
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Freezes */}
      {pastFreezes.length > 0 && (
        <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-black/5">
            <h2 className="font-bold text-slate-500 flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400">history</span>
              Past Freezes ({pastFreezes.length})
            </h2>
          </div>
          <div className="divide-y divide-black/5">
            {pastFreezes.slice(0, 5).map((f) => {
              const fId = f.id || f._id;
              const slotList = f.isFullDay ? [] : (f.slots || (f.slot ? [f.slot] : []));
              return (
                <div key={fId} className="px-6 py-3 opacity-60">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-600 text-sm">{formatDate(f.dateStr)}</p>
                      <p className="text-xs text-slate-400">{f.isFullDay ? 'Full Day' : `${slotList.length} slot(s)`} {'\u2014'} {f.reason}</p>
                    </div>
                    <button onClick={() => handleDelete(fId)} disabled={deletingId === fId}
                      className="text-red-400 text-xs border border-red-100 px-2 py-1 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50">Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE FREEZE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-black/10 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 relative max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-black/5 pb-4">
              <div>
                <h2 className="font-extrabold text-xl text-slate-900">Create Freeze</h2>
                <p className="text-xs text-slate-500 mt-0.5">Block a date or specific slots from being booked by users</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              {conflictMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2 text-red-700">
                  <span className="material-symbols-outlined text-red-500 text-base shrink-0">error</span>
                  <span>{conflictMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Freeze Date *</label>
                  <input type="date" required value={freezeDate} min={todayStr} onChange={(e) => setFreezeDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Freeze Type *</label>
                  <select value={freezeType} onChange={(e) => setFreezeType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary">
                    <option value="maintenance">{'\U0001F527'} Maintenance / Closure</option>
                    <option value="private_booking">{'\U0001F464'} Private Booking (Paid)</option>
                  </select>
                </div>
              </div>

              {/* Full Day Toggle */}
              <div onClick={() => { setIsFullDay(!isFullDay); setSelectedSlots([]); }}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${isFullDay ? 'bg-amber-50 border-amber-400' : 'bg-slate-50 border-slate-200 hover:border-amber-300'}`}>
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-2xl ${isFullDay ? 'text-amber-600' : 'text-slate-400'}`}>
                    {isFullDay ? 'event_busy' : 'event_available'}
                  </span>
                  <div>
                    <p className={`font-bold ${isFullDay ? 'text-amber-800' : 'text-slate-600'}`}>Freeze Full Day</p>
                    <p className="text-slate-400 font-normal text-[11px]">Blocks all time slots for the selected date</p>
                  </div>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative ${isFullDay ? 'bg-amber-500' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isFullDay ? 'left-6' : 'left-1'}`}></div>
                </div>
              </div>

              {/* Slot Picker */}
              {!isFullDay && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-slate-700">Select Slots to Freeze *</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setSelectedSlots([...TIME_SLOTS])} className="text-[11px] text-primary font-bold hover:underline">Select All</button>
                      <span className="text-slate-300">|</span>
                      <button type="button" onClick={() => setSelectedSlots([])} className="text-[11px] text-slate-400 font-bold hover:underline">Clear</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-slate-50 border border-slate-200 rounded-2xl max-h-64 overflow-y-auto">
                    {TIME_SLOTS.map((slot) => {
                      const isSel = selectedSlots.includes(slot);
                      return (
                        <button key={slot} type="button" onClick={() => toggleSlot(slot)}
                          className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all border min-h-[44px] ${isSel ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400 hover:bg-amber-50'}`}>
                          {slot}
                          {isSel && <div className="text-[9px] mt-0.5 opacity-80">{'\u2713'} Frozen</div>}
                        </button>
                      );
                    })}
                  </div>
                  {selectedSlots.length > 0 && <p className="text-amber-600 font-bold mt-1.5">{selectedSlots.length} slot(s) selected for freeze</p>}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Reason *</label>
                <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  placeholder="e.g. Annual ground maintenance, VIP corporate event booking..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary resize-none" />
              </div>

              {/* Payment Info for Private Booking */}
              {freezeType === 'private_booking' && (
                <div className="space-y-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                  <p className="font-bold text-indigo-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">payments</span>
                    Private Booking Payment Details (Optional)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Payer Name</label>
                      <input type="text" value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="e.g. Deepak Jose"
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Phone Number</label>
                      <input type="tel" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile"
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-400" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Amount Received ({'\u20B9'})</label>
                      <input type="number" min="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="e.g. 5000"
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-400" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Payment Note</label>
                      <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="e.g. Cash advance, UPI ref #123"
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-black/5">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-2.5 rounded-2xl transition-all disabled:opacity-60 shadow-md shadow-amber-200">
                  {isSubmitting
                    ? <><span className="material-symbols-outlined text-base animate-spin">sync</span> Freezing...</>
                    : <><span className="material-symbols-outlined text-base">lock</span> Confirm Freeze</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
