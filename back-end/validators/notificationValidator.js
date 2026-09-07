import Joi from 'joi';

export const notificationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  isRead: Joi.boolean().optional()
}).unknown(true);

export const validateNotificationQuery = (req, res, next) => {
  const { error } = notificationQuerySchema.validate(req.query, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};
