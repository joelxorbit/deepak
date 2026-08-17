import { api } from '../utils/api';

// Create a new booking (POST /api/bookings)
export const createBookingService = async (bookingData) => {
  const response = await api.post('/bookings', bookingData);
  return response.data.data;
};

// Track booking by ID or Mobile (POST /api/bookings/track)
export const trackBookingService = async (query) => {
  const response = await api.post(`/bookings/track?query=${encodeURIComponent(query)}`, { query });
  return response.data.data;
};

// Cancel booking (POST /api/bookings/cancel)
export const cancelBookingService = async (bookingId) => {
  const response = await api.post(`/bookings/cancel`, { bookingId });
  return response.data.data;
};

// Mark booking payment as Paid (PATCH /api/bookings/:id/mark-paid)
export const markBookingAsPaidService = async (bookingId) => {
  const response = await api.patch(`/bookings/${bookingId}/mark-paid`);
  return response.data.data;
};

// Get booked slots for a date (GET /api/bookings/slots?date=YYYY-MM-DD)
export const getBookedSlotsService = async (dateString) => {
  const response = await api.get('/bookings/slots', { params: { date: dateString } });
  return response.data.data ? response.data.data.bookedSlots : [];
};

// Get all bookings for admin (GET /api/bookings)
export const getBookingsService = async (status = 'All', search = '') => {
  const response = await api.get('/bookings', { params: { status, search } });
  return response.data.data;
};

// Get booking history for admin (GET /api/bookings/history)
export const getBookingHistoryService = async () => {
  const response = await api.get('/bookings/history');
  return response.data.data;
};

// Approve booking (PATCH /api/bookings/:id/approve)
export const approveBookingService = async (bookingId) => {
  const response = await api.patch(`/bookings/${bookingId}/approve`);
  return response.data.data;
};

// Reject booking (PATCH /api/bookings/:id/reject)
export const rejectBookingService = async (bookingId) => {
  const response = await api.patch(`/bookings/${bookingId}/reject`);
  return response.data.data;
};
