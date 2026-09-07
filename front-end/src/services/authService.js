import { api } from '../utils/api';

export const loginWithGoogleApi = async (googleAuthData) => {
  const response = await api.post('/auth/google', googleAuthData);
  return response.data.data;
};

export const customerLoginApi = async ({ phone, name, email }) => {
  const response = await api.post('/auth/login', { phone, name, email });
  return response.data.data;
};

export const getProfileApi = async () => {
  const response = await api.get('/auth/me');
  return response.data.data;
};

export const updateProfileApi = async (profileData) => {
  const response = await api.put('/auth/profile', profileData);
  return response.data.data;
};

export const getCustomerBookingsApi = async (filter = 'all') => {
  const response = await api.get('/auth/bookings', { params: { filter } });
  return response.data.data;
};

export const getCustomerBookingDetailsApi = async (bookingId) => {
  const response = await api.get(`/auth/bookings/${bookingId}`);
  return response.data.data;
};

export const customerLogoutApi = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};
