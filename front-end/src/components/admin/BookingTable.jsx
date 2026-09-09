import React, { memo, useState } from 'react';
import { downloadTicketPdfService } from '../../services/bookingService';

// Helper to format date nicely e.g. "Sep 09, 2026"
const formatDate = (raw) => {
  if (!raw) return 'N/A';
  const dateStr = typeof raw === 'string' ? raw.split('T')[0] : raw;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const BookingTable = memo(({ bookings = [], onApprove, onReject, onCancel, onMarkPaid, onReview, onRowClick, showActions = true }) => {
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownloadPdf = async (e, bookingId) => {
    e.stopPropagation();
    if (!bookingId) return;
    try {
      setDownloadingId(bookingId);
      await downloadTicketPdfService(bookingId);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to download ticket PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (bookings.length === 0) {
    return (
      <div className="p-16 text-center bg-white rounded-3xl border border-black/5 shadow-sm space-y-4">
        <div className="w-16 h-16 bg-surface-container-low rounded-2xl flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">event_busy</span>
        </div>
        <div>
          <p className="font-bold text-on-surface">No reservations found</p>
          <p className="text-on-surface-variant text-sm mt-1">No bookings match your current search and filter criteria.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Mobile Card List View ── */}
      <div className="block md:hidden space-y-3">
        {bookings.map((b) => {
          const displayId = b.bookingId || b.id || b._id;
          const customerName = b.customerName || b.customer?.name || 'N/A';
          const mobileNumber = b.mobileNumber || b.customerPhone || b.customer?.phone || 'N/A';
          const displayDate = formatDate(b.date || b.dateStr);
          const slotsList = Array.isArray(b.slots) ? b.slots : (Array.isArray(b.timeSlots) ? b.timeSlots : []);
          const totalAmt = b.totalAmount || b.subtotal || (slotsList.length * 354);
          const paymentStatus = b.paymentStatus || (b.paymentMethod === 'Pay Now' ? 'Paid' : 'Pending');
          const isPendingPayment = paymentStatus === 'Pending' || paymentStatus === 'Advance Paid';
          const isReviewed = Boolean(b.isReviewed);

          return (
            <div
              key={displayId}
              onClick={() => onRowClick && onRowClick(b)}
              className={`bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden transition-all ${onRowClick ? 'cursor-pointer hover:border-primary/30 hover:shadow-md' : ''}`}
            >
              <div className="flex justify-between items-center px-4 py-3 bg-surface-container-low border-b border-black/5">
                <span className="font-bold text-primary text-sm tracking-wide">{displayId}</span>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  b.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' :
                  b.status === 'Cancelled' || b.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-800'
                }`}>{b.status}</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-on-surface">{customerName}</p>
                    <p className="text-xs text-on-surface-variant font-mono mt-0.5">{mobileNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-primary text-lg">₹{totalAmt}</p>
                    <p className="text-[10px] text-on-surface-variant">{displayDate}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {slotsList.map((s, idx) => (
                    <span key={idx} className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-lg border border-primary/15">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-black/5">
                  <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                    paymentStatus === 'Paid' || paymentStatus === 'Fully Paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    paymentStatus === 'Advance Paid' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                    'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>{paymentStatus}</span>
                  {isReviewed ? (
                    <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="material-symbols-outlined text-xs">check_circle</span> Reviewed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                      <span className="material-symbols-outlined text-xs">pending</span> Unreviewed
                    </span>
                  )}
                </div>
                {showActions && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-black/5">
                    <button onClick={(e) => handleDownloadPdf(e, displayId)} disabled={downloadingId === displayId}
                      className="flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50">
                      <span className="material-symbols-outlined text-sm text-emerald-600">
                        {downloadingId === displayId ? 'progress_activity' : 'picture_as_pdf'}
                      </span>PDF
                    </button>
                    {!isReviewed && onReview && (
                      <button onClick={() => onReview(displayId)} className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-all">
                        <span className="material-symbols-outlined text-sm">done_all</span> Review
                      </button>
                    )}
                    {isPendingPayment && b.status !== 'Cancelled' && onMarkPaid && (
                      <button onClick={() => onMarkPaid(displayId)} className="flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-700 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-sm">payments</span> Mark Paid
                      </button>
                    )}
                    {b.status !== 'Cancelled' && onCancel && (
                      <button onClick={() => onCancel(b)} className="flex items-center gap-1 border border-red-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-red-50 transition-all">
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop Table View ── */}
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-left text-sm table-fixed">
          <colgroup>
            {showActions ? (
              <>
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '11%' }} />
              </>
            ) : (
              <>
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '9%' }} />
              </>
            )}
          </colgroup>
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-white border-b-2 border-slate-100">
              <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Booking ID</th>
              <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Time Slots</th>
              <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Payment</th>
              <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Review</th>
              <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Status</th>
              {showActions && <th className="px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {bookings.map((b, rowIndex) => {
              const displayId = b.bookingId || b.id || b._id;
              const customerName = b.customerName || b.customer?.name || 'N/A';
              const mobileNumber = b.mobileNumber || b.customerPhone || b.customer?.phone || '';
              const displayDate = formatDate(b.date || b.dateStr);
              const dateParts = displayDate.split(' ');
              const slotsList = Array.isArray(b.slots) ? b.slots : (Array.isArray(b.timeSlots) ? b.timeSlots : []);
              const totalAmt = b.totalAmount || b.subtotal || (slotsList.length * 354);
              const paymentStatus = b.paymentStatus || (b.paymentMethod === 'Pay Now' ? 'Paid' : 'Pending');
              const isPendingPayment = paymentStatus === 'Pending' || paymentStatus === 'Advance Paid';
              const isReviewed = Boolean(b.isReviewed);
              const isCancelled = b.status === 'Cancelled' || b.status === 'Rejected';

              const payBadgeStyle =
                paymentStatus === 'Paid' || paymentStatus === 'Fully Paid' || paymentStatus === 'Cash Received'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : paymentStatus === 'Advance Paid'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200';

              const statusBadgeStyle =
                b.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                isCancelled ? 'bg-red-50 text-red-700 border border-red-200' :
                'bg-amber-50 text-amber-700 border border-amber-200';

              return (
                <tr
                  key={displayId}
                  onClick={() => onRowClick && onRowClick(b)}
                  className={`group transition-colors ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-primary/[0.025] ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {/* Booking ID */}
                  <td className="px-4 py-4 align-top">
                    <span className="font-extrabold text-primary text-xs tracking-wide block leading-relaxed">{displayId}</span>
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-4 align-top overflow-hidden">
                    <p className="font-bold text-slate-800 text-xs leading-tight truncate">{customerName}</p>
                    {mobileNumber && (
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-wide">{mobileNumber}</p>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-4 align-top">
                    <span className="text-xs font-bold text-slate-700 block">{dateParts[0]} {dateParts[1]}</span>
                    <span className="text-[10px] text-slate-400">{dateParts[2]}</span>
                  </td>

                  {/* Slots */}
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {slotsList.map((s, idx) => (
                        <span key={idx} className="inline-block bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-md border border-primary/15 whitespace-nowrap">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-4 align-top">
                    <span className="font-extrabold text-slate-800 text-sm">₹{totalAmt.toLocaleString('en-IN')}</span>
                  </td>

                  {/* Payment */}
                  <td className="px-4 py-4 align-top">
                    <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-lg ${payBadgeStyle}`}>
                      {paymentStatus}
                    </span>
                  </td>

                  {/* Review */}
                  <td className="px-4 py-4 align-top">
                    {isReviewed ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-emerald-200">
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        Reviewed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-amber-200">
                        <span className="material-symbols-outlined text-xs">pending</span>
                        Pending
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4 align-top">
                    <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-lg ${statusBadgeStyle}`}>
                      {b.status}
                    </span>
                    {b.cancellation?.reason && (
                      <p className="text-[10px] text-red-500 mt-1 truncate max-w-[90px]" title={b.cancellation.reason}>
                        {b.cancellation.reason}
                      </p>
                    )}
                  </td>

                  {/* Actions */}
                  {showActions && (
                    <td onClick={(e) => e.stopPropagation()} className="px-4 py-4 align-top">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => handleDownloadPdf(e, displayId)}
                          disabled={downloadingId === displayId}
                          title="Download PDF"
                          className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold px-2 py-1.5 rounded-lg hover:bg-slate-200 transition-all disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[13px] text-emerald-600">
                            {downloadingId === displayId ? 'progress_activity' : 'picture_as_pdf'}
                          </span>
                          PDF
                        </button>

                        {!isReviewed && onReview && (
                          <button
                            onClick={() => onReview(displayId)}
                            className="flex items-center gap-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold px-2 py-1.5 rounded-lg hover:bg-indigo-100 transition-all"
                          >
                            <span className="material-symbols-outlined text-[13px]">done_all</span>
                            Review
                          </button>
                        )}

                        {isPendingPayment && b.status !== 'Cancelled' && onMarkPaid && (
                          <button
                            onClick={() => onMarkPaid(displayId)}
                            className="flex items-center gap-0.5 bg-emerald-600 text-white text-[11px] font-bold px-2 py-1.5 rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[13px]">payments</span>
                            Paid
                          </button>
                        )}

                        {(b.status === 'Pending Approval' || b.status === 'Pending') && onApprove && onReject && (
                          <>
                            <button onClick={() => onApprove(displayId)} className="bg-primary text-white text-[11px] font-bold px-2 py-1.5 rounded-lg hover:shadow-md transition-all">
                              Approve
                            </button>
                            <button onClick={() => onReject(displayId)} className="bg-red-50 border border-red-200 text-red-600 text-[11px] font-bold px-2 py-1.5 rounded-lg hover:bg-red-100 transition-all">
                              Reject
                            </button>
                          </>
                        )}

                        {b.status !== 'Cancelled' && onCancel && (
                          <button
                            onClick={() => onCancel(b)}
                            className="border border-red-200 text-red-600 text-[11px] font-bold px-2 py-1.5 rounded-lg hover:bg-red-50 transition-all"
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

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400 font-medium">
            Showing <span className="font-bold text-slate-600">{bookings.length}</span> reservation{bookings.length !== 1 ? 's' : ''}
          </p>
          <span className="text-[10px] text-slate-300 font-mono">Real-time data</span>
        </div>
      </div>
    </div>
  );
});

BookingTable.displayName = 'BookingTable';
