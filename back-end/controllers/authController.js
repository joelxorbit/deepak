import {
  loginCustomerService,
  loginWithGoogleService,
  getCustomerProfileService,
  updateCustomerProfileService,
  getCustomerBookingsService,
  getCustomerBookingDetailsService
} from '../services/authService.js';
import { sendSuccess } from '../utils/response.js';
import { ENV } from '../config/env.js';

export const googleLogin = async (req, res, next) => {
  try {
    const { idToken, credential, token, googleId, email, name, avatar, profileImage } = req.body;
    const authData = await loginWithGoogleService({
      idToken: idToken || credential || token,
      googleId,
      email,
      name,
      avatar: avatar || profileImage
    });

    res.cookie('elite_pitch_customer_token', authData.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: ENV.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return sendSuccess(res, 'Google authentication successful', authData);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { phone, mobileNumber, name, email } = req.body;
    const authData = await loginCustomerService({ phone, mobileNumber, name, email });

    res.cookie('elite_pitch_customer_token', authData.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: ENV.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return sendSuccess(res, 'Customer authenticated successfully', authData);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie('elite_pitch_customer_token', {
      httpOnly: true,
      sameSite: 'strict',
      secure: ENV.NODE_ENV === 'production'
    });
    return sendSuccess(res, 'Customer logged out successfully');
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const profile = await getCustomerProfileService(req.customer.id);
    return sendSuccess(res, 'Customer profile retrieved successfully', profile);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const updated = await updateCustomerProfileService(req.customer.id, req.body);
    return sendSuccess(res, 'Profile updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

export const getBookings = async (req, res, next) => {
  try {
    const filter = (req.query.filter || req.query.status || 'all').toLowerCase();
    const bookings = await getCustomerBookingsService(req.customer, filter);
    return sendSuccess(res, 'Customer bookings retrieved successfully', bookings);
  } catch (error) {
    next(error);
  }
};

export const getBookingDetails = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId || req.params.id;
    const booking = await getCustomerBookingDetailsService(req.customer, bookingId);
    return sendSuccess(res, 'Booking details retrieved successfully', booking);
  } catch (error) {
    next(error);
  }
};
