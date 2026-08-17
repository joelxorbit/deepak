import React from 'react';
import { useBooking } from '../../context/BookingContext';
import { useToast } from '../../context/ToastContext';

export const BookingDetailsDrawer = ({ booking, onClose, onPrintInvoice }) => {
  const { approveBooking, rejectBooking, markBookingAsPaid } = useBooking();
  const { addToast } = useToast();

  if (!booking) return null;

  const displayId = booking.bookingId || booking.id || booking._id;
  const customerName = booking.customerName || booking.customer?.name || 'N/A';
  const mobileNumber = booking.mobileNumber || booking.customerPhone || booking.customer?.phone || 'N/A';
  const displayDate = typeof booking.date === 'string' ? booking.date.split('T')[0] : booking.dateStr || 'N/A';
  const slotsList = Array.isArray(booking.slots) ? booking.slots : (Array.isArray(booking.timeSlots) ? booking.timeSlots : []);
  
  const slotCount = booking.slotCount || slotsList.length || 1;
  const totalAmount = booking.totalAmount || (slotCount * 354);
  const paymentStatus = booking.paymentStatus || (booking.paymentMethod === 'Pay Now' ? 'Paid' : 'Pending');

  const handleApprove = async () => {
    await approveBooking(displayId);
    addToast(`Booking ${displayId} approved successfully.`, 'success');
  };

  const handleReject = async () => {
    if (!window.confirm(`Are you sure you want to reject booking ${displayId}?`)) return;
    await rejectBooking(displayId);
    addToast(`Booking ${displayId} rejected.`, 'info');
  };

  const handleMarkPaid = async () => {
    await markBookingAsPaid(displayId);
    addToast(`Payment for ${displayId} marked as Paid.`, 'success');
  };

  return (
    <>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
      ></div>

      <aside className="fixed top-0 bottom-0 right-0 z-50 w-full max-w-md bg-white p-6 shadow-2xl border-l border-black/5 flex flex-col justify-between overflow-y-auto animate-slide-up text-on-surface">
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-black/10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">RESERVATION DETAILS</span>
              <h2 className="font-headline-lg text-xl font-bold text-on-surface">{displayId}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-xl hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-3">
            <span className={`text-xs font-label-bold px-3 py-1.5 rounded-full ${
              booking.status === 'Confirmed' ? 'bg-primary-container/20 text-on-primary-container' :
              booking.status === 'Pending' ? 'bg-amber-100 text-amber-900' :
              'bg-error-container text-on-error-container'
            }`}>
              {booking.status}
            </span>

            <span className={`text-xs font-label-bold px-3 py-1.5 rounded-full ${
              paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
            }`}>
              Payment: {paymentStatus}
            </span>
          </div>

          {/* Customer & Match Info Card */}
          <div className="bg-surface-container-low p-5 rounded-2xl border border-black/5 space-y-3 text-sm">
            <div className="flex justify-between border-b border-black/5 pb-2">
              <span className="text-on-surface-variant">Customer Name</span>
              <span className="font-bold text-on-surface">{customerName}</span>
            </div>
            <div className="flex justify-between border-b border-black/5 pb-2">
              <span className="text-on-surface-variant">Mobile Number</span>
              <span className="font-mono text-xs font-bold text-primary">{mobileNumber}</span>
            </div>
            <div className="flex justify-between border-b border-black/5 pb-2">
              <span className="text-on-surface-variant">Match Date</span>
              <span className="font-medium text-on-surface">{displayDate}</span>
            </div>
            <div className="flex justify-between border-b border-black/5 pb-2">
              <span className="text-on-surface-variant">Payment Method</span>
              <span className="font-medium text-on-surface">{booking.paymentMethod}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-on-surface-variant font-bold">Total Amount</span>
              <span className="font-bold text-primary text-base">₹{totalAmount}</span>
            </div>
          </div>

          {/* Reserved Slots */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant">Reserved Time Slots</h3>
            <div className="flex flex-wrap gap-2">
              {slotsList.map((slot, idx) => (
                <span key={idx} className="bg-primary/10 text-primary font-label-bold text-xs px-3.5 py-1.5 rounded-xl">
                  {slot}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Action Control Bar */}
        <div className="pt-6 border-t border-black/10 space-y-2">
          {booking.status === 'Pending' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleApprove}
                className="min-h-[44px] py-3 bg-primary text-white font-label-bold text-xs rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                Approve
              </button>
              <button
                onClick={handleReject}
                className="min-h-[44px] py-3 bg-error/10 text-error font-label-bold text-xs rounded-xl hover:bg-error/20 transition-all flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-base">cancel</span>
                Reject
              </button>
            </div>
          )}

          {paymentStatus === 'Pending' && (
            <button
              onClick={handleMarkPaid}
              className="w-full min-h-[44px] py-3 bg-emerald-600 text-white font-label-bold text-xs rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">payments</span>
              Mark Payment as Paid
            </button>
          )}

          {onPrintInvoice && (
            <button
              onClick={() => {
                onClose();
                onPrintInvoice(booking);
              }}
              className="w-full min-h-[44px] py-3 bg-surface-dark text-white font-label-bold text-xs rounded-xl hover:bg-surface-dark/90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">receipt_long</span>
              Print Tax Invoice
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
