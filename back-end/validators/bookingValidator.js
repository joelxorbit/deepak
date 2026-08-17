import Joi from 'joi';
import { PAYMENT_METHODS, TIME_SLOTS_ORDER } from '../utils/constants.js';

export const createBookingSchema = Joi.object({
  customerName: Joi.string().trim().min(3).max(60).required().messages({
    'string.empty': 'Full Name is required',
    'string.min': 'Full Name must be at least 3 characters long',
    'string.max': 'Full Name cannot exceed 60 characters'
  }),

  mobileNumber: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required().messages({
    'string.empty': 'Mobile Number is required',
    'string.pattern.base': 'Please enter a valid 10-digit Indian Mobile Number starting with 6, 7, 8, or 9'
  }),

  date: Joi.string().isoDate().required().custom((value, helpers) => {
    const today = new Date().toISOString().split('T')[0];
    const selected = new Date(value).toISOString().split('T')[0];
    if (selected < today) {
      return helpers.message('Booking Date cannot be in the past');
    }
    return value;
  }).messages({
    'string.empty': 'Booking Date is required',
    'string.isoDate': 'Booking Date must be a valid ISO Date'
  }),

  slots: Joi.array().items(Joi.string()).min(1).required().custom((slots, helpers) => {
    if (!Array.isArray(slots) || slots.length === 0) return slots;

    const indices = slots
      .map(slot => TIME_SLOTS_ORDER.indexOf(slot))
      .filter(index => index !== -1)
      .sort((a, b) => a - b);

    if (indices.length !== slots.length) {
      return helpers.message('One or more selected slots are invalid');
    }

    for (let i = 0; i < indices.length - 1; i++) {
      if (indices[i + 1] - indices[i] !== 1) {
        return helpers.message('Selected time slots must be consecutive hours');
      }
    }
    return slots;
  }).messages({
    'array.min': 'At least one Time Slot must be selected'
  }),

  paymentMethod: Joi.string().valid(...Object.values(PAYMENT_METHODS)).required().messages({
    'any.only': 'Payment Method must be either "Pay Now" or "Pay at Spot"',
    'string.empty': 'Payment Method is required'
  }),

  slotPrice: Joi.number().optional(),
  slotCount: Joi.number().optional(),
  subtotal: Joi.number().optional(),
  gstAmount: Joi.number().optional(),
  totalAmount: Joi.number().optional()
});

export const validateCreateBooking = (req, res, next) => {
  const { error } = createBookingSchema.validate(req.body, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};

export const createBookingValidationRules = [validateCreateBooking];
