import Joi from 'joi';

export const customerLoginSchema = Joi.object({
  phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).optional().messages({
    'string.pattern.base': 'Please enter a valid 10-digit Indian Mobile Number starting with 6, 7, 8, or 9'
  }),
  mobileNumber: Joi.string().trim().pattern(/^[6-9]\d{9}$/).optional().messages({
    'string.pattern.base': 'Please enter a valid 10-digit Indian Mobile Number starting with 6, 7, 8, or 9'
  }),
  name: Joi.string().trim().min(2).max(60).optional(),
  email: Joi.string().email().allow('').optional()
}).or('phone', 'mobileNumber');

export const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).optional().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 60 characters'
  }),
  phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).optional().messages({
    'string.pattern.base': 'Please enter a valid 10-digit Indian Mobile Number starting with 6, 7, 8, or 9'
  }),
  mobileNumber: Joi.string().trim().pattern(/^[6-9]\d{9}$/).optional().messages({
    'string.pattern.base': 'Please enter a valid 10-digit Indian Mobile Number starting with 6, 7, 8, or 9'
  }),
  email: Joi.string().email().allow('', null).optional().messages({
    'string.email': 'Please provide a valid email address'
  }),
  avatar: Joi.string().uri().allow('', null).optional(),
  profileImage: Joi.string().uri().allow('', null).optional()
}).unknown(false); // Reject any unapproved fields (role, admin, status, etc.)

export const googleLoginSchema = Joi.object({
  idToken: Joi.string().optional(),
  credential: Joi.string().optional(),
  token: Joi.string().optional(),
  googleId: Joi.string().optional(),
  email: Joi.string().email().allow('').optional(),
  name: Joi.string().allow('', null).optional(),
  avatar: Joi.string().allow('', null).optional(),
  profileImage: Joi.string().allow('', null).optional()
}).or('idToken', 'credential', 'token', 'googleId');

export const validateCustomerLogin = (req, res, next) => {
  const { error } = customerLoginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};

export const validateGoogleLogin = (req, res, next) => {
  const { error } = googleLoginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};

export const validateUpdateProfile = (req, res, next) => {
  const { error } = updateProfileSchema.validate(req.body, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};
