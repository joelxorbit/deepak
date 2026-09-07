import { normalizePhone } from './slotNormalizer.js';

/**
 * Validates whether a customer user is the verified owner of a booking.
 * @param {object} user - Authenticated user object ({ id, phone, ... })
 * @param {object} booking - Normalized or raw booking object
 * @returns {boolean}
 */
export const isCustomerOwner = (user, booking) => {
  if (!user || !booking) return false;

  // Check by Customer Document ID
  const userId = user.id || user._id || user.customerId;
  const bookingCustId = booking.customerId || booking.customer?.id || booking.customer?._id;
  if (userId && bookingCustId && String(userId) === String(bookingCustId)) {
    return true;
  }

  // Check by Email
  const userEmail = (user.email || '').trim().toLowerCase();
  const bookingEmail = (booking.customerEmail || booking.email || booking.customer?.email || '').trim().toLowerCase();
  if (userEmail && bookingEmail && userEmail === bookingEmail) {
    return true;
  }

  // Check by Normalized 10-digit Phone Number
  const userPhone = normalizePhone(user.phone || user.mobileNumber || '');
  const bookingPhone = normalizePhone(booking.customerPhone || booking.mobileNumber || booking.customer?.phone || '');
  if (userPhone && bookingPhone && userPhone === bookingPhone) {
    return true;
  }

  return false;
};

/**
 * Validates whether an authenticated admin has admin or superadmin privileges.
 * @param {object} admin - Authenticated admin object ({ role, ... })
 * @returns {boolean}
 */
export const isAdminOrSuperAdmin = (admin) => {
  if (!admin || typeof admin !== 'object') return false;
  return ['admin', 'superadmin'].includes(admin.role);
};

/**
 * Verifies if a requester (customer or admin) has permission to access or download a booking.
 * @param {object} requester - { user?: object, admin?: object, role?: string }
 * @param {object} booking - Booking object
 * @returns {{ allowed: boolean, reason?: string, statusCode?: number }}
 */
export const canAccessBooking = (requester, booking) => {
  if (!requester || (!requester.user && !requester.admin && !requester.id && !requester._id && !requester.role)) {
    return { allowed: false, reason: 'Authentication token missing or expired. Access denied.', statusCode: 401 };
  }

  if (!booking) {
    return { allowed: false, reason: 'Booking record not found.', statusCode: 404 };
  }

  // 1. Admin access
  const adminObj = requester.admin || (['admin', 'superadmin'].includes(requester.role) ? requester : null);
  if (isAdminOrSuperAdmin(adminObj)) {
    return { allowed: true };
  }

  // 2. Customer user access
  const userObj = requester.user || requester;
  if (isCustomerOwner(userObj, booking)) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'Unauthorized access. You do not own this booking.', statusCode: 403 };
};
