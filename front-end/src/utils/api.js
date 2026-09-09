import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Request Interceptor to attach Bearer token if present in localStorage
api.interceptors.request.use(
  (config) => {
    const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    const customerToken = localStorage.getItem('elite_pitch_customer_token');
    const adminToken = localStorage.getItem('elite_pitch_admin_token');

    let token = null;
    const clientRole = config.headers?.['X-Client-Role'];

    if (clientRole === 'admin') {
      token = adminToken;
    } else if (clientRole === 'customer') {
      token = customerToken;
    } else if (isAdminRoute) {
      token = adminToken;
    } else {
      token = customerToken;
    }

    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for global error handling and auto-logout on HTTP 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('elite_pitch_admin_auth');
      if (window.location.pathname.includes('admin')) {
        window.location.href = '/admin';
      }
    }
    return Promise.reject(error);
  }
);
