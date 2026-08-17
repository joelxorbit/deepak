import express from 'express';
import {
  getCustomers,
  getCustomer
} from '../controllers/customerController.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Base Route: /api/customers
router.get('/', requireAdmin, getCustomers);
router.get('/:id', requireAdmin, getCustomer);

export default router;
