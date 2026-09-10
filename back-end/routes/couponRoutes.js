import express from 'express';
import {
  validateCoupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon
} from '../controllers/couponController.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public route for customers checking coupon on booking form
router.post('/validate', validateCoupon);

// Admin-only coupon management routes
router.get('/', requireAdmin, getCoupons);
router.post('/', requireAdmin, createCoupon);
router.put('/:id', requireAdmin, updateCoupon);
router.patch('/:id/toggle', requireAdmin, toggleCouponStatus);
router.delete('/:id', requireAdmin, deleteCoupon);

export default router;
