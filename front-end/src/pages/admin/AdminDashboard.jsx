import React, { useEffect } from 'react';
import { useBooking } from '../../context/BookingContext';
import { StatCard } from '../../components/admin/StatCard';
import { BookingTable } from '../../components/admin/BookingTable';

export const AdminDashboard = ({ setCurrentTab }) => {
  const {
    bookings,
    customers,
    dashboardStats,
    isDashboardLoading,
    adminDataLoaded,
    refreshAdminData
  } = useBooking();

  // Always refresh/ensure fresh data when entering dashboard
  useEffect(() => {
    let isMounted = true;
    if (!adminDataLoaded) {
      refreshAdminData(false);
    }
    return () => {
      isMounted = false;
    };
  }, [adminDataLoaded, refreshAdminData]);

  // Loading skeleton state guard: Never display '0' cards while loading!
  const showSkeleton = isDashboardLoading || !adminDataLoaded || !dashboardStats;

  if (showSkeleton) {
    return (
      <div className="space-y-8 animate-pulse">
        <div>
          <div className="h-8 w-64 bg-surface-variant/60 rounded-xl mb-2"></div>
          <div className="h-4 w-96 bg-surface-variant/40 rounded-lg"></div>
        </div>

        {/* 6 Stat Card Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-3 w-28 bg-surface-variant/50 rounded"></div>
                  <div className="h-8 w-20 bg-surface-variant/80 rounded-lg"></div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-surface-variant/40"></div>
              </div>
              <div className="h-3 w-36 bg-surface-variant/40 rounded"></div>
            </div>
          ))}
        </div>

        {/* Recent Bookings Table Skeleton */}
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-6 w-40 bg-surface-variant/60 rounded-lg"></div>
            <div className="h-4 w-24 bg-surface-variant/40 rounded"></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 w-full bg-surface-container-low rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  
  const todayBookingsCount = dashboardStats?.todayBookingsCount ?? bookings.filter(b => (b.dateStr === todayStr || (typeof b.date === 'string' && b.date.startsWith(todayStr))) && b.status !== 'Cancelled').length;
  const weeklyBookingsCount = dashboardStats?.weeklyBookingsCount ?? bookings.filter(b => b.status !== 'Cancelled').length;
  
  const pendingPayAtSpotBookings = bookings.filter(b => 
    b.paymentMethod === 'Pay at Spot' && 
    (b.paymentStatus === 'Pending' || (!b.paymentStatus && b.status !== 'Cancelled')) && 
    b.status !== 'Cancelled' && 
    b.status !== 'Rejected'
  );

  const pendingPayAtSpotCount = dashboardStats?.pendingPayAtSpotCount ?? pendingPayAtSpotBookings.length;
  const pendingPayAtSpotAmount = dashboardStats?.pendingPayAtSpotAmount ?? pendingPayAtSpotBookings.reduce((sum, b) => sum + (b.totalAmount || ((b.slots?.length || b.timeSlots?.length || 1) * 354)), 0);

  const totalCustomersCount = dashboardStats?.totalCustomersCount ?? customers.length;

  const totalEarnings = dashboardStats?.totalEarnings ?? bookings
    .filter(b => b.status !== 'Cancelled' && b.status !== 'Rejected')
    .reduce((sum, b) => sum + (b.totalAmount || ((b.slots?.length || b.timeSlots?.length || 1) * 354)), 0);

  const unreadEnquiriesCount = dashboardStats?.unreadEnquiriesCount ?? 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-3xl font-extrabold text-on-surface">Admin Control Dashboard</h1>
        <p className="text-on-surface-variant font-body-md text-sm mt-1">
          Real-time statistics, earnings summary, and recent reservation activity.
        </p>
      </div>

      {/* Real Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Booking Earnings"
          count={`₹${totalEarnings}`}
          subtitle="Cumulative confirmed revenue"
          icon="payments"
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />

        <StatCard
          title="Today's Bookings"
          count={todayBookingsCount}
          subtitle="Active slots booked for today"
          icon="today"
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />

        <StatCard
          title="Weekly Bookings"
          count={weeklyBookingsCount}
          subtitle="Total bookings this week"
          icon="date_range"
          iconBg="bg-tertiary-container/30"
          iconColor="text-tertiary"
        />

        <StatCard
          title="Pending Pay at Spot"
          count={pendingPayAtSpotCount}
          subtitle={`₹${pendingPayAtSpotAmount} pending collection`}
          icon="pending_actions"
          iconBg="bg-error-container/40"
          iconColor="text-error"
        />

        <StatCard
          title="Total Customers"
          count={totalCustomersCount}
          subtitle="Registered phone numbers"
          icon="groups"
          iconBg="bg-surface-variant"
          iconColor="text-on-surface"
        />

        <StatCard
          title="Unread Enquiries"
          count={unreadEnquiriesCount}
          subtitle="Messages pending response"
          icon="mail"
          iconBg="bg-secondary-container"
          iconColor="text-secondary"
        />
      </div>

      <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="font-headline-md text-headline-md text-xl font-bold text-on-surface">Recent Reservations</h2>
          {setCurrentTab && (
            <button
              onClick={() => setCurrentTab('manage-bookings')}
              className="text-primary font-label-bold text-xs hover:underline flex items-center gap-1"
            >
              View All &rarr;
            </button>
          )}
        </div>

        <BookingTable bookings={bookings.slice(0, 5)} showActions={false} />
      </div>
    </div>
  );
};
