import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { useToast } from '../../context/ToastContext';
import { downloadTicketPdfService } from '../../services/bookingService';

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
  const totalAmount = booking.totalAmount || booking.subtotal || 0;
  
  const isAdvance = booking.paymentOption === 'ADVANCE' || booking.paymentStatus === 'Advance Paid' || booking.paymentMethod === 'Advance Paid';
  const isFullyPaid = booking.paymentOption === 'FULL' || booking.paymentStatus === 'Fully Paid' || booking.paymentMethod === 'Fully Paid' || booking.paymentStatus === 'Paid' || booking.paymentMethod === 'Pay Now';
  const paymentStatus = isAdvance ? 'Advance Paid' : (isFullyPaid ? 'Fully Paid' : (booking.paymentStatus || 'Cash Pending'));
  const advancePaid = booking.advancePaid !== undefined ? booking.advancePaid : (isAdvance ? 200 : (isFullyPaid ? totalAmount : 0));
  const balanceDue = booking.balanceDue !== undefined ? booking.balanceDue : Math.max(0, totalAmount - advancePaid);

  const handleApprove = async () => {
    await approveBooking(displayId);
    addToast(`Booking ${displayId} approved successfully.`, 'success');
  };

  const handleReject = async () => {
    if (!window.confirm(`Are you sure you want to reject booking ${displayId}?`)) return;
    await rejectBooking(displayId);
    addToast(`Booking ${displayId} rejected.`, 'info');
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      await downloadTicketPdfService(displayId);
      addToast(`Ticket PDF downloaded for ${displayId}.`, 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to download ticket PDF.', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
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
              paymentStatus === 'Fully Paid' ? 'bg-emerald-100 text-emerald-900' :
              paymentStatus === 'Advance Paid' ? 'bg-blue-100 text-blue-900' :
              'bg-amber-100 text-amber-900'
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
              <span className="text-on-surface-variant">Payment Status</span>
              <span className="font-bold text-on-surface">{paymentStatus}</span>
            </div>
            <div className="flex justify-between border-b border-black/5 pb-2">
              <span className="text-on-surface-variant">Advance Paid</span>
              <span className="font-medium text-emerald-700">₹{advancePaid}</span>
            </div>
            {balanceDue > 0 && (
              <div className="flex justify-between border-b border-black/5 pb-2">
                <span className="text-on-surface-variant">Balance Due</span>
                <span className="font-medium text-amber-700">₹{balanceDue}</span>
              </div>
            )}
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

          {(paymentStatus === 'Pending' || paymentStatus === 'Cash Pending' || paymentStatus === 'Advance Paid') && (
            <button
              onClick={handleMarkPaid}
              className="w-full min-h-[44px] py-3 bg-emerald-600 text-white font-label-bold text-xs rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">payments</span>
              Mark Payment as Fully Paid
            </button>
          )}

          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="w-full min-h-[44px] py-3 bg-emerald-600 text-white font-label-bold text-xs rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">
              {isDownloadingPdf ? 'progress_activity' : 'picture_as_pdf'}
            </span>
            {isDownloadingPdf ? 'Generating Ticket PDF...' : 'Download Official Ticket (PDF)'}
          </button>

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
