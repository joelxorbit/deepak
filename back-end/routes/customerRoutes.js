import express from 'express';
import {
  getCustomers,
  getCustomer,
  signupCustomer,
  loginCustomer,
  googleAuth,
  logoutCustomer,
  getMe
} from '../controllers/customerController.js';
import { requireAdmin, requireCustomer } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Base Route: /api/customers
router.post('/signup', signupCustomer);
router.post('/login', loginCustomer);
router.post('/google-auth', googleAuth);
router.post('/logout', requireCustomer, logoutCustomer);
router.get('/me', requireCustomer, getMe);

router.get('/', requireAdmin, getCustomers);
router.get('/:id', requireAdmin, getCustomer);

export default router;
