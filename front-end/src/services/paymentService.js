import api from './api';

export const createRazorpayOrder = async (amount, receipt) => {
  try {
    const response = await api.post('/payments/create-order', { amount, receipt });
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
