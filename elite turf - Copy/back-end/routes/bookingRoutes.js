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
  bookingHistory
} from '../controllers/bookingController.js';
import { createBookingValidationRules } from '../validators/bookingValidator.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { handleIdempotency } from '../middlewares/idempotencyMiddleware.js';

const router = express.Router();

// Base Route: /api/bookings

// Public Endpoints
router.post('/', handleIdempotency, createBookingValidationRules, validateRequest, createBooking);
router.post('/track', trackBooking);
router.get('/track', trackBooking);
router.post('/cancel', cancelBooking);
router.get('/slots', getBookedSlots);

// Protected Admin Endpoints
router.get('/', requireAdmin, getAllBookings);
router.get('/history', requireAdmin, bookingHistory);
router.patch('/:id/approve', requireAdmin, approveBooking);
router.patch('/:id/reject', requireAdmin, rejectBooking);
router.patch('/:id/mark-paid', requireAdmin, markBookingAsPaid);

export default router;
