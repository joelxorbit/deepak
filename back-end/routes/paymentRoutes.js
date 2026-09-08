import express from 'express';
import { createOrder, verifyPayment, previewPricingController } from '../controllers/paymentController.js';

const router = express.Router();

// POST /api/payments/create-order
router.post('/create-order', createOrder);

// POST /api/payments/verify
router.post('/verify', verifyPayment);

// POST /api/payments/price-preview
router.post('/price-preview', previewPricingController);

export default router;
