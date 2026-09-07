import { api } from '../utils/api';

/**
 * Public or Customer Enquiry / Event Booking Request Submission (POST /api/enquiries)
 */
export const submitEnquiryService = async (enquiryData) => {
  const response = await api.post('/enquiries', enquiryData);
  return response.data.data;
};

/**
 * Customer Enquiry History (GET /api/enquiries/my)
 */
export const fetchCustomerEnquiriesService = async () => {
  const response = await api.get('/enquiries/my');
  return response.data.data;
};

/**
 * Admin Enquiries List (GET /api/enquiries)
 */
export const fetchEnquiriesService = async (status = 'All', search = '', eventId = '') => {
  const params = {};
  if (status && status !== 'All') params.status = status;
  if (search) params.search = search;
  if (eventId) params.eventId = eventId;
  const response = await api.get('/enquiries', { params });
  return response.data.data;
};

/**
 * Admin Update Enquiry Status (PATCH /api/enquiries/:id/status)
 */
export const updateEnquiryStatusService = async (id, status, notes = '') => {
  const response = await api.patch(`/enquiries/${id}/status`, { status, notes });
  return response.data.data;
};

/**
 * Admin Delete Enquiry (DELETE /api/enquiries/:id)
 */
export const deleteEnquiryService = async (id) => {
  const response = await api.delete(`/enquiries/${id}`);
  return response.data.data;
};
