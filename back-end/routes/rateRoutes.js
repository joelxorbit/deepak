import express from 'express';
import {
  getRateRules,
  getRateRuleById,
  createRateRule,
  updateRateRule,
  toggleRateRuleActive,
  deleteRateRule
} from '../controllers/rateController.js';
import {
  createRateValidationRules,
  updateRateValidationRules
} from '../validators/rateValidator.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Base Route: /api/rates or /api/v1/rates

// Protected Admin-Only Rate Management
router.use(requireAdmin);

router.get('/', getRateRules);
router.get('/:id', getRateRuleById);
router.post('/', createRateValidationRules, validateRequest, createRateRule);
router.put('/:id', updateRateValidationRules, validateRequest, updateRateRule);
router.patch('/:id/active', toggleRateRuleActive);
router.delete('/:id', deleteRateRule);

export default router;
