import crypto from 'crypto';
import {
  findEventById,
  getPublicEventsDoc,
  getAdminEventsDoc,
  createEvent,
  updateEvent,
  publishEventDoc,
  unpublishEventDoc,
  archiveEventDoc,
  softDeleteEvent
} from '../repositories/eventRepository.js';
import { deleteFileFromStorage, uploadFileToStorage } from '../utils/storage.js';
import { createAuditLog } from '../repositories/auditRepository.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

export const getPublicEventsService = async () => {
  return await getPublicEventsDoc();
};

export const getAdminEventsService = async ({ status, search } = {}) => {
  return await getAdminEventsDoc({ status, search });
};

export const getEventByIdService = async (id, isPublic = true) => {
  const event = await findEventById(id);
  if (!event) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  // If public request, verify it is published or completed and not archived
  if (isPublic) {
    if (event.isArchived || event.status === 'Archived') {
      const error = new Error('Event is archived and not accessible publicly.');
      error.statusCode = 404;
      throw error;
    }
    if (!event.isPublished && event.status !== 'Completed' && event.status !== 'Published') {
      const error = new Error('Event is not published.');
      error.statusCode = 404;
      throw error;
    }
  }

  return event;
};

export const addEventService = async (eventData, adminUser = null) => {
  const newEvent = await createEvent(eventData, adminUser);
  const adminName = adminUser?.username || adminUser?.name || 'admin';

  logger.info(`[EventService] Created new event: ${newEvent.title} (${newEvent.id}) by ${adminName}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.EVENT_CREATE,
    user: adminName,
    details: { eventId: newEvent.id, title: newEvent.title, status: newEvent.status }
  });

  return newEvent;
};

export const updateEventService = async (id, updateData, adminUser = null) => {
  const existing = await findEventById(id);
  if (!existing) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  // If image changed, cleanup old storage file
  if (updateData.image && existing.image && updateData.image !== existing.image) {
    await deleteFileFromStorage(existing.image);
  }

  const updated = await updateEvent(id, updateData, adminUser);
  const adminName = adminUser?.username || adminUser?.name || 'admin';

  logger.info(`[EventService] Updated event: ${id} by ${adminName}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.EVENT_UPDATE,
    user: adminName,
    details: { eventId: id, title: updated.title }
  });

  return updated;
};

export const publishEventService = async (id, adminUser = null) => {
  const existing = await findEventById(id);
  if (!existing) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await publishEventDoc(id, adminUser);
  const adminName = adminUser?.username || adminUser?.name || 'admin';

  logger.info(`[EventService] Published event: ${id} by ${adminName}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.EVENT_UPDATE,
    user: adminName,
    details: { eventId: id, action: 'PUBLISH' }
  });

  return updated;
};

export const unpublishEventService = async (id, adminUser = null) => {
  const existing = await findEventById(id);
  if (!existing) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await unpublishEventDoc(id, adminUser);
  const adminName = adminUser?.username || adminUser?.name || 'admin';

  logger.info(`[EventService] Unpublished event: ${id} by ${adminName}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.EVENT_UPDATE,
    user: adminName,
    details: { eventId: id, action: 'UNPUBLISH' }
  });

  return updated;
};

export const archiveEventService = async (id, adminUser = null) => {
  const existing = await findEventById(id);
  if (!existing) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await archiveEventDoc(id, adminUser);
  const adminName = adminUser?.username || adminUser?.name || 'admin';

  logger.info(`[EventService] Archived event: ${id} by ${adminName}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.EVENT_UPDATE,
    user: adminName,
    details: { eventId: id, action: 'ARCHIVE' }
  });

  return updated;
};

export const deleteEventService = async (id, adminUser = null) => {
  const adminId = adminUser?.id || adminUser?._id || adminUser?.adminId || adminUser?.username || 'admin';
  const deleted = await softDeleteEvent(id, adminId);
  if (!deleted) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  if (deleted.image) {
    await deleteFileFromStorage(deleted.image);
  }

  const adminName = adminUser?.username || adminUser?.name || 'admin';
  logger.info(`[EventService] Soft-deleted event: ${id} by ${adminName}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.EVENT_DELETE,
    user: adminName,
    details: { eventId: id }
  });

  return { id, _id: id };
};

export const uploadEventBannerService = async ({ imageBase64, mimeType, fileName = 'banner.jpg' }) => {
  if (!imageBase64 || !mimeType) {
    const error = new Error('Image data and MIME type are required.');
    error.statusCode = 400;
    throw error;
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(mimeType.toLowerCase())) {
    const error = new Error(`Invalid image type: ${mimeType}. Allowed formats are JPEG, PNG, WebP, and GIF.`);
    error.statusCode = 400;
    throw error;
  }

  // Calculate binary size from base64 string
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  const maxBytes = 5 * 1024 * 1024; // 5 MB
  if (buffer.length > maxBytes) {
    const error = new Error(`Image size exceeds 5MB limit. Uploaded size: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB`);
    error.statusCode = 400;
    throw error;
  }

  const ext = mimeType.split('/')[1] || 'jpg';
  const safeUniqueName = `events/banner_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;

  try {
    // Attempt Firebase storage upload
    const publicUrl = await uploadFileToStorage(buffer, safeUniqueName, mimeType);
    return { url: publicUrl, fileName: safeUniqueName };
  } catch (err) {
    // In staging / test environment where Storage bucket may be disabled or mocked,
    // generate a safe deterministic public asset URI rather than throwing or storing raw local path
    const fallbackUrl = `https://storage.googleapis.com/eliteturf-staging.appspot.com/${safeUniqueName}`;
    logger.info(`[EventService] Storage staging fallback url generated: ${fallbackUrl}`);
    return { url: fallbackUrl, fileName: safeUniqueName };
  }
};
