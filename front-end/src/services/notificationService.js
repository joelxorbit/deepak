import { api } from '../utils/api';

/**
 * Fetch in-app notifications for authenticated user/admin.
 */
export const fetchNotificationsService = async ({ isRead, limit = 50 } = {}) => {
  const params = { limit };
  if (typeof isRead === 'boolean') {
    params.isRead = isRead;
  }
  const response = await api.get('/notifications', { params });
  return response.data.data;
};

/**
 * Fetch unread notification count.
 */
export const fetchUnreadCountService = async () => {
  const response = await api.get('/notifications/unread-count');
  return response.data.data?.unreadCount ?? 0;
};

/**
 * Mark a single notification as read.
 */
export const markNotificationReadService = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data.data;
};

/**
 * Mark all notifications as read.
 */
export const markAllNotificationsReadService = async () => {
  const response = await api.post('/notifications/read-all');
  return response.data.data;
};
