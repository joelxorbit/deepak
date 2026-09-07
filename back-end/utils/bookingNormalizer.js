import {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  PAYMENT_OPTIONS,
  DEFAULT_FALLBACK_SLOT_PRICE,
  DEFAULT_FALLBACK_ADVANCE_PERCENTAGE,
  DEFAULT_FIXED_ADVANCE_AMOUNT
} from './constants.js';
import { roundToCurrency, isValidAmount } from './pricingUtils.js';
import { normalizePhone } from './slotNormalizer.js';

/**
 * Display-only fallback labels for legacy rendering.
 * Never used for authoritative server-side pricing or payment logic.
 */
const DISPLAY_FALLBACK_SPORT_NAME = 'Football Turf (Main Arena)';
const DISPLAY_FALLBACK_SPORT_ID = 'football-5v5';

/**
 * Normalizes any booking document (legacy or modern) into a predictable,
 * backward-compatible shape without mutating the original input document.
 *
 * @param {object} rawDoc - Raw Firestore document data or plain JS object
 * @param {object} [options={}]
 * @returns {object} Normalized booking object
 */
export const normalizeBookingDocument = (rawDoc, options = {}) => {
  if (!rawDoc || typeof rawDoc !== 'object') {
    return null;
  }

  // Shallow copy to guarantee zero mutation of input object
  const raw = { ...rawDoc };

  const id = raw.id || raw._id || raw.bookingId || '';
  const bookingId = raw.bookingId || id;
  const customerId = raw.customerId || raw.customer?.id || raw.customer?._id || '';
  const customerName = raw.customerName || raw.customer?.name || 'Guest Player';
  const customerPhone = normalizePhone(raw.customerPhone || raw.mobileNumber || raw.customer?.phone || '');
  const customerEmail = raw.customerEmail || raw.email || raw.customer?.email || '';

  const sportType = raw.sportType || DISPLAY_FALLBACK_SPORT_NAME;
  const sportId = raw.sportId || DISPLAY_FALLBACK_SPORT_ID;

  const dateObj = raw.date ? new Date(raw.date) : new Date();
  const date = raw.date || dateObj.toISOString();
  const dateStr = raw.dateStr || (isNaN(dateObj.getTime()) ? '' : dateObj.toISOString().split('T')[0]);

  const rawSlots = Array.isArray(raw.timeSlots)
    ? raw.timeSlots
    : (Array.isArray(raw.slots) ? raw.slots : []);
  const timeSlots = [...rawSlots];
  const slots = [...rawSlots];
  const slotCount = isValidAmount(raw.slotCount) && Number(raw.slotCount) > 0
    ? Number(raw.slotCount)
    : (timeSlots.length || 1);

  // Financial fields normalization (strictly GST-free)
  let totalAmount = isValidAmount(raw.totalAmount)
    ? roundToCurrency(raw.totalAmount)
    : (isValidAmount(raw.subtotal) ? roundToCurrency(raw.subtotal) : roundToCurrency(slotCount * DEFAULT_FALLBACK_SLOT_PRICE));

  let subtotal = isValidAmount(raw.subtotal)
    ? roundToCurrency(raw.subtotal)
    : totalAmount;

  let slotPrice = isValidAmount(raw.slotPrice)
    ? roundToCurrency(raw.slotPrice)
    : roundToCurrency(subtotal / slotCount);

  // Advance paid & balance due calculation
  let advancePaid;
  if (isValidAmount(raw.advancePaid)) {
    advancePaid = roundToCurrency(raw.advancePaid);
  } else if (raw.paymentStatus === 'Paid' || raw.paymentStatus === PAYMENT_STATUS.FULLY_PAID) {
    advancePaid = totalAmount;
  } else {
    advancePaid = 0;
  }

  let balanceDue;
  if (isValidAmount(raw.balanceDue)) {
    balanceDue = roundToCurrency(raw.balanceDue);
  } else {
    balanceDue = roundToCurrency(Math.max(0, totalAmount - advancePaid));
  }

  // Pricing snapshot (strictly GST-free for normalized records)
  let pricingSnapshot;
  if (raw.pricingSnapshot && typeof raw.pricingSnapshot === 'object') {
    pricingSnapshot = { ...raw.pricingSnapshot };
  } else {
    const fixedAdv = roundToCurrency(Math.min(DEFAULT_FIXED_ADVANCE_AMOUNT, totalAmount));
    pricingSnapshot = {
      ratePerHour: slotPrice,
      slotCount,
      subtotal,
      totalAmount,
      fixedAdvanceAmount: DEFAULT_FIXED_ADVANCE_AMOUNT,
      advanceRequired: fixedAdv,
      balanceDue
    };
  }

  // Payment Option Normalization
  let paymentOption = raw.paymentOption;
  if (!paymentOption) {
    if (advancePaid >= totalAmount && totalAmount > 0) {
      paymentOption = PAYMENT_OPTIONS.FULL;
    } else if (raw.paymentMethod === 'Pay at Spot') {
      paymentOption = PAYMENT_OPTIONS.CASH;
    } else if (advancePaid > 0) {
      paymentOption = PAYMENT_OPTIONS.ADVANCE;
    } else {
      paymentOption = PAYMENT_OPTIONS.CASH;
    }
  }

  const paymentMethod = raw.paymentMethod || 'Pay at Spot';

  // Payment Status Normalization (Mapping legacy 'Paid'/'Pending' to canonical 9-state enum)
  let paymentStatus = raw.paymentStatus;
  if (!paymentStatus || paymentStatus === 'Pending') {
    if (paymentMethod === 'Pay at Spot') {
      paymentStatus = PAYMENT_STATUS.CASH_PENDING;
    } else if (paymentOption === PAYMENT_OPTIONS.ADVANCE) {
      paymentStatus = PAYMENT_STATUS.ADVANCE_PENDING;
    } else {
      paymentStatus = PAYMENT_STATUS.UNPAID;
    }
  } else if (paymentStatus === 'Paid') {
    if (balanceDue === 0) {
      paymentStatus = PAYMENT_STATUS.FULLY_PAID;
    } else {
      paymentStatus = PAYMENT_STATUS.ADVANCE_PAID;
    }
  }

  const paidAt = raw.paidAt || (paymentStatus === PAYMENT_STATUS.FULLY_PAID || paymentStatus === PAYMENT_STATUS.ADVANCE_PAID ? raw.createdAt || null : null);
  const paymentCollectedBy = raw.paymentCollectedBy || (paymentMethod === 'Pay Now' ? 'Online Payment' : null);

  // Balance Payment object
  let balancePayment;
  if (raw.balancePayment && typeof raw.balancePayment === 'object') {
    balancePayment = { ...raw.balancePayment };
  } else {
    const isBalancePaid = balanceDue === 0 && (paymentStatus === PAYMENT_STATUS.FULLY_PAID || paymentStatus === PAYMENT_STATUS.CASH_RECEIVED);
    balancePayment = {
      isPaid: isBalancePaid,
      paidAt: isBalancePaid ? (raw.balancePaidAt || paidAt || null) : null,
      paymentMethod: raw.balancePaymentMethod || null,
      collectedBy: raw.balanceCollectedBy || null,
      notes: raw.balanceNotes || null
    };
  }

  // Booking Status
  let status = raw.status || BOOKING_STATUS.PENDING;
  if (!Object.values(BOOKING_STATUS).includes(status)) {
    status = BOOKING_STATUS.PENDING;
  }

  // Admin Review status (default true for historical bookings, preserves explicit false)
  const isReviewed = typeof raw.isReviewed === 'boolean' ? raw.isReviewed : true;
  const reviewedBy = raw.reviewedBy || (isReviewed && raw.approvedBy ? raw.approvedBy : null);
  const reviewedAt = raw.reviewedAt || (isReviewed && raw.approvedAt ? raw.approvedAt : null);

  // Cancellation object
  let cancellation;
  if (raw.cancellation && typeof raw.cancellation === 'object') {
    cancellation = { ...raw.cancellation };
  } else if (status === BOOKING_STATUS.CANCELLED) {
    cancellation = {
      isCancelled: true,
      cancelledBy: raw.cancelledBy || 'customer',
      reason: raw.cancellationReason || 'Customer cancellation',
      cancelledAt: raw.cancelledAt || raw.updatedAt || new Date().toISOString(),
      adminId: raw.cancelledByAdminId || null
    };
  } else {
    cancellation = {
      isCancelled: false,
      cancelledBy: null,
      reason: null,
      cancelledAt: null,
      adminId: null
    };
  }

  const isDeleted = Boolean(raw.isDeleted);
  const searchTokens = Array.isArray(raw.searchTokens) ? [...raw.searchTokens] : [];
  const createdAt = raw.createdAt || new Date().toISOString();
  const updatedAt = raw.updatedAt || createdAt;

  return {
    id,
    _id: id,
    bookingId,
    customerId,
    customerName,
    customerPhone,
    customerEmail,
    sportType,
    sportId,
    date,
    dateStr,
    timeSlots,
    slots,
    slotCount,
    slotPrice,
    subtotal,
    totalAmount,
    advancePaid,
    balanceDue,
    pricingSnapshot,
    paymentOption,
    paymentMethod,
    paymentStatus,
    paidAt,
    paymentCollectedBy,
    razorpay_payment_id: raw.razorpay_payment_id || null,
    balancePayment,
    status,
    isReviewed,
    reviewedBy,
    reviewedAt,
    cancellation,
    isDeleted,
    searchTokens,
    createdAt,
    updatedAt
  };
};
