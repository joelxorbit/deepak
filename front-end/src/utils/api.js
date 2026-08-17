import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

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
