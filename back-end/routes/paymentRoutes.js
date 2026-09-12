import express from 'express';
import { createOrder, verifyPayment, previewPricingController } from '../controllers/paymentController.js';
import { payBookingBalance } from '../controllers/bookingController.js';
import { requireAnyAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// POST /api/payments/create-order
router.post('/create-order', createOrder);

// POST /api/payments/verify
router.post('/verify', verifyPayment);

// POST /api/payments/price-preview
router.post('/price-preview', previewPricingController);

// POST /api/payments/pay-balance
router.post('/pay-balance', requireAnyAuth, payBookingBalance);
router.post('/:id/pay-balance', requireAnyAuth, payBookingBalance);

export default router;
