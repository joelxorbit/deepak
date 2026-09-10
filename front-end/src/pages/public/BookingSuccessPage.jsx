import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { useToast } from '../../context/ToastContext';
import { ROUTES } from '../../constants/routes';
import { downloadTicketPdfService } from '../../services/bookingService';

export const BookingSuccessPage = () => {
  const { latestBooking } = useBooking();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  if (!latestBooking) {
    return (
      <div className="max-w-xl mx-auto px-container-padding-mobile py-20 text-center space-y-6">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant">event_busy</span>
        <h2 className="font-display-md text-headline-md">No Recent Booking Found</h2>
        <p className="font-body-md text-on-surface-variant">It looks like you haven't completed a booking session yet.</p>
        <button
          onClick={() => navigate(ROUTES.BOOKING)}
          className="bg-primary text-on-primary font-label-bold px-6 py-3 rounded-2xl shadow-md hover:scale-105 transition-all"
        >
          Book a Slot Now
        </button>
      </div>
    );
  }

  const publicBookingId = latestBooking.bookingId || latestBooking.id || latestBooking._id;
  const slotsList = latestBooking.slots || latestBooking.timeSlots || [];
  const subtotal = Number(latestBooking.subtotal) || (slotsList.length * (latestBooking.slotPrice || 600));
  const discountAmount = Number(latestBooking.discountAmount) || 0;
  const couponCode = latestBooking.couponCode || null;
  const totalAmount = Number(latestBooking.totalAmount) || Math.max(0, subtotal - discountAmount);
  
  // Resolve advance paid and balance due amounts
  const advancePaid = Number(latestBooking.advancePaid) ?? (latestBooking.paymentOption === 'ADVANCE' ? 200 : (latestBooking.paymentOption === 'FULL' ? totalAmount : 0));
  const balanceDue = Number(latestBooking.balanceDue) ?? Math.max(0, totalAmount - advancePaid);

  const paymentStatusText = (() => {
    if (latestBooking.paymentOption === 'ADVANCE' || latestBooking.paymentStatus === 'Advance Paid' || latestBooking.paymentMethod === 'Advance Paid') return 'Advance Paid';
    if (latestBooking.paymentOption === 'FULL' || latestBooking.paymentStatus === 'Fully Paid' || latestBooking.paymentMethod === 'Fully Paid' || latestBooking.paymentStatus === 'Paid' || latestBooking.paymentMethod === 'Pay Now') return 'Fully Paid';
    return latestBooking.paymentStatus || latestBooking.paymentMethod || 'Cash Pending';
  })();

  const handleDownloadPdf = async () => {
    if (!publicBookingId) {
      addToast('Booking reference is missing.', 'error');
      return;
    }
    try {
      setDownloading(true);
      const token = latestBooking.customerToken || latestBooking.token || localStorage.getItem('elite_pitch_customer_token');
      await downloadTicketPdfService(publicBookingId, token);
      addToast('Ticket PDF downloaded successfully!', 'success');
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to download ticket PDF. Please log in or verify booking ID.';
      addToast(errorMsg, 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-container-padding-mobile md:px-container-padding-desktop py-12">
      <div className="bg-surface border border-black/5 rounded-3xl p-8 md:p-12 shadow-2xl space-y-8 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-primary-container text-primary mx-auto flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl">task_alt</span>
        </div>

        <div className="space-y-2">
          <h1 className="font-display-md text-headline-lg text-on-surface">BOOKING CONFIRMED</h1>
          <p className="font-body-md text-on-surface-variant">Your turf slot reservation details & receipt</p>
        </div>

        <div className="bg-surface-variant/40 rounded-2xl p-6 text-left space-y-4 font-body-md text-on-surface border border-black/5">
          <div className="flex justify-between items-center pb-3 border-b border-black/10">
            <span className="text-on-surface-variant font-label-bold">Booking Reference ID</span>
            <span className="font-mono font-bold text-primary text-lg">{publicBookingId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant">Full Name</span>
            <span className="font-semibold">{latestBooking.customerName || latestBooking.customer?.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant">Mobile Number</span>
            <span className="font-semibold">{latestBooking.mobileNumber || latestBooking.customerPhone || latestBooking.customer?.phone}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant">Booking Date</span>
            <span className="font-semibold">{typeof latestBooking.date === 'string' ? latestBooking.date.split('T')[0] : latestBooking.dateStr}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-on-surface-variant">Time Slots ({slotsList.length} hrs)</span>
            <div className="text-right">
              {slotsList.map((slot, idx) => (
                <div key={idx} className="font-semibold text-primary">{slot}</div>
              ))}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="pt-3 border-t border-black/10 space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant">Rate per Slot</span>
              <span className="font-medium">
                {(() => {
                  if (latestBooking.slotBreakdowns && latestBooking.slotBreakdowns.length > 0) {
                    const rateCounts = {};
                    latestBooking.slotBreakdowns.forEach(b => {
                      rateCounts[b.ratePerHour] = (rateCounts[b.ratePerHour] || 0) + 1;
                    });
                    const parts = Object.entries(rateCounts).map(([rate, count]) => {
                      if (count === 1) return `₹${rate}`;
                      return `₹${rate} × ${count}`;
                    });
                    return parts.join(' + ');
                  }
                  return `₹${latestBooking.slotPrice || (slotsList.length > 0 ? Math.round(subtotal / slotsList.length) : 600)}`;
                })()}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant">Subtotal (GST-Free)</span>
              <span className="font-medium">₹{subtotal}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-emerald-600 font-medium">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">confirmation_number</span>
                  <span>Coupon Discount {couponCode ? `(${couponCode})` : ''}</span>
                </span>
                <span>-₹{discountAmount}</span>
              </div>
            )}

            <div className="flex justify-between items-center font-bold text-base text-slate-900 pt-2 border-t border-black/10">
              <span>Grand Total</span>
              <span className="text-emerald-700">₹{totalAmount}</span>
            </div>

            <div className="flex justify-between items-center text-sm pt-1">
              <span className="text-on-surface-variant">Advance Paid</span>
              <span className="font-semibold text-emerald-600">₹{advancePaid}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-on-surface-variant">Balance Due</span>
              <span className={`font-bold ${balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                ₹{balanceDue}
              </span>
            </div>

            {balanceDue > 0 && (
              <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined text-sm shrink-0">info</span>
                <span>Remaining balance of ₹{balanceDue} is payable at the turf reception before match kickoff.</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-black/10">
            <span className="text-on-surface-variant">Payment Status</span>
            <span className={`font-label-bold text-xs uppercase px-3 py-1 rounded-full border ${
              paymentStatusText === 'Fully Paid'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : paymentStatusText === 'Advance Paid'
                ? 'bg-sky-100 text-sky-800 border-sky-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}>
              {paymentStatusText}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-label-bold px-8 py-3.5 rounded-2xl shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">{downloading ? 'progress_activity' : 'picture_as_pdf'}</span>
            <span>{downloading ? 'Generating Ticket PDF...' : 'Download Official Ticket (PDF)'}</span>
          </button>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(ROUTES.HOME)}
              className="w-full sm:w-auto bg-slate-900 text-white font-label-bold px-6 py-3 rounded-2xl shadow hover:bg-slate-800 transition-all"
            >
              Back to Home
            </button>
            <button
              onClick={() => navigate(ROUTES.BOOKING)}
              className="w-full sm:w-auto bg-surface-variant text-on-surface-variant font-label-bold px-6 py-3 rounded-2xl border border-black/10 hover:bg-black/5 transition-all"
            >
              Book Another Slot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
