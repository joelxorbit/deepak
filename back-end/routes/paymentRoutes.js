import express from 'express';
import { createOrder, verifyPayment } from '../controllers/paymentController.js';

const router = express.Router();

// POST /api/payments/create-order
router.post('/create-order', createOrder);

// POST /api/payments/verify
router.post('/verify', verifyPayment);

export default router;
