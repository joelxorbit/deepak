import {
  createEnquiryService,
  getEnquiriesService,
  updateEnquiryStatusService,
  deleteEnquiryService
} from '../services/enquiryService.js';
import { sendSuccess } from '../utils/response.js';

export const createEnquiry = async (req, res, next) => {
  try {
    const enquiry = await createEnquiryService(req.body);
    return sendSuccess(res, 'Enquiry submitted successfully', enquiry, 201);
  } catch (error) {
    next(error);
  }
};

export const getEnquiries = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const enquiries = await getEnquiriesService(status, search);
    return sendSuccess(res, 'Enquiries retrieved successfully', enquiries);
  } catch (error) {
    next(error);
  }
};

export const updateEnquiryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await updateEnquiryStatusService(id, status);
    return sendSuccess(res, `Enquiry status updated to ${status}`, updated);
  } catch (error) {
    next(error);
  }
};

export const deleteEnquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await deleteEnquiryService(id);
    return sendSuccess(res, 'Enquiry deleted successfully', result);
  } catch (error) {
    next(error);
  }
};
