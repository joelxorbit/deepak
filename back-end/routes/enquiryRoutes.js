import express from 'express';
import {
  createEnquiry,
  getEnquiries,
  getMyEnquiries,
  updateEnquiryStatus,
  deleteEnquiry
} from '../controllers/enquiryController.js';
import { requireAdmin, requireCustomer } from '../middlewares/authMiddleware.js';
import { createEnquiryValidationRules, updateEnquiryStatusValidationRules } from '../validators/enquiryValidator.js';
import { validateRequest } from '../middlewares/validateRequest.js';

const router = express.Router();

// Base Route: /api/enquiries or /api/v1/enquiries

// Public Enquiry Submission (with validation)
router.post('/', createEnquiryValidationRules, validateRequest, createEnquiry);

// Authenticated Customer Enquiry History
router.get('/my', requireCustomer, getMyEnquiries);

// Protected Admin Operations
router.get('/', requireAdmin, getEnquiries);
router.patch('/:id/status', requireAdmin, updateEnquiryStatusValidationRules, validateRequest, updateEnquiryStatus);
router.delete('/:id', requireAdmin, deleteEnquiry);

export default router;
