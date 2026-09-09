import React, { useState, useMemo } from 'react';
import { useBooking } from '../../context/BookingContext';
import { BookingTable } from '../../components/admin/BookingTable';
import { BookingDetailsDrawer } from '../../components/admin/BookingDetailsDrawer';
import { InvoiceModal } from '../../components/admin/InvoiceModal';

export const ManageBookings = () => {
  const {
    bookings,
    isDashboardLoading,
    approveBooking,
    rejectBooking,
    markBookingAsPaid,
    reviewBooking,
    adminCancelBooking
  } = useBooking();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedBookingForDrawer, setSelectedBookingForDrawer] = useState(null);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState(null);

  // Admin Cancellation Dialog State
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Phase 5 Filtering Logic
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const displayId = b.bookingId || b.id || b._id || '';
      const customerName = b.customerName || b.customer?.name || '';
      const phone = b.mobileNumber || b.customerPhone || b.customer?.phone || '';
      const bDate = typeof b.date === 'string' ? b.date.split('T')[0] : b.dateStr || '';
      const paymentStatus = b.paymentStatus || (b.paymentMethod === 'Pay Now' ? 'Paid' : 'Pending');
      const isReviewed = Boolean(b.isReviewed);

      // Search match
      const query = search.toLowerCase().trim();
      const matchesSearch = !query || 
        displayId.toLowerCase().includes(query) ||
        customerName.toLowerCase().includes(query) ||
        phone.includes(query);

      if (!matchesSearch) return false;

      // Filter match
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Unreviewed') return !isReviewed && b.status !== 'Cancelled';
      if (activeFilter === 'Reviewed') return isReviewed;
      if (activeFilter === 'Today') return bDate === todayStr;
      if (activeFilter === 'Upcoming') return bDate >= todayStr && b.status !== 'Cancelled';
      if (activeFilter === 'Cancelled') return b.status === 'Cancelled' || b.cancellation?.isCancelled === true;
      if (activeFilter === 'Advance Paid') return paymentStatus === 'Advance Paid';
      if (activeFilter === 'Balance Pending') return (b.balanceDue || 0) > 0 || paymentStatus === 'Advance Paid';
      if (activeFilter === 'Fully Paid') return paymentStatus === 'Fully Paid' || paymentStatus === 'Paid' || paymentStatus === 'Cash Received';

      return true;
    });
  }, [bookings, search, activeFilter, todayStr]);

  const handleOpenCancelDialog = (booking) => {
    setCancellingBooking(booking);
    setCancelReason('');
    setCancelError('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason || cancelReason.trim().length < 3) {
      setCancelError('Please enter a valid cancellation reason (minimum 3 characters).');
      return;
    }

    try {
      setIsSubmittingCancel(true);
      setCancelError('');
      const targetId = cancellingBooking.bookingId || cancellingBooking.id || cancellingBooking._id;
      await adminCancelBooking(targetId, cancelReason.trim());
      setCancellingBooking(null);
      setCancelReason('');
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel booking.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const filterTabs = [
    { id: 'All', label: 'All' },
    { id: 'Unreviewed', label: 'Unreviewed' },
    { id: 'Reviewed', label: 'Reviewed' },
    { id: 'Today', label: 'Today' },
    { id: 'Upcoming', label: 'Upcoming' },
    { id: 'Cancelled', label: 'Cancelled' },
    { id: 'Advance Paid', label: 'Advance Paid' },
    { id: 'Balance Pending', label: 'Balance Pending' },
    { id: 'Fully Paid', label: 'Fully Paid' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-3xl font-extrabold text-on-surface">Manage Reservations</h1>
          <p className="text-on-surface-variant font-body-md text-sm mt-1">
            Real-time review queue, cancellation controls, and reservation tracking.
          </p>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="w-full md:w-80 relative">
            <input
              type="text"
              placeholder="Search by ID, Name, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
            />
            <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-xl">search</span>
          </div>

          <div className="flex gap-2 overflow-x-auto w-full pb-1 md:pb-0">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs font-label-bold transition-all flex-shrink-0 flex items-center justify-center ${
                  activeFilter === tab.id
                    ? 'bg-primary text-white shadow-md shadow-primary/20 font-bold'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings Data Table */}
      <BookingTable
        bookings={filteredBookings}
        isLoading={isDashboardLoading}
        onRowClick={(booking) => setSelectedBookingForDrawer(booking)}
        onApprove={approveBooking}
        onReject={rejectBooking}
        onMarkPaid={markBookingAsPaid}
        onReview={reviewBooking}
        onCancel={handleOpenCancelDialog}
      />

      {/* Booking Side Drawer */}
      {selectedBookingForDrawer && (
        <BookingDetailsDrawer
          booking={selectedBookingForDrawer}
          onClose={() => setSelectedBookingForDrawer(null)}
          onPrintInvoice={(b) => setSelectedBookingForInvoice(b)}
        />
      )}

      {/* Printable Tax Invoice Modal */}
      {selectedBookingForInvoice && (
        <InvoiceModal
          booking={selectedBookingForInvoice}
          onClose={() => setSelectedBookingForInvoice(null)}
        />
      )}

      {/* Admin Cancellation Dialog with Mandatory Reason */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-black/5 animate-scale-up">
            <div className="flex items-center gap-3 text-error">
              <div className="p-3 bg-error/10 rounded-2xl">
                <span className="material-symbols-outlined text-2xl">cancel</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-on-surface">Cancel Reservation</h3>
                <p className="text-xs text-on-surface-variant">Booking #{cancellingBooking.bookingId || cancellingBooking.id}</p>
              </div>
            </div>

            <div className="bg-surface-container-low p-4 rounded-2xl space-y-1.5 text-xs text-on-surface-variant">
              <p><strong className="text-on-surface">Customer:</strong> {cancellingBooking.customerName || 'N/A'}</p>
              <p><strong className="text-on-surface">Date & Slots:</strong> {cancellingBooking.dateStr || cancellingBooking.date} ({Array.isArray(cancellingBooking.slots) ? cancellingBooking.slots.join(', ') : 'N/A'})</p>
              <p><strong className="text-on-surface">Total / Advance:</strong> ₹{cancellingBooking.totalAmount || 0} (Advance: ₹{cancellingBooking.advancePaid || 0})</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-label-bold text-on-surface uppercase tracking-wider">
                Mandatory Cancellation Reason <span className="text-error">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Enter detailed reason for admin cancellation (e.g. Customer requested refund, Weather disruption, Double booking)..."
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  if (cancelError) setCancelError('');
                }}
                className="w-full bg-surface-container-low border border-outline-variant rounded-2xl p-3 text-sm focus:outline-none focus:border-error transition-colors resize-none"
              />
              {cancelError && (
                <p className="text-xs text-error font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {cancelError}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={() => setCancellingBooking(null)}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl text-xs font-label-bold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleConfirmCancel}
                className="min-h-[44px] px-5 py-2.5 bg-error text-white rounded-2xl text-xs font-label-bold hover:bg-error/90 transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingCancel ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    Cancelling...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">check</span>
                    Confirm Cancellation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

