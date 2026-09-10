import {
  getAllCouponsDoc,
  findCouponByCodeDoc,
  findCouponByIdDoc,
  createCouponDoc,
  updateCouponDoc,
  toggleCouponStatusDoc,
  deleteCouponDoc
} from '../repositories/couponRepository.js';
import { createAuditLog } from '../repositories/auditRepository.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Validates a coupon code for eligibility against date and active status.
 * @param {string} code
 * @param {number} [subtotal=0]
 * @returns {Promise<object>}
 */
export const validateCouponCode = async (code, subtotal = 0) => {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return {
      isValid: false,
      message: 'Please enter a coupon code.'
    };
  }

  const cleanCode = code.trim().toUpperCase();
  const coupon = await findCouponByCodeDoc(cleanCode);

  if (!coupon) {
    return {
      isValid: false,
      message: `Coupon code "${cleanCode}" is invalid. Please check and try again.`
    };
  }

  if (coupon.status !== 'active') {
    return {
      isValid: false,
      message: `Coupon code "${cleanCode}" is inactive and cannot be redeemed.`
    };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (coupon.validUntil && coupon.validUntil < todayStr) {
    return {
      isValid: false,
      message: `Coupon code "${cleanCode}" expired on ${coupon.validUntil}.`
    };
  }

  const discountAmount = Math.max(0, Number(coupon.discountAmount) || 0);
  const effectiveDiscount = subtotal > 0 ? Math.min(subtotal, discountAmount) : discountAmount;

  return {
    isValid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountAmount: coupon.discountAmount,
      validUntil: coupon.validUntil
    },
    discountAmount: effectiveDiscount,
    message: `Coupon "${coupon.code}" applied! You save ₹${discountAmount}.`
  };
};

/**
 * Retrieves all coupons with dynamic expired calculation.
 * @returns {Promise<Array>}
 */
export const getAllCouponsService = async () => {
  const coupons = await getAllCouponsDoc();
  const todayStr = new Date().toISOString().split('T')[0];

  return coupons
    .map(c => ({
      ...c,
      isExpired: Boolean(c.validUntil && c.validUntil < todayStr)
    }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

/**
 * Creates a new coupon with validation.
 * @param {object} adminUser
 * @param {object} param1
 * @returns {Promise<object>}
 */
export const createCouponService = async (adminUser, { code, discountAmount, validUntil, notes }) => {
  if (!code || typeof code !== 'string' || code.trim().length < 2) {
    const error = new Error('Coupon code is required and must be at least 2 characters long.');
    error.statusCode = 400;
    throw error;
  }

  const cleanCode = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
    const error = new Error('Coupon code may only contain uppercase letters, numbers, underscores, and hyphens.');
    error.statusCode = 400;
    throw error;
  }

  const numDiscount = Number(discountAmount);
  if (isNaN(numDiscount) || numDiscount <= 0) {
    const error = new Error('Discount Amount must be a positive number greater than ₹0.');
    error.statusCode = 400;
    throw error;
  }

  if (!validUntil || !/^\d{4}-\d{2}-\d{2}$/.test(String(validUntil).trim())) {
    const error = new Error('Valid Until date is required in YYYY-MM-DD format.');
    error.statusCode = 400;
    throw error;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (validUntil < todayStr) {
    const error = new Error('Valid Until date cannot be in the past.');
    error.statusCode = 400;
    throw error;
  }

  // Check code uniqueness
  const existing = await findCouponByCodeDoc(cleanCode);
  if (existing) {
    const error = new Error(`Coupon code "${cleanCode}" already exists. Please choose a different code.`);
    error.statusCode = 400;
    throw error;
  }

  const created = await createCouponDoc({
    code: cleanCode,
    discountAmount: numDiscount,
    validUntil: String(validUntil).trim(),
    notes: notes || ''
  });

  await createAuditLog({
    action: AUDIT_ACTIONS.COUPON_CREATE || 'COUPON_CREATE',
    actor: adminUser?.username || 'admin',
    actorRole: 'admin',
    targetId: created.id,
    targetType: 'coupon',
    details: `Created coupon ${cleanCode} with ₹${numDiscount} discount valid until ${validUntil}`
  });

  return created;
};

/**
 * Updates an existing coupon.
 * @param {object} adminUser
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<object>}
 */
export const updateCouponService = async (adminUser, id, updates) => {
  const existing = await findCouponByIdDoc(id);
  if (!existing) {
    const error = new Error('Coupon not found.');
    error.statusCode = 404;
    throw error;
  }

  if (updates.code) {
    const cleanCode = updates.code.trim().toUpperCase();
    const duplicate = await findCouponByCodeDoc(cleanCode);
    if (duplicate && duplicate.id !== id) {
      const error = new Error(`Coupon code "${cleanCode}" is already in use by another coupon.`);
      error.statusCode = 400;
      throw error;
    }
  }

  if (updates.discountAmount !== undefined) {
    const numDiscount = Number(updates.discountAmount);
    if (isNaN(numDiscount) || numDiscount <= 0) {
      const error = new Error('Discount Amount must be greater than ₹0.');
      error.statusCode = 400;
      throw error;
    }
  }

  const updated = await updateCouponDoc(id, updates);

  await createAuditLog({
    action: AUDIT_ACTIONS.COUPON_UPDATE || 'COUPON_UPDATE',
    actor: adminUser?.username || 'admin',
    actorRole: 'admin',
    targetId: id,
    targetType: 'coupon',
    details: `Updated coupon ${updated.code}`
  });

  return updated;
};

/**
 * Toggles coupon active/inactive status.
 * @param {object} adminUser
 * @param {string} id
 * @returns {Promise<object>}
 */
export const toggleCouponStatusService = async (adminUser, id) => {
  const updated = await toggleCouponStatusDoc(id);
  if (!updated) {
    const error = new Error('Coupon not found.');
    error.statusCode = 404;
    throw error;
  }

  await createAuditLog({
    action: AUDIT_ACTIONS.COUPON_UPDATE || 'COUPON_UPDATE',
    actor: adminUser?.username || 'admin',
    actorRole: 'admin',
    targetId: id,
    targetType: 'coupon',
    details: `Toggled coupon ${updated.code} status to ${updated.status}`
  });

  return updated;
};

/**
 * Deletes a coupon permanently.
 * @param {object} adminUser
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export const deleteCouponService = async (adminUser, id) => {
  const existing = await findCouponByIdDoc(id);
  if (!existing) {
    const error = new Error('Coupon not found.');
    error.statusCode = 404;
    throw error;
  }

  await deleteCouponDoc(id);

  await createAuditLog({
    action: AUDIT_ACTIONS.COUPON_DELETE || 'COUPON_DELETE',
    actor: adminUser?.username || 'admin',
    actorRole: 'admin',
    targetId: id,
    targetType: 'coupon',
    details: `Deleted coupon ${existing.code}`
  });

  return true;
};
