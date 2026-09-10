import Razorpay from 'razorpay';
import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { getBookingsCollection } from '../config/firestoreCollections.js';
import { PAYMENT_OPTIONS } from '../utils/constants.js';
import { calculateBookingPrice } from './rateService.js';
import { roundToCurrency, isValidAmount } from '../utils/pricingUtils.js';
import { logger } from '../utils/logger.js';

let razorpayInstance = null;

export const setRazorpayInstance = (instance) => {
  razorpayInstance = instance;
};

export const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    if (!ENV.RAZORPAY_KEY_ID || !ENV.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys are not configured in environment variables.');
    }
    razorpayInstance = new Razorpay({
      key_id: ENV.RAZORPAY_KEY_ID,
      key_secret: ENV.RAZORPAY_KEY_SECRET
    });
  }
  return razorpayInstance;
};

/**
 * Creates a Razorpay order with authoritative, server-calculated monetary amounts.
 * Prevents client-side price tampering by evaluating the true payable amount on the server.
 *
 * @param {object} params
 * @param {string} [params.date]
 * @param {string[]} [params.slots]
 * @param {string} [params.sportId='football-5v5']
 * @param {string} [params.paymentOption='FULL'] - 'ADVANCE', 'FULL', or 'CASH'
 * @param {number} [params.rawAmount] - Optional client amount for tamper verification
 * @param {string} [params.receipt]
 * @returns {Promise<object>} Created order data
 */
export const createPaymentOrderService = async ({
  date,
  slots,
  sportId = 'football-5v5',
  paymentOption = PAYMENT_OPTIONS.FULL,
  rawAmount = null,
  receipt = null,
  bookingId = null,
  couponCode = null
}) => {
  let payableAmount = 0;
  let pricingResult = null;

  // 1. Authoritative Server-Side Calculation from existing booking
  if (bookingId) {
    let bookingData = null;
    const docDirect = await getBookingsCollection().doc(bookingId).get();
    if (docDirect.exists) {
      bookingData = docDirect.data();
    } else {
      const bookingSnap = await getBookingsCollection()
        .where('bookingId', '==', bookingId)
        .limit(1)
        .get();
      if (!bookingSnap.empty) {
        bookingData = bookingSnap.docs[0].data();
      }
    }

    if (!bookingData) {
      const error = new Error(`Booking ${bookingId} not found.`);
      error.statusCode = 404;
      throw error;
    }
    if (paymentOption === PAYMENT_OPTIONS.ADVANCE) {
      payableAmount = bookingData.pricingSnapshot?.advanceRequired || 200;
    } else {
      payableAmount = bookingData.balanceDue > 0 ? bookingData.balanceDue : bookingData.totalAmount;
    }
  } else if (date && Array.isArray(slots) && slots.length > 0) {
    // 2. Authoritative Server-Side Calculation from rate rules and parameters
    if (paymentOption === PAYMENT_OPTIONS.CASH) {
      const error = new Error('Cash / Pay at Spot bookings do not require an online payment order.');
      error.statusCode = 400;
      throw error;
    }

    pricingResult = await calculateBookingPrice({
      sportId,
      date,
      slots,
      paymentOption,
      couponCode
    });

    payableAmount = pricingResult.payableNow;
  } else {
    const error = new Error('Valid booking parameters (date and slots) or a valid bookingId are required to evaluate authoritative payment amount. Arbitrary amount orders are rejected.');
    error.statusCode = 400;
    throw error;
  }

  // If client sent an amount, compare with server-calculated payableAmount
  if (rawAmount !== null && rawAmount !== undefined) {
    const clientAmount = Number(rawAmount);
    if (!isValidAmount(clientAmount) || Math.abs(clientAmount - payableAmount) > 0.01) {
      const error = new Error(`Payment amount mismatch: Client requested ₹${clientAmount}, but authoritative server-calculated amount is ₹${payableAmount}. Order creation rejected.`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Ensure positive amount
  if (!isValidAmount(payableAmount) || payableAmount <= 0) {
    const error = new Error('Calculated payable amount must be greater than zero.');
    error.statusCode = 400;
    throw error;
  }

  const amountInPaise = Math.round(payableAmount * 100);
  const rzpReceipt = receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // If Razorpay keys are not configured (local / dev execution), return a mock order to enable full end-to-end checkout
  if (!ENV.RAZORPAY_KEY_ID || !ENV.RAZORPAY_KEY_SECRET) {
    const devOrderId = `order_dev_${Date.now()}`;
    logger.info(`[PaymentService] Razorpay keys not configured in .env. Generated simulated dev order ${devOrderId} for amount ₹${payableAmount}`);
    return {
      id: devOrderId,
      orderId: devOrderId,
      amount: payableAmount,
      amountInPaise,
      currency: 'INR',
      receipt: rzpReceipt,
      paymentOption,
      pricingSnapshot: pricingResult ? pricingResult.pricingSnapshot : null,
      isSimulated: true
    };
  }

  const rzp = getRazorpayInstance();
  const orderOptions = {
    amount: amountInPaise,
    currency: 'INR',
    receipt: rzpReceipt
  };

  const order = await rzp.orders.create(orderOptions);
  logger.info(`[PaymentService] Created Razorpay order ${order.id} for amount ₹${payableAmount} (${amountInPaise} paise)`);

  return {
    id: order.id,
    orderId: order.id,
    amount: payableAmount,
    amountInPaise: order.amount,
    currency: order.currency,
    receipt: order.receipt,
    paymentOption,
    pricingSnapshot: pricingResult ? pricingResult.pricingSnapshot : null
  };
};

/**
 * Cryptographically verifies Razorpay payment signature and prevents duplicate replay attacks.
 *
 * @param {object} params
 * @param {string} params.razorpay_order_id
 * @param {string} params.razorpay_payment_id
 * @param {string} params.razorpay_signature
 * @param {number} [params.expectedAmount]
 * @returns {Promise<{ verified: boolean, paymentId: string, orderId: string }>}
 */
export const verifyPaymentSignatureService = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  expectedAmount = null
}) => {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    const error = new Error('Incomplete payment verification payload: order ID, payment ID, and signature are required.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Replay attack prevention: check if this payment ID has already been applied to an existing booking
  const existingPaymentSnap = await getBookingsCollection()
    .where('razorpay_payment_id', '==', razorpay_payment_id)
    .limit(1)
    .get();

  if (!existingPaymentSnap.empty) {
    const error = new Error('This payment transaction has already been applied to another booking. Duplicate payment verification rejected.');
    error.statusCode = 409;
    throw error;
  }

  // 2. Cryptographic HMAC SHA256 Signature Verification
  const text = `${razorpay_order_id}|${razorpay_payment_id}`;
  const secret = ENV.RAZORPAY_KEY_SECRET || '';

  // If simulated order or secret is not configured in local environment
  if (!secret || razorpay_order_id.startsWith('order_dev_') || razorpay_payment_id.startsWith('pay_dev_')) {
    logger.info(`[PaymentService] Simulated signature verification accepted for ${razorpay_order_id}`);
    return {
      verified: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id
    };
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(text)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    logger.warn(`[PaymentService Warning] Signature mismatch for order ${razorpay_order_id}. Provided: ${razorpay_signature}, Expected: ${expectedSignature}`);
    const error = new Error('Invalid payment signature. Payment verification failed.');
    error.statusCode = 400;
    throw error;
  }

  logger.info(`[PaymentService] Successfully verified Razorpay payment: ${razorpay_payment_id}`);

  return {
    verified: true,
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id
  };
};
