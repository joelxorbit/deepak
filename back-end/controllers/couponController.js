import {
  validateCouponCode,
  getAllCouponsService,
  createCouponService,
  updateCouponService,
  toggleCouponStatusService,
  deleteCouponService
} from '../services/couponService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const validateCoupon = async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;
    const result = await validateCouponCode(code, subtotal);
    if (!result.isValid) {
      return sendError(res, result.message, null, 400);
    }
    return sendSuccess(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

export const getCoupons = async (req, res, next) => {
  try {
    const coupons = await getAllCouponsService();
    return sendSuccess(res, 'Coupons retrieved successfully', coupons);
  } catch (error) {
    next(error);
  }
};

export const createCoupon = async (req, res, next) => {
  try {
    const newCoupon = await createCouponService(req.admin, req.body);
    return sendSuccess(res, 'Coupon created successfully', newCoupon, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (req, res, next) => {
  try {
    const updated = await updateCouponService(req.admin, req.params.id, req.body);
    return sendSuccess(res, 'Coupon updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

export const toggleCouponStatus = async (req, res, next) => {
  try {
    const updated = await toggleCouponStatusService(req.admin, req.params.id);
    return sendSuccess(res, `Coupon ${updated.status === 'active' ? 'activated' : 'deactivated'} successfully`, updated);
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (req, res, next) => {
  try {
    await deleteCouponService(req.admin, req.params.id);
    return sendSuccess(res, 'Coupon deleted successfully', { id: req.params.id });
  } catch (error) {
    next(error);
  }
};
