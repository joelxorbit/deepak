import {
  createBookingService,
  trackBookingService,
  cancelBookingService,
  markBookingAsPaidService,
  getAllBookingsService,
  approveBookingService,
  rejectBookingService,
  getBookedSlotsService,
  getBookingHistoryService,
  reviewBookingService,
  adminCancelBookingService
} from '../services/bookingService.js';
import { calculateBookingPrice } from '../services/rateService.js';
import { sendSuccess } from '../utils/response.js';

export const previewBookingPrice = async (req, res, next) => {
  try {
    const { date, slots, sportId, paymentOption, couponCode } = req.body;
    const pricing = await calculateBookingPrice({
      date,
      slots,
      sportId,
      paymentOption,
      couponCode
    });
    return sendSuccess(res, 'Price preview calculated successfully', pricing);
  } catch (error) {
    next(error);
  }
};

export const createBooking = async (req, res, next) => {
  try {
    const booking = await createBookingService(req.body);
    return sendSuccess(res, 'Booking created successfully', booking, 201);
  } catch (error) {
    next(error);
  }
};

export const trackBooking = async (req, res, next) => {
  try {
    const query = req.query.query || req.body.query;
    const bookings = await trackBookingService(query);
    return sendSuccess(res, 'Bookings retrieved successfully', bookings);
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const bookingId = req.body.bookingId || req.params.bookingId;
    const booking = await cancelBookingService(bookingId);
    return sendSuccess(res, `Booking ${booking.bookingId} cancelled successfully`, booking);
  } catch (error) {
    next(error);
  }
};

export const markBookingAsPaid = async (req, res, next) => {
  try {
    const bookingId = req.params.id || req.params.bookingId || req.body.bookingId;
    const adminUser = req.admin ? req.admin.username : 'Admin';
    const booking = await markBookingAsPaidService(bookingId, adminUser);
    return sendSuccess(res, `Payment marked as Paid for booking ${booking.bookingId}`, booking);
  } catch (error) {
    next(error);
  }
};

export const getAllBookings = async (req, res, next) => {
  try {
    const { status, search, filter } = req.query;
    const bookings = await getAllBookingsService(status, search, filter);
    return sendSuccess(res, 'All bookings retrieved successfully', bookings);
  } catch (error) {
    next(error);
  }
};

export const reviewBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id || req.params.bookingId || req.body.bookingId;
    const adminUser = req.admin || 'admin';
    const booking = await reviewBookingService(bookingId, adminUser);
    return sendSuccess(res, `Booking ${booking.bookingId} marked as reviewed`, booking);
  } catch (error) {
    next(error);
  }
};

export const adminCancelBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id || req.params.bookingId || req.body.bookingId;
    const { reason } = req.body;
    const adminUser = req.admin || 'admin';
    const booking = await adminCancelBookingService(bookingId, adminUser, reason);
    return sendSuccess(res, `Booking ${booking.bookingId} cancelled by admin`, booking);
  } catch (error) {
    next(error);
  }
};

export const approveBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id || req.params.bookingId;
    const adminId = req.admin ? req.admin.id || req.admin._id : null;
    const booking = await approveBookingService(bookingId, adminId);
    return sendSuccess(res, `Booking ${booking.bookingId} approved successfully`, booking);
  } catch (error) {
    next(error);
  }
};

export const rejectBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id || req.params.bookingId;
    const booking = await rejectBookingService(bookingId);
    return sendSuccess(res, `Booking ${booking.bookingId} rejected successfully`, booking);
  } catch (error) {
    next(error);
  }
};

export const getBookedSlots = async (req, res, next) => {
  try {
    const data = await getBookedSlotsService(req.query.date);
    return sendSuccess(res, 'Booked slots retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

export const bookingHistory = async (req, res, next) => {
  try {
    const history = await getBookingHistoryService();
    return sendSuccess(res, 'Booking history retrieved successfully', history);
  } catch (error) {
    next(error);
  }
};

