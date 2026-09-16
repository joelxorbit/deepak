import express from 'express';
import {
  login,
  logout,
  dashboard,
  getSettings,
  updateSettings
} from '../controllers/adminController.js';
import { adminLoginValidationRules } from '../validators/adminValidator.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { loginRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Base Route: /api/admin
router.post('/login', loginRateLimiter, adminLoginValidationRules, validateRequest, login);
router.post('/logout', requireAdmin, logout);
router.get('/dashboard', requireAdmin, dashboard);

router.get('/settings', requireAdmin, getSettings);
router.patch('/settings', requireAdmin, updateSettings);

export default router;
