import React, { useState, useMemo } from 'react';
import { useBooking } from '../../context/BookingContext';

export const CustomersPage = () => {
  const { customers, bookings } = useBooking();
  const [searchTerm, setSearchTerm] = useState('');

  // Enrich customer records with derived spending metrics
  const enrichedCustomers = useMemo(() => {
    return customers.map(c => {
      const customerBookings = bookings.filter(b => 
        (b.customerId === c.id || b.customerPhone === c.phone || b.mobileNumber === c.phone)
      );

      const bookingCount = customerBookings.length || c.totalBookings || 1;
      const totalSpent = customerBookings.reduce((sum, b) => sum + (b.totalAmount || 354), 0) || (bookingCount * 354);
      
      const payNowCount = customerBookings.filter(b => b.paymentMethod === 'Pay Now').length;
      const preferredPayment = payNowCount >= (customerBookings.length / 2) ? 'Pay Now (Online)' : 'Pay at Spot';

      return {
        ...c,
        totalBookingsCount: bookingCount,
        totalSpent,
        preferredPayment,
        isVip: bookingCount >= 3
      };
    });
  }, [customers, bookings]);

  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter(c => 
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm))
    );
  }, [enrichedCustomers, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-3xl font-extrabold text-on-surface">Customers Directory</h1>
        <p className="text-on-surface-variant font-body-md text-sm mt-1">
          Registered player history, lifetime spending metrics, and mobile contact directory.
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-6">
        <div className="w-full md:w-80 relative">
          <input
            type="text"
            placeholder="Search customers by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
          />
          <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-xl">search</span>
        </div>

        {/* Mobile View: Cards */}
        <div className="block md:hidden space-y-4">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((c) => (
              <div key={c.id} className="p-5 bg-surface-container-low rounded-2xl border border-black/5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-on-surface text-base">{c.name}</h3>
                    <p className="text-xs font-mono text-primary font-bold">{c.phone}</p>
                  </div>
                  <span className={`text-xs font-label-bold px-3 py-1 rounded-full ${
                    c.isVip ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-primary/10 text-primary'
                  }`}>
                    {c.isVip ? 'VIP Player' : 'Regular Player'}
                  </span>
                </div>
                <div className="text-xs space-y-1 text-on-surface-variant pt-2 border-t border-black/5">
                  <div className="flex justify-between">
                    <span>Total Bookings:</span>
                    <strong className="text-on-surface">{c.totalBookingsCount} match(es)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Lifetime Spent:</span>
                    <strong className="text-primary font-bold">₹{c.totalSpent}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Pref:</span>
                    <span>{c.preferredPayment}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-on-surface-variant text-sm">
              No customer records found matching "{searchTerm}".
            </div>
          )}
        </div>

        {/* Desktop View: Data Table */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-black/5">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low border-b border-black/5 text-on-surface-variant font-label-bold text-xs uppercase">
              <tr>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Mobile Number</th>
                <th className="p-4">Total Matches</th>
                <th className="p-4">Lifetime Spent (INR)</th>
                <th className="p-4">Payment Preference</th>
                <th className="p-4">Tier Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="p-4 font-headline-md font-bold text-on-surface">{c.name}</td>
                    <td className="p-4 font-mono text-xs text-on-surface-variant">{c.phone}</td>
                    <td className="p-4 font-bold text-primary">{c.totalBookingsCount} match(es)</td>
                    <td className="p-4 font-bold text-primary">₹{c.totalSpent}</td>
                    <td className="p-4 text-xs text-on-surface-variant">{c.preferredPayment}</td>
                    <td className="p-4">
                      <span className={`text-xs font-label-bold px-3 py-1 rounded-full ${
                        c.isVip ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-primary-container/20 text-on-primary-container'
                      }`}>
                        {c.isVip ? 'VIP Player' : 'Active Player'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-on-surface-variant">
                    No customer records found matching "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
