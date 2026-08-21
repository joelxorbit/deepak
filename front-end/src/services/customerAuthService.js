import { api } from '../utils/api';

export const customerSignupService = async (name, username, phone, password) => {
  const response = await api.post('/customers/signup', { name, username, phone, password });
  return response.data;
};

export const customerGoogleAuthService = async (credential, username = null) => {
  const response = await api.post('/customers/google-auth', { credential, username });
  return response.data;
};

export const customerLoginService = async (username, password) => {
  const response = await api.post('/customers/login', { username, password });
  return response.data;
};

export const customerLogoutService = async () => {
  const response = await api.post('/customers/logout');
  return response.data;
};

export const getCustomerProfileService = async () => {
  const response = await api.get('/customers/me');
  return response.data;
};
