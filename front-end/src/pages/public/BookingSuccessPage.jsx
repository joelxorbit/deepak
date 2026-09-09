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

  const publicBookingId = latestBooking.bookingId || latestBooking.id;
  const slotsList = latestBooking.slots || latestBooking.timeSlots || [];
  const subtotal = latestBooking.subtotal || (slotsList.length * 300);
  const totalAmount = latestBooking.totalAmount || subtotal;

  const handleDownloadPdf = async () => {
    if (!publicBookingId) {
      addToast('Booking reference is missing.', 'error');
      return;
    }
    try {
      setDownloading(true);
      await downloadTicketPdfService(publicBookingId);
      addToast('Ticket PDF downloaded successfully!', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to download ticket PDF. Please log in or verify booking ID.', 'error');
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
          <div className="pt-3 border-t border-black/10 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Rate per Slot</span>
              <span>
                {(() => {
                  if (latestBooking.slotBreakdowns && latestBooking.slotBreakdowns.length > 0) {
                    const rateCounts = {};
                    latestBooking.slotBreakdowns.forEach(b => {
                      rateCounts[b.ratePerHour] = (rateCounts[b.ratePerHour] || 0) + 1;
                    });
                    const parts = Object.entries(rateCounts).map(([rate, count]) => {
                      if (count === 1) return `₹${rate}`;
                      return `₹(${rate})*${count}`;
                    });
                    return parts.join(' + ');
                  }
                  return `₹${latestBooking.slotPrice || (slotsList.length > 0 ? Math.round(subtotal / slotsList.length) : 300)}`;
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Subtotal (GST-Free)</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-primary pt-2 border-t border-black/10">
              <span>Grand Total</span>
              <span>₹{totalAmount}</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-black/10">
            <span className="text-on-surface-variant">Payment Method</span>
            <span className="font-label-bold text-xs uppercase px-3 py-1 bg-surface rounded-full border border-black/10">
              {(() => {
                const method = latestBooking.paymentMethod;
                if (method === 'Pay Now') {
                  if (latestBooking.paymentStatus === 'Fully Paid') return 'Fully Paid';
                  if (latestBooking.paymentStatus === 'Advance Paid') return 'Advance Paid';
                  if (latestBooking.paymentOption === 'ADVANCE') return 'Advance Paid';
                  if (latestBooking.paymentOption === 'FULL') return 'Fully Paid';
                }
                return method;
              })()}
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
