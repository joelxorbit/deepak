import { api } from '../utils/api';

/**
 * Fetch all coupons (Admin)
 * GET /api/coupons
 */
export const fetchCouponsService = async () => {
  const response = await api.get('/coupons');
  return response.data.data;
};

/**
 * Create a new coupon (Admin)
 * POST /api/coupons
 */
export const createCouponService = async (couponData) => {
  const response = await api.post('/coupons', couponData);
  return response.data.data;
};

/**
 * Update an existing coupon (Admin)
 * PUT /api/coupons/:id
 */
export const updateCouponService = async (id, couponData) => {
  const response = await api.put(`/coupons/${id}`, couponData);
  return response.data.data;
};

/**
 * Toggle coupon status (active / inactive) (Admin)
 * PATCH /api/coupons/:id/toggle
 */
export const toggleCouponStatusService = async (id) => {
  const response = await api.patch(`/coupons/${id}/toggle`);
  return response.data.data;
};

/**
 * Delete a coupon (Admin)
 * DELETE /api/coupons/:id
 */
export const deleteCouponService = async (id) => {
  const response = await api.delete(`/coupons/${id}`);
  return response.data.data;
};

/**
 * Validate a coupon code during booking (Public)
 * POST /api/coupons/validate
 */
export const validateCouponService = async (code, subtotal = 0) => {
  const response = await api.post('/coupons/validate', { code, subtotal });
  return response.data.data;
};
