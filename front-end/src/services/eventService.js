import { api } from '../utils/api';

// Get completed events (GET /api/events)
export const getCompletedEventsService = async () => {
  const response = await api.get('/events');
  return response.data.data;
};

// Create new completed event (POST /api/events)
export const addEventService = async (eventData) => {
  const response = await api.post('/events', eventData);
  return response.data.data;
};

// Update event by ID (PUT /api/events/:id)
export const updateEventService = async (eventId, updatedData) => {
  const response = await api.put(`/events/${eventId}`, updatedData);
  return response.data.data;
};

// Delete event by ID (DELETE /api/events/:id)
export const deleteEventService = async (eventId) => {
  const response = await api.delete(`/events/${eventId}`);
  return response.data.data;
};
