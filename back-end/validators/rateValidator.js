import Joi from 'joi';

const rateDateValidator = (value, helpers) => {
  const { effectiveFrom, effectiveTo } = value;
  if (effectiveFrom && effectiveTo) {
    if (effectiveTo < effectiveFrom) {
      return helpers.message('Effective end date (effectiveTo) cannot be before start date (effectiveFrom).');
    }
  }
  return value;
};

const VALID_DAYS = ['ALL', 'WEEKDAY', 'WEEKEND', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const createRateRuleSchema = Joi.object({
  sportId: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Sport ID is required.',
    'any.required': 'Sport ID is required.'
  }),
  ratePerHour: Joi.number().positive().required().messages({
    'number.positive': 'Rate per hour must be a positive finite amount.',
    'any.required': 'Rate per hour is required.'
  }),
  peakRatePerHour: Joi.number().positive().optional(),
  weekendRatePerHour: Joi.number().positive().optional(),
  dateStr: Joi.string().trim().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null).optional(),
  effectiveFrom: Joi.string().trim().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null).optional(),
  effectiveTo: Joi.string().trim().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null).optional(),
  daysOfWeek: Joi.array().items(Joi.string().valid(...VALID_DAYS)).default(['ALL']).optional(),
  timeSlots: Joi.array().items(Joi.string().trim()).default(['ALL']).optional(),
  isPeak: Joi.boolean().default(false).optional(),
  status: Joi.string().valid('active', 'inactive').default('active').optional(),
  priority: Joi.number().integer().min(0).max(100).default(10).optional()
}).custom(rateDateValidator).unknown(true);

export const updateRateRuleSchema = Joi.object({
  sportId: Joi.string().trim().min(2).max(50).optional(),
  ratePerHour: Joi.number().positive().optional().messages({
    'number.positive': 'Rate per hour must be a positive finite amount.'
  }),
  peakRatePerHour: Joi.number().positive().optional(),
  weekendRatePerHour: Joi.number().positive().optional(),
  dateStr: Joi.string().trim().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null).optional(),
  effectiveFrom: Joi.string().trim().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null).optional(),
  effectiveTo: Joi.string().trim().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null).optional(),
  daysOfWeek: Joi.array().items(Joi.string().valid(...VALID_DAYS)).optional(),
  timeSlots: Joi.array().items(Joi.string().trim()).optional(),
  isPeak: Joi.boolean().optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  priority: Joi.number().integer().min(0).max(100).optional()
}).custom(rateDateValidator).unknown(true);

export const validateCreateRateRule = (req, res, next) => {
  const { error } = createRateRuleSchema.validate(req.body, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};

export const validateUpdateRateRule = (req, res, next) => {
  const { error } = updateRateRuleSchema.validate(req.body, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};

export const createRateValidationRules = [validateCreateRateRule];
export const updateRateValidationRules = [validateUpdateRateRule];
