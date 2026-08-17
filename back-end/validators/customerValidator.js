import Joi from 'joi';

export const customerSchema = Joi.object({
  name: Joi.string().trim().min(3).max(60).required().messages({
    'string.empty': 'Customer name is required',
    'string.min': 'Name must be at least 3 characters long',
    'string.max': 'Name cannot exceed 60 characters'
  }),
  phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required().messages({
    'string.empty': 'Phone number is required',
    'string.pattern.base': 'Please enter a valid 10-digit Indian Mobile Number'
  })
});

export const validateCustomer = (req, res, next) => {
  const { error } = customerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};

export const customerValidationRules = [validateCustomer];
