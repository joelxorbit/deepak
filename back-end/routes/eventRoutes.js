import express from 'express';
import {
  getEvents,
  getAdminEvents,
  getEventById,
  addEvent,
  updateEvent,
  publishEvent,
  unpublishEvent,
  archiveEvent,
  deleteEvent,
  uploadBanner
} from '../controllers/eventController.js';
import {
  eventValidationRules,
  updateEventValidationRules,
  uploadBannerValidationRules
} from '../validators/eventValidator.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { requireAdmin, optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Base Route: /api/events or /api/v1/events

// Public Event Routes
router.get('/', getEvents);
router.get('/:id', optionalAuth, getEventById);

// Admin-Protected Event Routes
router.get('/admin/all', requireAdmin, getAdminEvents);
router.post('/', requireAdmin, eventValidationRules, validateRequest, addEvent);
router.post('/upload', requireAdmin, uploadBannerValidationRules, validateRequest, uploadBanner);
router.put('/:id', requireAdmin, updateEventValidationRules, validateRequest, updateEvent);
router.patch('/:id/publish', requireAdmin, publishEvent);
router.patch('/:id/unpublish', requireAdmin, unpublishEvent);
router.post('/:id/archive', requireAdmin, archiveEvent);
router.delete('/:id', requireAdmin, deleteEvent);

export default router;
