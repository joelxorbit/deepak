import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  createBookingService,
  trackBookingService,
  cancelBookingService,
  approveBookingService,
  rejectBookingService,
  markBookingAsPaidService,
  payBalanceBookingService,
  getBookedSlotsService,
  getBookingsService,
  getAvailabilityService,
  createHoldService,
  releaseHoldService,
  reviewBookingService,
  adminCancelBookingService,
  getBlockedSlotsService,
  blockSlotService,
  unblockSlotService
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
  const [blockedSlots, setBlockedSlots] = useState([]);

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

  const [latestBooking, setLatestBooking] = useState(() => {
    try {
      const saved = sessionStorage.getItem('elite_pitch_latest_booking');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
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

  // Centralized helper to fetch all admin data (dashboard stats, bookings, customers, blocked slots)
  const refreshAdminData = useCallback(async (force = false) => {
    if (isRefreshingRef.current && !force) {
      return; // Lock guard: skip duplicate concurrent requests
    }

    const currentSeq = ++refreshSeqRef.current;
    isRefreshingRef.current = true;

    try {
      setIsDashboardLoading(true);

      const [stats, allBookings, allCustomers, allBlocked] = await Promise.all([
        fetchAdminDashboardStatsService(),
        getBookingsService(),
        fetchCustomersService(),
        getBlockedSlotsService().catch(() => [])
      ]);

      // Unmount / Stale response check: only update state if this is the latest request
      if (refreshSeqRef.current === currentSeq) {
        if (stats) setDashboardStats(stats);
        if (allBookings) setBookings(allBookings);
        if (allCustomers) setCustomers(allCustomers);
        if (allBlocked) setBlockedSlots(allBlocked);
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

  // Unique session-based holder identifier for temporary checkout slot holds
  const getHolderId = useCallback(() => {
    try {
      let id = sessionStorage.getItem('elite_pitch_holder_id');
      if (!id) {
        id = 'h_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
        sessionStorage.setItem('elite_pitch_holder_id', id);
      }
      return id;
    } catch (e) {
      return 'h_' + Date.now();
    }
  }, []);

  // Create a new booking (POST /api/bookings)
  const createBooking = useCallback(async (bookingData) => {
    try {
      setIsCreatingBooking(true);
      setError(null);
      const holderId = getHolderId();
      const newBooking = await createBookingService({ ...bookingData, holderId });

      // If customer session token was issued, store it for authenticated requests
      if (newBooking?.customerToken) {
        localStorage.setItem('elite_pitch_customer_token', newBooking.customerToken);
      }
      if (newBooking?.customer) {
        localStorage.setItem('elite_pitch_customer_profile', JSON.stringify(newBooking.customer));
      }

      setLatestBooking(newBooking);
      try {
        sessionStorage.setItem('elite_pitch_latest_booking', JSON.stringify(newBooking));
      } catch (e) {
        // Ignore quota errors
      }

      if (isAdminLoggedIn) {
        setBookings(prev => [newBooking, ...prev]);
      }

      return newBooking;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create booking. Please try again.';
      setError(msg);
      throw err;
    } finally {
      setIsCreatingBooking(false);
    }
  }, [isAdminLoggedIn, getHolderId]);

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

  const payBookingBalance = useCallback(async (bookingId, paymentData) => {
    try {
      const updated = await payBalanceBookingService(bookingId, paymentData);
      if (updated) {
        setBookings(prev => prev.map(b => (b.bookingId === bookingId || b.id === bookingId || b._id === bookingId) ? { ...b, ...updated } : b));
      }
      return updated;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to pay balance.');
      throw err;
    }
  }, []);

  // Phase 5: Mark booking as reviewed / acknowledged
  const reviewBooking = useCallback(async (bookingId) => {
    const now = new Date().toISOString();
    let previousState = null;

    setBookings(prev => {
      previousState = prev;
      return prev.map(b => (b.bookingId === bookingId || b.id === bookingId || b._id === bookingId) ? { ...b, isReviewed: true, reviewedAt: now, reviewedBy: 'admin' } : b);
    });

    try {
      const updated = await reviewBookingService(bookingId);
      if (updated) {
        setBookings(prev => prev.map(b => (b.bookingId === bookingId || b.id === bookingId || b._id === bookingId) ? { ...b, ...updated } : b));
      }
      return updated;
    } catch (err) {
      if (previousState) setBookings(previousState);
      const msg = err.response?.data?.message || 'Failed to acknowledge booking.';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  // Phase 5: Admin cancellation with mandatory reason
  const adminCancelBooking = useCallback(async (bookingId, reason) => {
    const now = new Date().toISOString();
    let previousState = null;

    setBookings(prev => {
      previousState = prev;
      return prev.map(b => (b.bookingId === bookingId || b.id === bookingId || b._id === bookingId) ? {
        ...b,
        status: 'Cancelled',
        cancellation: { isCancelled: true, cancelledBy: 'admin', reason, cancelledAt: now }
      } : b);
    });

    try {
      const updated = await adminCancelBookingService(bookingId, reason);
      if (updated) {
        setBookings(prev => prev.map(b => (b.bookingId === bookingId || b.id === bookingId || b._id === bookingId) ? { ...b, ...updated } : b));
      }
      return updated;
    } catch (err) {
      if (previousState) setBookings(previousState);
      const msg = err.response?.data?.message || 'Failed to cancel booking.';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  // Phase 5: Block slots or whole day
  const blockSlot = useCallback(async (params) => {
    try {
      const newBlock = await blockSlotService(params);
      setBlockedSlots(prev => [newBlock, ...prev]);
      return newBlock;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to block slot(s).';
      setError(msg);
      throw err;
    }
  }, []);

  // Phase 5: Unblock slots
  const unblockSlot = useCallback(async (blockId) => {
    try {
      await unblockSlotService(blockId);
      setBlockedSlots(prev => prev.filter(b => b.id !== blockId && b._id !== blockId));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to unblock slot.';
      setError(msg);
      throw err;
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
      setBlockedSlots([]);
    }
  }, []);

  const getBookedSlotsForDate = useCallback(async (dateString) => {
    if (!dateString) return [];
    try {
      const holderId = getHolderId();
      const slots = await getBookedSlotsService(dateString, holderId);
      return slots;
    } catch (err) {
      return [];
    }
  }, [getHolderId]);

  const getAvailabilityForDate = useCallback(async (dateString, sportId = 'football-5v5') => {
    if (!dateString) return null;
    try {
      const holderId = getHolderId();
      const data = await getAvailabilityService(dateString, holderId, sportId);
      return data;
    } catch (err) {
      return null;
    }
  }, [getHolderId]);

  const holdSlots = useCallback(async (dateStr, slots, sportId = 'football-5v5') => {
    try {
      const holderId = getHolderId();
      const data = await createHoldService({ dateStr, slots, holderId, sportId });
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Selected slot is no longer available.';
      setError(msg);
      throw new Error(msg);
    }
  }, [getHolderId]);

  const releaseSlots = useCallback(async (dateStr, slots) => {
    try {
      const holderId = getHolderId();
      const data = await releaseHoldService({ holderId, dateStr, slots });
      return data;
    } catch (err) {
      console.warn('Failed to release slot hold:', err);
      return null;
    }
  }, [getHolderId]);

  // Memoize Context Value object to eliminate unnecessary context re-renders
  const contextValue = useMemo(() => ({
    bookings,
    events,
    customers,
    dashboardStats,
    blockedSlots,
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
    payBookingBalance,
    reviewBooking,
    adminCancelBooking,
    blockSlot,
    unblockSlot,
    addEvent,
    editEvent,
    deleteEvent,
    loginAdmin,
    logoutAdmin,
    refreshAdminData,
    getBookedSlotsForDate,
    getAvailabilityForDate,
    holdSlots,
    releaseSlots,
    getHolderId
  }), [
    bookings,
    events,
    customers,
    dashboardStats,
    blockedSlots,
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
    payBookingBalance,
    reviewBooking,
    adminCancelBooking,
    blockSlot,
    unblockSlot,
    addEvent,
    editEvent,
    deleteEvent,
    loginAdmin,
    logoutAdmin,
    refreshAdminData,
    getBookedSlotsForDate,
    getAvailabilityForDate,
    holdSlots,
    releaseSlots,
    getHolderId
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

