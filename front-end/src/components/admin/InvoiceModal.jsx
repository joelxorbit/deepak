import React from 'react';

export const InvoiceModal = ({ booking, onClose }) => {
  if (!booking) return null;

  const displayId = booking.bookingId || booking.id || booking._id;
  const customerName = booking.customerName || booking.customer?.name || 'N/A';
  const mobileNumber = booking.mobileNumber || booking.customerPhone || booking.customer?.phone || 'N/A';
  const displayDate = typeof booking.date === 'string' ? booking.date.split('T')[0] : booking.dateStr || 'N/A';
  const slotsList = Array.isArray(booking.slots) ? booking.slots : (Array.isArray(booking.timeSlots) ? booking.timeSlots : []);
  
  const slotCount = booking.slotCount || slotsList.length || 1;
  const slotPrice = booking.slotPrice || (booking.totalAmount ? Math.round(booking.totalAmount / slotCount) : 600);
  const subtotal = booking.subtotal || booking.totalAmount || (slotCount * slotPrice);
  const totalAmount = booking.totalAmount || subtotal;
  
  const isAdvance = booking.paymentOption === 'ADVANCE' || booking.paymentStatus === 'Advance Paid' || booking.paymentMethod === 'Advance Paid';
  const isFullyPaid = booking.paymentOption === 'FULL' || booking.paymentStatus === 'Fully Paid' || booking.paymentMethod === 'Fully Paid' || booking.paymentStatus === 'Paid' || booking.paymentMethod === 'Pay Now';
  const paymentStatus = isAdvance ? 'Advance Paid' : (isFullyPaid ? 'Fully Paid' : (booking.paymentStatus || 'Cash Pending'));
  const advancePaid = booking.advancePaid !== undefined ? booking.advancePaid : (isAdvance ? 200 : (isFullyPaid ? totalAmount : 0));
  const balanceDue = booking.balanceDue !== undefined ? booking.balanceDue : Math.max(0, totalAmount - advancePaid);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl border border-black/5 relative space-y-6 print:shadow-none print:border-none print:max-w-none print:w-full print:p-0">
        
        {/* Header Controls (Hidden on Print) */}
        <div className="flex justify-between items-center print:hidden border-b border-black/5 pb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">receipt_long</span>
            <h3 className="font-bold text-lg text-on-surface">Invoice & Receipt</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="min-h-[44px] px-4 py-2 bg-primary text-white text-xs font-label-bold rounded-xl hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              Print Invoice
            </button>
            <button
              onClick={onClose}
              className="p-2 text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
        </div>

        {/* Printable Invoice Content */}
        <div className="space-y-6 text-on-surface">
          {/* Company & Invoice Header */}
          <div className="flex justify-between items-start border-b border-black/10 pb-6">
            <div>
              <h1 className="font-display-lg text-xl font-extrabold text-primary">ELITE PITCH ARENA</h1>
              <p className="text-xs text-on-surface-variant mt-0.5">123 Sports Complex Way, Metro City, 400001</p>
              <p className="text-xs text-on-surface-variant">Phone: +91 98765 43210</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                ORIGINAL INVOICE
              </span>
              <p className="text-xs font-mono font-bold mt-2">Invoice #: INV-{displayId}</p>
              <p className="text-xs text-on-surface-variant">Date: {new Date().toISOString().split('T')[0]}</p>
            </div>
          </div>

          {/* Customer & Booking Info */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-surface-container-low p-4 rounded-2xl border border-black/5">
            <div>
              <span className="font-bold text-on-surface-variant uppercase text-[10px] tracking-wider block mb-1">Billed To</span>
              <p className="font-bold text-sm text-on-surface">{customerName}</p>
              <p className="text-on-surface-variant">Phone: {mobileNumber}</p>
            </div>
            <div className="text-right">
              <span className="font-bold text-on-surface-variant uppercase text-[10px] tracking-wider block mb-1">Reservation Info</span>
              <p className="font-bold text-sm text-primary">Booking ID: {displayId}</p>
              <p className="text-on-surface-variant">Match Date: {displayDate}</p>
            </div>
          </div>

          {/* Itemized Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low border-b border-black/10 text-on-surface-variant font-label-bold uppercase">
                <tr>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-center">Rate</th>
                  <th className="p-3 text-center">Hours</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                <tr>
                  <td className="p-3">
                    <p className="font-bold text-on-surface">Turf Booking Slot Reservation</p>
                    <p className="text-[11px] text-on-surface-variant">Slots: {slotsList.join(', ')}</p>
                  </td>
                  <td className="p-3 text-center font-medium">₹{slotPrice}</td>
                  <td className="p-3 text-center font-medium">{slotCount}</td>
                  <td className="p-3 text-right font-bold">₹{subtotal}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals & Tax Breakdown */}
          <div className="flex justify-between items-end border-t border-black/10 pt-4 text-xs">
            <div className="space-y-1 text-on-surface-variant">
              <p>Payment Status: <strong className="text-primary">{paymentStatus}</strong></p>
              {isAdvance && <p>Advance Paid: <strong className="text-emerald-700">₹{advancePaid}</strong></p>}
              {balanceDue > 0 && <p>Balance Due at Turf: <strong className="text-amber-700">₹{balanceDue}</strong></p>}
            </div>
            <div className="w-48 space-y-1.5 text-right">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">₹{subtotal}</span>
              </div>
              {booking.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon ({booking.couponCode}):</span>
                  <span className="font-medium">-₹{booking.discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-black/10 text-primary">
                <span>Grand Total:</span>
                <span>₹{totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Terms Footer */}
          <div className="text-[10px] text-on-surface-variant pt-4 border-t border-black/5 text-center space-y-1">
            <p>Thank you for choosing Elite Pitch Turf Arena! Please arrive 15 minutes before your slot time.</p>
            <p>Cancellations are subject to arena rules (minimum 2 hours advance notice required).</p>
          </div>
        </div>
      </div>
    </div>
  );
};
