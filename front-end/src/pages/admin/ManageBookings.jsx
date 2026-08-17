import React, { useState, useMemo } from 'react';
import { useBooking } from '../../context/BookingContext';
import { BookingTable } from '../../components/admin/BookingTable';
import { BookingDetailsDrawer } from '../../components/admin/BookingDetailsDrawer';
import { InvoiceModal } from '../../components/admin/InvoiceModal';

export const ManageBookings = () => {
  const { bookings, isDashboardLoading } = useBooking();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedBookingForDrawer, setSelectedBookingForDrawer] = useState(null);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState(null);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];

  // Advanced Instant Filtering
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const displayId = b.bookingId || b.id || b._id || '';
      const customerName = b.customerName || b.customer?.name || '';
      const phone = b.mobileNumber || b.customerPhone || b.customer?.phone || '';
      const bDate = typeof b.date === 'string' ? b.date.split('T')[0] : b.dateStr || '';
      const paymentStatus = b.paymentStatus || (b.paymentMethod === 'Pay Now' ? 'Paid' : 'Pending');

      // Search match
      const query = search.toLowerCase().trim();
      const matchesSearch = !query || 
        displayId.toLowerCase().includes(query) ||
        customerName.toLowerCase().includes(query) ||
        phone.includes(query);

      if (!matchesSearch) return false;

      // Filter match
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Today') return bDate === todayStr;
      if (activeFilter === 'Tomorrow') return bDate === tomorrowStr;
      if (activeFilter === 'ThisWeek') {
        const pastWeek = new Date(now.getTime() - 7 * 86400000);
        return new Date(b.createdAt || b.date) >= pastWeek;
      }
      if (activeFilter === 'ThisMonth') {
        const pastMonth = new Date(now.getTime() - 30 * 86400000);
        return new Date(b.createdAt || b.date) >= pastMonth;
      }
      if (activeFilter === 'Pending') return b.status === 'Pending';
      if (activeFilter === 'Confirmed') return b.status === 'Confirmed';
      if (activeFilter === 'Cancelled') return b.status === 'Cancelled';
      if (activeFilter === 'Paid') return paymentStatus === 'Paid';
      if (activeFilter === 'PayAtSpot') return b.paymentMethod === 'Pay at Spot';

      return true;
    });
  }, [bookings, search, activeFilter, todayStr, tomorrowStr, now]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-3xl font-extrabold text-on-surface">Manage Reservations</h1>
          <p className="text-on-surface-variant font-body-md text-sm mt-1">
            Real-time reservation controls, quick status actions, and tax receipt printing.
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
            {['All', 'Today', 'Tomorrow', 'ThisWeek', 'Pending', 'Confirmed', 'Paid', 'PayAtSpot'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs font-label-bold transition-all flex-shrink-0 flex items-center justify-center ${
                  activeFilter === filter
                    ? 'bg-primary text-white shadow-md shadow-primary/20 font-bold'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
                }`}
              >
                {filter === 'ThisWeek' ? 'This Week' : filter === 'PayAtSpot' ? 'Pay at Spot' : filter}
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
    </div>
  );
};
