import { api } from '../utils/api';

// Preview booking price from server (POST /api/bookings/price-preview)
export const previewBookingPriceService = async ({ date, slots, sportId = 'football-5v5', paymentOption = 'ADVANCE' }) => {
  const response = await api.post('/bookings/price-preview', { date, slots, sportId, paymentOption });
  return response.data.data;
};

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
export const getBookedSlotsService = async (dateString, holderId = null) => {
  const response = await api.get('/bookings/slots', { params: { date: dateString, holderId } });
  return response.data.data ? response.data.data.bookedSlots : [];
};

// Get complete availability breakdown (GET /api/availability/slots)
export const getAvailabilityService = async (dateString, holderId = null, sportId = 'football-5v5') => {
  const response = await api.get('/availability/slots', { params: { date: dateString, holderId, sportId } });
  return response.data.data || null;
};

// Create temporary slot hold (POST /api/availability/hold)
export const createHoldService = async ({ dateStr, slots, holderId, sportId = 'football-5v5', durationMinutes = 10 }) => {
  const response = await api.post('/availability/hold', { dateStr, slots, holderId, sportId, durationMinutes });
  return response.data.data;
};

// Release temporary slot hold (POST /api/availability/release-hold)
export const releaseHoldService = async ({ holdId, holderId, dateStr, slots }) => {
  const response = await api.post('/availability/release-hold', { holdId, holderId, dateStr, slots });
  return response.data.data;
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

// Phase 5: Mark booking as reviewed / acknowledged (PATCH /api/bookings/:id/review)
export const reviewBookingService = async (bookingId) => {
  const response = await api.patch(`/bookings/${bookingId}/review`);
  return response.data.data;
};

// Phase 5: Admin cancellation with mandatory reason (POST /api/bookings/:id/cancel)
export const adminCancelBookingService = async (bookingId, reason) => {
  const response = await api.post(`/bookings/${bookingId}/cancel`, { reason });
  return response.data.data;
};

// Phase 5: Get all blocked slot records (GET /api/availability/blocked)
export const getBlockedSlotsService = async () => {
  const response = await api.get('/availability/blocked');
  return response.data.data;
};

// Phase 5: Block slot(s) or full-day closure (POST /api/availability/block)
export const blockSlotService = async ({ dateStr, date, slot = null, slots = null, isFullDay = false, reason, sportId = 'all', blockType = 'maintenance', paymentInfo = null }) => {
  const response = await api.post('/availability/block', {
    dateStr: dateStr || date,
    slot,
    slots,
    isFullDay,
    reason,
    sportId,
    blockType,
    paymentInfo
  });
  return response.data.data;
};

// Phase 5: Unblock slot (DELETE /api/availability/unblock/:id)
export const unblockSlotService = async (blockId) => {
  const response = await api.delete(`/availability/unblock/${blockId}`);
  return response.data.data;
};

// Phase 8: Download Ticket PDF (GET /api/bookings/:bookingId/ticket.pdf)
export const downloadTicketPdfService = async (bookingId) => {
  if (!bookingId) throw new Error('Booking ID is required to download ticket.');
  const cleanId = String(bookingId).trim();
  const response = await api.get(`/bookings/${encodeURIComponent(cleanId)}/ticket.pdf`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Elite-Pitch-Ticket-${cleanId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
  return true;
};


