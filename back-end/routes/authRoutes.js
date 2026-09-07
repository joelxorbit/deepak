import express from 'express';
import {
  login,
  googleLogin,
  logout,
  getProfile,
  updateProfile,
  getBookings,
  getBookingDetails
} from '../controllers/authController.js';
import { requireCustomer } from '../middlewares/authMiddleware.js';
import { validateCustomerLogin, validateGoogleLogin, validateUpdateProfile } from '../validators/authValidator.js';
import { validateRequest } from '../middlewares/validateRequest.js';

const router = express.Router();

// Base Route: /api/auth

// Customer Authentication (Zero 15-minute / 2-minute customer login lockout)
router.post('/google', validateGoogleLogin, validateRequest, googleLogin);
router.post('/login', validateCustomerLogin, validateRequest, login);
router.post('/logout', logout);

// Customer Profile
router.get('/me', requireCustomer, getProfile);
router.put('/profile', requireCustomer, validateUpdateProfile, validateRequest, updateProfile);

// Customer Booking History & Details
router.get('/bookings', requireCustomer, getBookings);
router.get('/bookings/:bookingId', requireCustomer, getBookingDetails);

export default router;
