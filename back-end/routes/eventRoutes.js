import express from 'express';
import {
  getCompletedEvents,
  addEvent,
  updateEvent,
  deleteEvent
} from '../controllers/eventController.js';
import { eventValidationRules } from '../validators/eventValidator.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Base Route: /api/events
router.get('/', getCompletedEvents);
router.post('/', requireAdmin, eventValidationRules, validateRequest, addEvent);
router.put('/:id', requireAdmin, eventValidationRules, validateRequest, updateEvent);
router.delete('/:id', requireAdmin, deleteEvent);

export default router;
