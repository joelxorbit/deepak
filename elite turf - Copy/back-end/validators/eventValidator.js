import Joi from 'joi';

export const eventSchema = Joi.object({
  title: Joi.string().trim().min(3).required().messages({
    'string.empty': 'Event title is required',
    'string.min': 'Title must be at least 3 characters long'
  }),
  description: Joi.string().trim().required().messages({
    'string.empty': 'Description is required'
  }),
  image: Joi.string().trim().required().messages({
    'string.empty': 'Image URL is required'
  }),
  date: Joi.string().trim().required().messages({
    'string.empty': 'Completion date is required'
  }),
  category: Joi.string().trim().default('COMPLETED')
});

export const validateEvent = (req, res, next) => {
  const { error } = eventSchema.validate(req.body, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};

export const eventValidationRules = [validateEvent];
