import React, { memo } from 'react';

export const BookingTable = memo(({ bookings = [], onApprove, onReject, onCancel, onMarkPaid, onRowClick, showActions = true }) => {
  if (bookings.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-black/5 shadow-sm space-y-3">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">event_busy</span>
        <p className="text-on-surface-variant font-medium text-sm">
          No bookings found matching your search and filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile Card List View (Visible on small screens < 768px, 0 horizontal scroll) */}
      <div className="block md:hidden space-y-4">
        {bookings.map((b) => {
          const displayId = b.bookingId || b.id || b._id;
          const customerName = b.customerName || b.customer?.name || 'N/A';
          const mobileNumber = b.mobileNumber || b.customerPhone || b.customer?.phone || 'N/A';
          const displayDate = typeof b.date === 'string' ? b.date.split('T')[0] : b.dateStr || 'N/A';
          const slotsList = Array.isArray(b.slots) ? b.slots : (Array.isArray(b.timeSlots) ? b.timeSlots : []);
          const totalAmt = b.totalAmount || b.subtotal || (slotsList.length * 354);
          const paymentStatus = b.paymentStatus || (b.paymentMethod === 'Pay Now' ? 'Paid' : 'Pending');
          const isPendingPayment = paymentStatus === 'Pending';

          return (
            <div 
              key={displayId} 
              onClick={() => onRowClick && onRowClick(b)}
              className={`bg-white p-5 rounded-2xl border border-black/5 shadow-sm space-y-4 transition-all ${
                onRowClick ? 'cursor-pointer hover:border-primary/40 hover:shadow-md' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-primary text-base block">{displayId}</span>
                  <p className="font-label-bold text-on-surface text-sm">{customerName}</p>
                  <p className="text-xs text-on-surface-variant">{mobileNumber}</p>
                </div>
                <div className="text-right space-y-1">
                  <span className={`inline-block text-[11px] font-label-bold px-2.5 py-0.5 rounded-full ${
                    b.status === 'Confirmed' ? 'bg-primary-container/20 text-on-primary-container' :
                    b.status === 'Cancelled' || b.status === 'Rejected' ? 'bg-error-container text-on-error-container' :
                    'bg-secondary-container text-on-secondary-container'
                  }`}>
                    {b.status}
                  </span>
                  <p className="font-bold text-primary text-base">₹{totalAmt}</p>
                </div>
              </div>

              <div className="text-xs space-y-1.5 pt-3 border-t border-black/5 text-on-surface-variant">
                <div className="flex justify-between">
                  <span className="font-medium">Date:</span>
                  <span>{displayDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Slots:</span>
                  <div className="flex flex-wrap justify-end gap-1">
                    {slotsList.map((s, idx) => (
                      <span key={idx} className="bg-primary/10 text-primary text-[10px] font-label-bold px-2 py-0.5 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Payment ({b.paymentMethod}):</span>
                  <span className={`text-[11px] font-label-bold px-2.5 py-0.5 rounded-full ${
                    paymentStatus === 'Paid' ? 'bg-primary-container/20 text-on-primary-container' : 'bg-error-container/60 text-on-error-container'
                  }`}>
                    {paymentStatus}
                  </span>
                </div>
              </div>

              {showActions && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="pt-3 border-t border-black/5 flex flex-wrap gap-2 justify-end"
                >
                  {isPendingPayment && b.status !== 'Cancelled' && onMarkPaid && (
                    <button
                      onClick={() => onMarkPaid(displayId)}
                      className="min-h-[44px] px-3 py-2 bg-emerald-600 text-white text-xs font-label-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm">payments</span>
                      Mark Paid
                    </button>
                  )}
                  {(b.status === 'Pending Approval' || b.status === 'Pending') && onApprove && onReject && (
                    <>
                      <button
                        onClick={() => onApprove(displayId)}
                        className="min-h-[44px] px-3 py-2 bg-primary text-white text-xs font-label-bold rounded-xl hover:shadow-md transition-all"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onReject(displayId)}
                        className="min-h-[44px] px-3 py-2 bg-error/10 text-error text-xs font-label-bold rounded-xl hover:bg-error/20 transition-all"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {b.status !== 'Cancelled' && onCancel && (
                    <button
                      onClick={() => onCancel(displayId)}
                      className="min-h-[44px] px-3 py-2 bg-surface-container border border-error/30 text-error text-xs font-label-bold rounded-xl hover:bg-error/10 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table View (Visible on screens >= 768px) */}
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low border-b border-black/5 text-on-surface-variant font-label-bold text-xs uppercase">
            <tr>
              <th className="p-4">Booking ID</th>
              <th className="p-4">Customer Details</th>
              <th className="p-4">Date</th>
              <th className="p-4">Time Slots</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Payment Method</th>
              <th className="p-4">Payment Status</th>
              <th className="p-4">Booking Status</th>
              {showActions && <th className="p-4 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {bookings.map((b) => {
              const displayId = b.bookingId || b.id || b._id;
              const customerName = b.customerName || b.customer?.name || 'N/A';
              const mobileNumber = b.mobileNumber || b.customerPhone || b.customer?.phone || 'N/A';
              const displayDate = typeof b.date === 'string' ? b.date.split('T')[0] : b.dateStr || 'N/A';
              const slotsList = Array.isArray(b.slots) ? b.slots : (Array.isArray(b.timeSlots) ? b.timeSlots : []);
              const totalAmt = b.totalAmount || b.subtotal || (slotsList.length * 354);
              const paymentStatus = b.paymentStatus || (b.paymentMethod === 'Pay Now' ? 'Paid' : 'Pending');
              const isPendingPayment = paymentStatus === 'Pending';

              return (
                <tr 
                  key={displayId} 
                  onClick={() => onRowClick && onRowClick(b)}
                  className={`hover:bg-surface-container-lowest transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  <td className="p-4 font-headline-md text-primary font-bold">{displayId}</td>
                  <td className="p-4">
                    <p className="font-label-bold text-on-surface">{customerName}</p>
                    <p className="text-xs text-on-surface-variant">{mobileNumber}</p>
                  </td>
                  <td className="p-4 text-on-surface-variant">{displayDate}</td>
                  <td className="p-4">
                    <div className="space-y-1">
                      {slotsList.map((s, idx) => (
                        <span key={idx} className="inline-block bg-primary/10 text-primary text-[11px] font-label-bold px-2 py-0.5 rounded-full mr-1">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-primary">₹{totalAmt}</td>
                  <td className="p-4 font-medium">{b.paymentMethod}</td>
                  <td className="p-4">
                    <span className={`text-xs font-label-bold px-3 py-1 rounded-full ${
                      paymentStatus === 'Paid'
                        ? 'bg-primary-container/20 text-on-primary-container'
                        : 'bg-error-container/60 text-on-error-container'
                    }`}>
                      {paymentStatus}
                    </span>
                    {b.paidAt && (
                      <span className="block text-[10px] text-on-surface-variant mt-1">
                        Paid: {new Date(b.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-label-bold px-3 py-1 rounded-full ${
                      b.status === 'Confirmed' ? 'bg-primary-container/20 text-on-primary-container' :
                      b.status === 'Cancelled' || b.status === 'Rejected' ? 'bg-error-container text-on-error-container' :
                      'bg-secondary-container text-on-secondary-container'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  {showActions && (
                    <td 
                      onClick={(e) => e.stopPropagation()}
                      className="p-4"
                    >
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {isPendingPayment && b.status !== 'Cancelled' && onMarkPaid && (
                          <button
                            onClick={() => onMarkPaid(displayId)}
                            className="bg-emerald-600 text-white text-xs px-2.5 py-1.5 rounded-lg font-label-bold hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">payments</span>
                            Mark as Paid
                          </button>
                        )}
                        {(b.status === 'Pending Approval' || b.status === 'Pending') && onApprove && onReject && (
                          <>
                            <button
                              onClick={() => onApprove(displayId)}
                              className="bg-primary text-white text-xs px-2.5 py-1.5 rounded-lg font-label-bold hover:shadow-md transition-all"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => onReject(displayId)}
                              className="bg-error/10 text-error text-xs px-2.5 py-1.5 rounded-lg font-label-bold hover:bg-error/20 transition-all"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {b.status !== 'Cancelled' && onCancel && (
                          <button
                            onClick={() => onCancel(displayId)}
                            className="bg-surface-container border border-error/30 text-error text-xs px-2.5 py-1.5 rounded-lg font-label-bold hover:bg-error/10 transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

BookingTable.displayName = 'BookingTable';
