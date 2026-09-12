import express from 'express';
import {
  createBooking,
  getAllBookings,
  trackBooking,
  cancelBooking,
  markBookingAsPaid,
  getBookedSlots,
  approveBooking,
  rejectBooking,
  bookingHistory,
  previewBookingPrice,
  reviewBooking,
  adminCancelBooking,
  payBookingBalance
} from '../controllers/bookingController.js';
import {
  createBookingValidationRules,
  adminCancelBookingValidationRules
} from '../validators/bookingValidator.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { requireAdmin, requireAnyAuth } from '../middlewares/authMiddleware.js';
import { handleIdempotency } from '../middlewares/idempotencyMiddleware.js';
import { downloadBookingTicketPdf } from '../controllers/ticketPdfController.js';

const router = express.Router();

// Base Route: /api/bookings

// Public & Authenticated Endpoints
router.get('/:bookingId/ticket.pdf', requireAnyAuth, downloadBookingTicketPdf);
router.post('/price-preview', previewBookingPrice);
router.post('/', handleIdempotency, createBookingValidationRules, validateRequest, createBooking);
router.post('/track', trackBooking);
router.get('/track', trackBooking);
router.post('/cancel', cancelBooking);
router.get('/slots', getBookedSlots);
router.post('/:id/pay-balance', requireAnyAuth, payBookingBalance);

// Protected Admin Endpoints
router.get('/', requireAdmin, getAllBookings);
router.get('/history', requireAdmin, bookingHistory);
router.patch('/:id/review', requireAdmin, reviewBooking);
router.post('/:id/cancel', requireAdmin, adminCancelBookingValidationRules, validateRequest, adminCancelBooking);
router.patch('/:id/approve', requireAdmin, approveBooking);
router.patch('/:id/reject', requireAdmin, rejectBooking);
router.patch('/:id/mark-paid', requireAdmin, markBookingAsPaid);

export default router;

