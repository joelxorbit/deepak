import express from 'express';
import {
  getAvailability,
  createHold,
  releaseHold,
  getBlockedSlots,
  blockSlot,
  unblockSlot
} from '../controllers/availabilityController.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { blockSlotValidationRules } from '../validators/availabilityValidator.js';
import { validateRequest } from '../middlewares/validateRequest.js';

const router = express.Router();

// Base Route: /api/availability

// Public Endpoints
router.get('/', getAvailability);
router.get('/slots', getAvailability);
router.post('/hold', createHold);
router.post('/release-hold', releaseHold);

// Protected Admin Endpoints
router.get('/blocked', requireAdmin, getBlockedSlots);
router.post('/block', requireAdmin, blockSlotValidationRules, validateRequest, blockSlot);
router.delete('/unblock/:id', requireAdmin, unblockSlot);
router.delete('/block/:id', requireAdmin, unblockSlot);

export default router;

