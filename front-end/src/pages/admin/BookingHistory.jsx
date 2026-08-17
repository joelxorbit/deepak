import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';

export const BookingHistory = () => {
  const { bookings } = useBooking();
  const [searchTerm, setSearchTerm] = useState('');

  const historyBookings = bookings.filter(b => {
    const displayId = (b.bookingId || b.id || b._id || '').toString().toLowerCase();
    const customerName = (b.customerName || b.customer?.name || '').toLowerCase();
    const mobileNumber = (b.mobileNumber || b.customerPhone || b.customer?.phone || '').toString();
    const searchLower = searchTerm.toLowerCase();

    return displayId.includes(searchLower) || customerName.includes(searchLower) || mobileNumber.includes(searchLower);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-3xl">Booking History</h1>
        <p className="text-on-surface-variant font-body-md text-sm mt-1">Complete chronological audit log of all historical bookings.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
        <div className="w-full md:w-80 relative mb-6">
          <input
            type="text"
            placeholder="Search history by ID, Name, or Mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low border-b border-black/5 text-on-surface-variant font-label-bold text-xs uppercase">
              <tr>
                <th className="p-4">Booking ID</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4">Date</th>
                <th className="p-4">Time Slots</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">Final Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {historyBookings.map((b) => {
                const displayId = b.bookingId || b.id || b._id;
                const customerName = b.customerName || b.customer?.name || 'N/A';
                const mobileNumber = b.mobileNumber || b.customerPhone || b.customer?.phone || 'N/A';
                const displayDate = typeof b.date === 'string' ? b.date.split('T')[0] : b.dateStr || 'N/A';
                const slotsList = Array.isArray(b.slots) ? b.slots : (Array.isArray(b.timeSlots) ? b.timeSlots : []);

                return (
                  <tr key={displayId}>
                    <td className="p-4 font-headline-md text-primary font-bold">{displayId}</td>
                    <td className="p-4 font-medium">{customerName}</td>
                    <td className="p-4 text-on-surface-variant">{mobileNumber}</td>
                    <td className="p-4">{displayDate}</td>
                    <td className="p-4 text-xs">{slotsList.join(', ')}</td>
                    <td className="p-4">{b.paymentMethod}</td>
                    <td className="p-4">
                      <span className={`text-xs font-label-bold px-3 py-1 rounded-full ${
                        b.status === 'Confirmed' || b.status === 'Completed' ? 'bg-primary-container/20 text-on-primary-container' :
                        b.status === 'Cancelled' || b.status === 'Rejected' ? 'bg-error-container text-on-error-container' :
                        'bg-secondary-container text-on-secondary-container'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
