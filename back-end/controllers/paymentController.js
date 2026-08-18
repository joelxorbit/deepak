import Razorpay from 'razorpay';
import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../utils/logger.js';

let razorpayInstance = null;

const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    if (!ENV.RAZORPAY_KEY_ID || !ENV.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys are not configured in environment variables.');
    }
    razorpayInstance = new Razorpay({
      key_id: ENV.RAZORPAY_KEY_ID,
      key_secret: ENV.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

export const createOrder = async (req, res, next) => {
  try {
    const { amount, receipt } = req.body;

    if (!amount) {
      const error = new Error('Amount is required to create a payment order');
      error.statusCode = 400;
      throw error;
    }

    const rzp = getRazorpayInstance();
    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency: 'INR',
      receipt: receipt || `receipt_${Date.now()}`
    };

    const order = await rzp.orders.create(options);
    
    logger.info(`[PaymentController] Created Razorpay order: ${order.id}`);
    
    return sendSuccess(res, 'Payment order created successfully', order, 201);
  } catch (error) {
    logger.error(`[PaymentController Error] ${error.message}`);
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      const error = new Error('Incomplete payment details provided');
      error.statusCode = 400;
      throw error;
    }

    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    
    const expectedSignature = crypto
      .createHmac('sha256', ENV.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      logger.info(`[PaymentController] Successfully verified payment: ${razorpay_payment_id}`);
      return sendSuccess(res, 'Payment verified successfully', { verified: true });
    } else {
      const error = new Error('Invalid payment signature');
      error.statusCode = 400;
      throw error;
    }
  } catch (error) {
    logger.error(`[PaymentController Error] ${error.message}`);
    next(error);
  }
};
