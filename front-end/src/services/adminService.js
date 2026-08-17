import { api } from '../utils/api';

// Admin Login (POST /api/admin/login)
export const loginAdminService = async (username, password) => {
  const response = await api.post('/admin/login', { username, password });
  return response.data;
};

// Admin Logout (POST /api/admin/logout)
export const logoutAdminService = async () => {
  const response = await api.post('/admin/logout');
  return response.data;
};

// Admin Dashboard Overview Statistics (GET /api/admin/dashboard)
export const fetchAdminDashboardStatsService = async () => {
  const response = await api.get('/admin/dashboard');
  return response.data.data;
};

// Customers List (GET /api/customers)
export const fetchCustomersService = async (search = '') => {
  const response = await api.get('/customers', { params: { search } });
  return response.data.data;
};

// Public Contact Enquiry Submission (POST /api/enquiries)
export const submitEnquiryService = async (enquiryData) => {
  const response = await api.post('/enquiries', enquiryData);
  return response.data.data;
};

// Admin Enquiries List (GET /api/enquiries)
export const fetchEnquiriesService = async (status = 'All', search = '') => {
  const response = await api.get('/enquiries', { params: { status, search } });
  return response.data.data;
};

// Admin Update Enquiry Status (PATCH /api/enquiries/:id/status)
export const updateEnquiryStatusService = async (id, status) => {
  const response = await api.patch(`/enquiries/${id}/status`, { status });
  return response.data.data;
};

// Admin Delete Enquiry (DELETE /api/enquiries/:id)
export const deleteEnquiryService = async (id) => {
  const response = await api.delete(`/enquiries/${id}`);
  return response.data.data;
};
