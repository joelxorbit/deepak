import express from 'express';
import {
  createEnquiry,
  getEnquiries,
  updateEnquiryStatus,
  deleteEnquiry
} from '../controllers/enquiryController.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Base Route: /api/enquiries

// Public Enquiry Submission
router.post('/', createEnquiry);

// Protected Admin Operations
router.get('/', requireAdmin, getEnquiries);
router.patch('/:id/status', requireAdmin, updateEnquiryStatus);
router.delete('/:id', requireAdmin, deleteEnquiry);

export default router;
