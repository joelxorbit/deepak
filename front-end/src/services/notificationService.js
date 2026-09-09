import { api } from '../utils/api';

/**
 * Fetch in-app notifications for authenticated user/admin.
 */
export const fetchNotificationsService = async ({ isRead, limit = 50, role } = {}) => {
  const params = { limit };
  if (typeof isRead === 'boolean') {
    params.isRead = isRead;
  }
  const headers = {};
  if (role) {
    headers['X-Client-Role'] = role;
    params.role = role;
  }
  const response = await api.get('/notifications', { params, headers });
  return response.data.data;
};

/**
 * Fetch unread notification count.
 */
export const fetchUnreadCountService = async ({ role } = {}) => {
  const params = {};
  const headers = {};
  if (role) {
    headers['X-Client-Role'] = role;
    params.role = role;
  }
  const response = await api.get('/notifications/unread-count', { params, headers });
  return response.data.data?.unreadCount ?? 0;
};

/**
 * Mark a single notification as read.
 */
export const markNotificationReadService = async (id, { role } = {}) => {
  const headers = {};
  if (role) headers['X-Client-Role'] = role;
  const response = await api.patch(`/notifications/${id}/read`, {}, { headers });
  return response.data.data;
};

/**
 * Mark all notifications as read.
 */
export const markAllNotificationsReadService = async ({ role } = {}) => {
  const headers = {};
  if (role) headers['X-Client-Role'] = role;
  const response = await api.post('/notifications/read-all', {}, { headers });
  return response.data.data;
};
