import {
  getCompletedEvents,
  createEvent,
  updateEvent,
  softDeleteEvent,
  findEventById
} from '../repositories/eventRepository.js';
import { deleteFileFromStorage } from '../utils/storage.js';
import { createAuditLog } from '../repositories/auditRepository.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

export const getCompletedEventsService = async () => {
  return await getCompletedEvents();
};

export const addEventService = async ({ title, description, image, date, category }) => {
  const newEvent = await createEvent({
    title,
    description,
    image,
    date,
    category: category || 'COMPLETED'
  });

  logger.info(`[EventService] Created new event: ${newEvent.title}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.EVENT_CREATE,
    user: 'admin',
    details: { eventId: newEvent.id, title: newEvent.title }
  });

  return newEvent;
};

export const updateEventService = async (id, { title, description, image, date, category }) => {
  const existing = await findEventById(id);
  if (!existing) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  // If image changed, cleanup old storage file
  if (image && existing.image && image !== existing.image) {
    await deleteFileFromStorage(existing.image);
  }

  const updated = await updateEvent(id, { title, description, image, date, category });
  logger.info(`[EventService] Updated event: ${id}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.EVENT_UPDATE,
    user: 'admin',
    details: { eventId: id }
  });

  return updated;
};

export const deleteEventService = async (id) => {
  const deleted = await softDeleteEvent(id, 'admin');
  if (!deleted) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  if (deleted.image) {
    await deleteFileFromStorage(deleted.image);
  }

  logger.info(`[EventService] Soft-deleted event: ${id}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.EVENT_DELETE,
    user: 'admin',
    details: { eventId: id }
  });

  return { id, _id: id };
};
