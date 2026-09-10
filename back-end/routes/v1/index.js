import express from 'express';
import bookingRoutes from '../bookingRoutes.js';
import availabilityRoutes from '../availabilityRoutes.js';
import eventRoutes from '../eventRoutes.js';
import customerRoutes from '../customerRoutes.js';
import adminRoutes from '../adminRoutes.js';
import enquiryRoutes from '../enquiryRoutes.js';
import authRoutes from '../authRoutes.js';
import paymentRoutes from '../paymentRoutes.js';
import notificationRoutes from '../notificationRoutes.js';
import rateRoutes from '../rateRoutes.js';
import couponRoutes from '../couponRoutes.js';

const router = express.Router();

router.use('/bookings', bookingRoutes);
router.use('/availability', availabilityRoutes);
router.use('/events', eventRoutes);
router.use('/customers', customerRoutes);
router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/enquiries', enquiryRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/rates', rateRoutes);
router.use('/coupons', couponRoutes);

export default router;
