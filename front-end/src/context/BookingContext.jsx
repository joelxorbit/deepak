import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  createBookingService,
  trackBookingService,
  cancelBookingService,
  approveBookingService,
  rejectBookingService,
  markBookingAsPaidService,
  getBookedSlotsService,
  getBookingsService
} from '../services/bookingService';
import {
  getCompletedEventsService,
  addEventService,
  updateEventService,
  deleteEventService
} from '../services/eventService';
import {
  loginAdminService,
  logoutAdminService,
  fetchAdminDashboardStatsService,
  fetchCustomersService
} from '../services/adminService';
import { INITIAL_COMPLETED_EVENTS } from '../data/mockData';

const BookingContext = createContext();

export const BookingProvider = ({ children }) => {
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState(INITIAL_COMPLETED_EVENTS);
  const [customers, setCustomers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  // Feature-Specific Isolated Loading States (Zero Cross-Feature Leakage)
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [isTrackingBooking, setIsTrackingBooking] = useState(false);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [adminDataLoaded, setAdminDataLoaded] = useState(false);

  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return localStorage.getItem('elite_pitch_admin_auth') === 'true';
  });

  const [latestBooking, setLatestBooking] = useState(null);
  const [error, setError] = useState(null);

  // Concurrency & Race Condition Guards
  const isRefreshingRef = useRef(false);
  const refreshSeqRef = useRef(0);

  // Fetch initial completed events from backend API on mount
  const fetchEvents = useCallback(async () => {
    try {
      setIsEventsLoading(true);
      const data = await getCompletedEventsService();
      if (data && Array.isArray(data) && data.length > 0) {
        setEvents(data);
      }
    } catch (err) {
      console.warn('Backend API connection pending for events. Using default event showcase.');
    } finally {
      setIsEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Sync admin login state to localStorage for session persistence
  useEffect(() => {
    localStorage.setItem('elite_pitch_admin_auth', isAdminLoggedIn ? 'true' : 'false');
  }, [isAdminLoggedIn]);

  // Centralized helper to fetch all admin data (dashboard stats, bookings, customers)
  const refreshAdminData = useCallback(async (force = false) => {
    if (isRefreshingRef.current && !force) {
      return; // Lock guard: skip duplicate concurrent requests
    }

    const currentSeq = ++refreshSeqRef.current;
    isRefreshingRef.current = true;

    try {
      setIsDashboardLoading(true);

      const [stats, allBookings, allCustomers] = await Promise.all([
        fetchAdminDashboardStatsService(),
        getBookingsService(),
        fetchCustomersService()
      ]);

      // Unmount / Stale response check: only update state if this is the latest request
      if (refreshSeqRef.current === currentSeq) {
        if (stats) setDashboardStats(stats);
        if (allBookings) setBookings(allBookings);
        if (allCustomers) setCustomers(allCustomers);
        setAdminDataLoaded(true);
      }
    } catch (err) {
      console.warn('Admin API refresh warning:', err);
    } finally {
      if (refreshSeqRef.current === currentSeq) {
        isRefreshingRef.current = false;
        setIsDashboardLoading(false);
      }
    }
  }, []);

  // Automatically fetch admin data whenever admin login state becomes active
  useEffect(() => {
    if (isAdminLoggedIn && !adminDataLoaded) {
      refreshAdminData();
    }
  }, [isAdminLoggedIn, adminDataLoaded, refreshAdminData]);

  // Create a new booking (POST /api/bookings)
  const createBooking = useCallback(async (bookingData) => {
    try {
      setIsCreatingBooking(true);
      setError(null);
      const newBooking = await createBookingService(bookingData);
      setLatestBooking(newBooking);

      if (isAdminLoggedIn) {
        setBookings(prev => [newBooking, ...prev]);
      }

      return newBooking;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create booking. Please try again.';
      setError(msg);
      const fallbackBooking = {
        id: `BK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001`,
        customerName: bookingData.customerName,
        mobileNumber: bookingData.mobileNumber,
        date: bookingData.date,
        slots: bookingData.slots,
        paymentMethod: bookingData.paymentMethod,
        paymentStatus: bookingData.paymentMethod === 'Pay Now' ? 'Paid' : 'Pending',
        status: bookingData.paymentMethod === 'Pay Now' ? 'Confirmed' : 'Pending'
      };
      setLatestBooking(fallbackBooking);
      return fallbackBooking;
    } finally {
      setIsCreatingBooking(false);
    }
  }, [isAdminLoggedIn]);

  // Find bookings by ID or Phone (POST /api/bookings/track)
  const findBookingsByIdOrPhone = useCallback(async (query) => {
    try {
      setIsTrackingBooking(true);
      setError(null);
      const results = await trackBookingService(query);
      return results;
    } catch (err) {
      console.warn('Track booking API failed or offline.', err);
      return [];
    } finally {
      setIsTrackingBooking(false);
    }
  }, []);

  // Cancel booking (POST /api/bookings/cancel)
  const cancelBooking = useCallback(async (bookingId) => {
    try {
      setIsCancellingBooking(true);
      setError(null);
      const res = await cancelBookingService(bookingId);
      // Targeted local update
      setBookings(prev => prev.map(b => (b.bookingId === bookingId || b.id === bookingId || b._id === bookingId) ? { ...b, status: 'Cancelled', cancelledAt: new Date().toISOString() } : b));
      return res;
    } catch (err) {
      console.warn('Cancel booking API failed or offline.', err);
      return null;
    } finally {
      setIsCancellingBooking(false);
    }
  }, []);

  // OPTIMISTIC ADMIN ACTIONS (0ms Instant UI Response, zero full reloads)
  const approveBooking = useCallback(async (bookingId) => {
    let previousState = null;
    setBookings(prev => {
      previousState = prev;
      return prev.map(b => (b.bookingId === bookingId || b.id === bookingId || b._id === bookingId) ? { ...b, status: 'Confirmed' } : b);
    });

    try {
      const updated = await approveBookingService(bookingId);
      if (updated) {
        setBookings(prev => prev.map(b => (b.bookingId === bookingId || b.id === bookingId || b._id === bookingId) ? { ...b, ...updated, status: 'Confirmed' } : b));
      }
    } catch (err) {
      if (previousState) setBookings(previousState);
      setError(err.response?.data?.message || 'Failed to approve booking.');
    }
  }, []);

  const rejectBooking = useCallback(async (bookingId) => {
    let previousState = null;
    setBookings(prev => {
      previousState = prev;
      return prev.map(b => (b.bookingId === bookingId || b.id === bookingId || b._id === bookingId) ? { ...b, status: 'Rejected' } : b);
    });

    try {
      const updated = await rejectBookingService(bookingId);
      if (updated) {
        setBookings(prev => prev.map(b => (b.bookingId === bookingId || b.id === bookingId || b._id === bookingId) ? { ...b, ...updated, status: 'Rejected' } : b));
      }
    } catch (err) {
      if (previousState) setBookings(previousState);
      setError(err.response?.data?.message || 'Failed to reject booking.');
    }
  }, []);

  const markBookingAsPaid = useCallback(async (bookingId) => {
    const paidAtStr = new Date().toISOString();
    let previousState = null;

    setBookings(prev => {
      previousState = prev;
      return prev.map(b => (b.bookingId === bookingId || b.id === bookingId || b._id === bookingId) ? { ...b, paymentStatus: 'Paid', paidAt: paidAtStr, paymentCollectedBy: 'Admin' } : b);
    });

    // Optimistically update dashboard pending counters
    setDashboardStats(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        pendingPayAtSpotCount: Math.max(0, (prev.pendingPayAtSpotCount || 1) - 1)
      };
    });

    try {
      const updated = await markBookingAsPaidService(bookingId);
      if (updated) {
        setBookings(prev => prev.map(b => (b.bookingId === bookingId || b.id === bookingId || b._id === bookingId) ? { ...b, ...updated, paymentStatus: 'Paid' } : b));
      }
    } catch (err) {
      if (previousState) setBookings(previousState);
      setError(err.response?.data?.message || 'Failed to mark payment as paid.');
    }
  }, []);

  const addEvent = useCallback(async (newEventData) => {
    try {
      const created = await addEventService(newEventData);
      setEvents(prev => [created, ...prev]);
    } catch (err) {
      setEvents(prev => [{ ...newEventData, id: `evt-${Date.now()}`, status: 'Completed' }, ...prev]);
    }
  }, []);

  const editEvent = useCallback(async (eventId, updatedData) => {
    try {
      const updated = await updateEventService(eventId, updatedData);
      setEvents(prev => prev.map(e => (e.id === eventId || e._id === eventId ? updated : e)));
    } catch (err) {
      setEvents(prev => prev.map(e => (e.id === eventId || e._id === eventId ? { ...e, ...updatedData } : e)));
    }
  }, []);

  const deleteEvent = useCallback(async (eventId) => {
    try {
      await deleteEventService(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId && e._id !== eventId));
    } catch (err) {
      setEvents(prev => prev.filter(e => e.id !== eventId && e._id !== eventId));
    }
  }, []);

  const loginAdmin = useCallback(async (username, password) => {
    try {
      setIsDashboardLoading(true);
      setError(null);
      const res = await loginAdminService(username, password);
      if (res.success) {
        setIsAdminLoggedIn(true);
        setAdminDataLoaded(false);
        await refreshAdminData(true);
      }
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid username or password.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsDashboardLoading(false);
    }
  }, [refreshAdminData]);

  const logoutAdmin = useCallback(async () => {
    try {
      await logoutAdminService();
    } catch (err) {
      console.warn('Logout API warning:', err);
    } finally {
      setIsAdminLoggedIn(false);
      setAdminDataLoaded(false);
      setBookings([]);
      setCustomers([]);
      setDashboardStats(null);
    }
  }, []);

  const getBookedSlotsForDate = useCallback(async (dateString) => {
    if (!dateString) return [];
    try {
      const slots = await getBookedSlotsService(dateString);
      return slots;
    } catch (err) {
      return [];
    }
  }, []);

  // Memoize Context Value object to eliminate unnecessary context re-renders
  const contextValue = useMemo(() => ({
    bookings,
    events,
    customers,
    dashboardStats,
    isCreatingBooking,
    isTrackingBooking,
    isCancellingBooking,
    isEventsLoading,
    isDashboardLoading,
    adminDataLoaded,
    latestBooking,
    setLatestBooking,
    isTrackModalOpen,
    setIsTrackModalOpen,
    isCancelModalOpen,
    setIsCancelModalOpen,
    isAdminLoggedIn,
    setIsAdminLoggedIn,
    error,
    createBooking,
    findBookingsByIdOrPhone,
    cancelBooking,
    approveBooking,
    rejectBooking,
    markBookingAsPaid,
    addEvent,
    editEvent,
    deleteEvent,
    loginAdmin,
    logoutAdmin,
    refreshAdminData,
    getBookedSlotsForDate
  }), [
    bookings,
    events,
    customers,
    dashboardStats,
    isCreatingBooking,
    isTrackingBooking,
    isCancellingBooking,
    isEventsLoading,
    isDashboardLoading,
    adminDataLoaded,
    latestBooking,
    isTrackModalOpen,
    isCancelModalOpen,
    isAdminLoggedIn,
    error,
    createBooking,
    findBookingsByIdOrPhone,
    cancelBooking,
    approveBooking,
    rejectBooking,
    markBookingAsPaid,
    addEvent,
    editEvent,
    deleteEvent,
    loginAdmin,
    logoutAdmin,
    refreshAdminData,
    getBookedSlotsForDate
  ]);

  return (
    <BookingContext.Provider value={contextValue}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
