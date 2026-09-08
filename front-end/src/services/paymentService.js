import { api } from '../utils/api';

export const createRazorpayOrder = async (amountOrParams, receipt, date, slots, sportId = 'football-5v5', paymentOption = 'ADVANCE') => {
  try {
    let payload;
    if (typeof amountOrParams === 'object' && amountOrParams !== null) {
      payload = amountOrParams;
    } else {
      payload = { amount: amountOrParams, receipt, date, slots, sportId, paymentOption };
    }
    const response = await api.post('/payments/create-order', payload);
    return response.data.data;
  } catch (error) {
    throw error;
  }
};

export const verifyRazorpayPayment = async (paymentData) => {
  try {
    const response = await api.post('/payments/verify', paymentData);
    return response.data;
  } catch (error) {
    throw error;
  }
};
