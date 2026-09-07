import Joi from 'joi';
import { ENQUIRY_STATUS } from '../utils/constants.js';

export const createEnquirySchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required().messages({
    'string.empty': 'Full Name is required.',
    'string.min': 'Full Name must be at least 3 characters long.',
    'any.required': 'Full Name is required.'
  }),

  phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required().messages({
    'string.empty': 'Phone number is required.',
    'string.pattern.base': 'Please enter a valid 10-digit Indian mobile number.',
    'any.required': 'Phone number is required.'
  }),

  email: Joi.string().trim().email().allow('', null).optional().messages({
    'string.email': 'Please enter a valid email address.'
  }),

  subject: Joi.string().trim().max(200).allow('', null).optional(),

  message: Joi.string().trim().min(5).max(2000).required().messages({
    'string.empty': 'Message is required.',
    'string.min': 'Message must be at least 5 characters long.',
    'any.required': 'Message is required.'
  }),

  eventId: Joi.string().trim().allow('', null).optional(),
  eventTitle: Joi.string().trim().allow('', null).optional(),
  preferredDate: Joi.string().trim().allow('', null).optional(),
  participantCount: Joi.number().integer().min(1).max(500).allow(null).optional(),
  contactPreference: Joi.string().valid('phone', 'email', 'any').default('any').optional(),
  customerId: Joi.string().trim().allow('', null).optional()
}).unknown(true);

export const updateEnquiryStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(ENQUIRY_STATUS)).required().messages({
    'any.only': 'Invalid enquiry status.',
    'any.required': 'Status is required.'
  }),
  notes: Joi.string().trim().max(1000).allow('', null).optional()
}).unknown(true);

export const validateCreateEnquiry = (req, res, next) => {
  const { error } = createEnquirySchema.validate(req.body, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};

export const validateUpdateEnquiryStatus = (req, res, next) => {
  const { error } = updateEnquiryStatusSchema.validate(req.body, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};

export const createEnquiryValidationRules = [validateCreateEnquiry];
export const updateEnquiryStatusValidationRules = [validateUpdateEnquiryStatus];
