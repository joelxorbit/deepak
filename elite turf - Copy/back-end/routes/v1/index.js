import express from 'express';
import bookingRoutes from '../bookingRoutes.js';
import eventRoutes from '../eventRoutes.js';
import customerRoutes from '../customerRoutes.js';
import adminRoutes from '../adminRoutes.js';
import enquiryRoutes from '../enquiryRoutes.js';

const router = express.Router();

router.use('/bookings', bookingRoutes);
router.use('/events', eventRoutes);
router.use('/customers', customerRoutes);
router.use('/admin', adminRoutes);
router.use('/enquiries', enquiryRoutes);

export default router;
