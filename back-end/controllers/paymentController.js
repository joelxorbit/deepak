import {
  createPaymentOrderService,
  verifyPaymentSignatureService
} from '../services/paymentService.js';
import { calculateBookingPrice } from '../services/rateService.js';
import { sendSuccess } from '../utils/response.js';

export const createOrder = async (req, res, next) => {
  try {
    const { amount, receipt, date, slots, sportId, paymentOption, bookingId, couponCode } = req.body;

    const orderData = await createPaymentOrderService({
      date,
      slots,
      sportId,
      paymentOption,
      rawAmount: amount,
      receipt,
      bookingId,
      couponCode
    });

    return sendSuccess(res, 'Payment order created successfully', orderData, 201);
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, expectedAmount } = req.body;

    const result = await verifyPaymentSignatureService({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      expectedAmount
    });

    return sendSuccess(res, 'Payment verified successfully', result);
  } catch (error) {
    next(error);
  }
};

export const previewPricingController = async (req, res, next) => {
  try {
    const { date, slots, sportId, paymentOption, couponCode } = req.body;

    const pricing = await calculateBookingPrice({
      date,
      slots,
      sportId,
      paymentOption,
      couponCode
    });

    return sendSuccess(res, 'Pricing breakdown calculated successfully', pricing);
  } catch (error) {
    next(error);
  }
};
