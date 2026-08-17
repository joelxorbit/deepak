import {
  createEnquiryDoc,
  getEnquiriesWithFilters,
  updateEnquiryStatusDoc,
  deleteEnquiryDoc
} from '../repositories/enquiryRepository.js';
import { logger } from '../utils/logger.js';
import { cacheManager } from '../utils/cacheManager.js';
import { createAuditLog } from '../repositories/auditRepository.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';

export const createEnquiryService = async ({ name, phone, email, subject, message }) => {
  if (!name || !phone || !message) {
    const error = new Error('Name, Phone, and Message are required.');
    error.statusCode = 400;
    throw error;
  }

  const enquiry = await createEnquiryDoc({ name, phone, email, subject, message });
  cacheManager.del('admin_dashboard_stats');
  logger.info(`[EnquiryService] New contact enquiry created by ${name} (${phone}).`);

  await createAuditLog({
    action: AUDIT_ACTIONS.ENQUIRY_CREATE,
    user: name,
    details: { enquiryId: enquiry.id, phone }
  });

  return enquiry;
};

export const getEnquiriesService = async (status, search) => {
  return await getEnquiriesWithFilters({ status, search });
};

export const updateEnquiryStatusService = async (id, status) => {
  const updated = await updateEnquiryStatusDoc(id, status);
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
    details: { enquiryId: id, status }
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
