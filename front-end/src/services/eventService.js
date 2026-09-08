import { api } from '../utils/api';

/**
 * Get public events (GET /api/events)
 * Returns published upcoming events and completed showcase events
 */
export const getPublicEventsService = async () => {
  const response = await api.get('/events');
  return response.data.data;
};

// Backward-compatible alias for existing consumers
export const getCompletedEventsService = getPublicEventsService;

/**
 * Get all events for admin console (GET /api/events/admin/all)
 */
export const getAdminEventsService = async (params = {}) => {
  const response = await api.get('/events/admin/all', { params });
  return response.data.data;
};

/**
 * Get single event by ID (GET /api/events/:id)
 */
export const getEventByIdService = async (eventId) => {
  const response = await api.get(`/events/${eventId}`);
  return response.data.data;
};

/**
 * Create new event (POST /api/events)
 */
export const addEventService = async (eventData) => {
  const response = await api.post('/events', eventData);
  return response.data.data;
};

export const createUpcomingEventService = addEventService;

/**
 * Update event by ID (PUT /api/events/:id)
 */
export const updateEventService = async (eventId, updatedData) => {
  const response = await api.put(`/events/${eventId}`, updatedData);
  return response.data.data;
};

export const updateUpcomingEventService = updateEventService;

/**
 * Publish event (PATCH /api/events/:id/publish)
 */
export const publishEventService = async (eventId) => {
  const response = await api.patch(`/events/${eventId}/publish`);
  return response.data.data;
};

/**
 * Unpublish event (PATCH /api/events/:id/unpublish)
 */
export const unpublishEventService = async (eventId) => {
  const response = await api.patch(`/events/${eventId}/unpublish`);
  return response.data.data;
};

/**
 * Archive event (POST /api/events/:id/archive)
 */
export const archiveEventService = async (eventId) => {
  const response = await api.post(`/events/${eventId}/archive`);
  return response.data.data;
};

/**
 * Upload event banner image (POST /api/events/upload)
 */
export const uploadEventBannerService = async (uploadData) => {
  const response = await api.post('/events/upload', uploadData);
  return response.data.data;
};

/**
 * Delete event by ID (DELETE /api/events/:id)
 */
export const deleteEventService = async (eventId) => {
  const response = await api.delete(`/events/${eventId}`);
  return response.data.data;
};
