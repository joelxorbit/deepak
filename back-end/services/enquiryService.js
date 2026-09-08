import {
  createEnquiryDoc,
  getEnquiriesWithFilters,
  getCustomerEnquiriesDoc,
  findEnquiryByIdDoc,
  updateEnquiryStatusDoc,
  deleteEnquiryDoc
} from '../repositories/enquiryRepository.js';
import { findEventById } from '../repositories/eventRepository.js';
import { notifyEnquiryReceived, notifyEnquiryStatusUpdated } from './notificationService.js';
import { logger } from '../utils/logger.js';
import { cacheManager } from '../utils/cacheManager.js';
import { createAuditLog } from '../repositories/auditRepository.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';

export const createEnquiryService = async ({
  name,
  phone,
  email,
  subject,
  message,
  eventId = null,
  eventTitle = null,
  preferredDate = null,
  participantCount = null,
  contactPreference = 'any',
  customerId = null
}) => {
  if (!name || !phone || !message) {
    const error = new Error('Name, Phone, and Message are required.');
    error.statusCode = 400;
    throw error;
  }

  let canonicalEventTitle = null;
  let validatedEventId = null;

  // Validate Event if eventId provided
  if (eventId) {
    const event = await findEventById(eventId);
    if (!event) {
      const error = new Error(`Event with ID '${eventId}' not found.`);
      error.statusCode = 404;
      throw error;
    }
    if (event.registrationStatus === 'CLOSED') {
      const error = new Error(`Registration for event "${event.title}" is currently closed.`);
      error.statusCode = 400;
      throw error;
    }
    if (event.isArchived || event.status === 'Archived') {
      const error = new Error(`Event "${event.title}" is archived and no longer accepting enquiries.`);
      error.statusCode = 400;
      throw error;
    }
    validatedEventId = event.id;
    canonicalEventTitle = event.title; // Authoritative title from database
  }

  const enquiry = await createEnquiryDoc({
    name,
    phone,
    email,
    subject,
    message,
    eventId: validatedEventId,
    eventTitle: canonicalEventTitle,
    preferredDate,
    participantCount,
    contactPreference,
    customerId
  });

  cacheManager.del('admin_dashboard_stats');
  logger.info(`[EnquiryService] New enquiry created by ${name} (${phone}) - ID: ${enquiry.id}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.ENQUIRY_CREATE,
    user: name,
    details: { enquiryId: enquiry.id, phone, eventId: validatedEventId }
  });

  // Non-blocking notification trigger
  notifyEnquiryReceived(enquiry).catch(err => {
    logger.error(`[EnquiryService] Failed to send enquiry notification: ${err.message}`);
  });

  return enquiry;
};

export const getEnquiriesService = async ({ status, search, eventId } = {}) => {
  return await getEnquiriesWithFilters({ status, search, eventId });
};

export const getCustomerEnquiriesService = async (customerUser) => {
  if (!customerUser) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }

  const customerId = customerUser.id || customerUser.uid || customerUser.customerId || customerUser._id;
  const phone = customerUser.phone;
  const email = customerUser.email;

  return await getCustomerEnquiriesDoc({ customerId, phone, email });
};

export const updateEnquiryStatusService = async (id, status, notes = null) => {
  const existing = await findEnquiryByIdDoc(id);
  if (!existing) {
    const error = new Error('Enquiry not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await updateEnquiryStatusDoc(id, status, notes);
  if (!updated) {
    const error = new Error('Enquiry not found');
    error.statusCode = 404;
    throw error;
  }

  cacheManager.del('admin_dashboard_stats');
  logger.info(`[EnquiryService] Updated enquiry ${id} status to ${status}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.ENQUIRY_STATUS_UPDATE,
    user: 'admin',
    details: { enquiryId: id, status, notes }
  });

  // Non-blocking notification trigger for customer
  notifyEnquiryStatusUpdated(updated, status, notes).catch(err => {
    logger.error(`[EnquiryService] Failed to send enquiry update notification: ${err.message}`);
  });

  return updated;
};

export const deleteEnquiryService = async (id) => {
  const result = await deleteEnquiryDoc(id);
  if (!result) {
    const error = new Error('Enquiry not found');
    error.statusCode = 404;
    throw error;
  }

  cacheManager.del('admin_dashboard_stats');
  logger.info(`[EnquiryService] Deleted enquiry ${id}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.ENQUIRY_DELETE,
    user: 'admin',
    details: { enquiryId: id }
  });

  return result;
};
