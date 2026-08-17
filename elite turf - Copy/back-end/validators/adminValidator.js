import Joi from 'joi';

export const adminLoginSchema = Joi.object({
  username: Joi.string().trim().min(3).required().messages({
    'string.empty': 'Username is required',
    'string.min': 'Username must be at least 3 characters long'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required'
  })
});

export const validateAdminLogin = (req, res, next) => {
  const { error } = adminLoginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};

export const adminLoginValidationRules = [validateAdminLogin];
