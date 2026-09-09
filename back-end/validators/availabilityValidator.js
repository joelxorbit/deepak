import Joi from 'joi';

export const blockSlotSchema = Joi.object({
  dateStr: Joi.string().trim().optional(),
  date: Joi.string().trim().optional(),
  reason: Joi.string().trim().min(3).max(500).required().messages({
    'string.empty': 'A valid reason is required to block slots or days.',
    'string.min': 'Block reason must be at least 3 characters long.',
    'any.required': 'A valid reason is required to block slots or days.'
  }),
  isFullDay: Joi.boolean().optional(),
  slot: Joi.string().trim().allow(null, '').optional(),
  slots: Joi.array().items(Joi.string()).optional(),
  sportId: Joi.string().trim().optional(),
  blockType: Joi.string().trim().valid('maintenance', 'private_booking').optional(),
  paymentInfo: Joi.object({
    name: Joi.string().allow('', null).optional(),
    phone: Joi.string().allow('', null).optional(),
    amount: Joi.number().allow(null).optional(),
    note: Joi.string().allow('', null).optional()
  }).allow(null).optional()
}).or('dateStr', 'date').unknown(true);

export const validateBlockSlot = (req, res, next) => {
  const { error } = blockSlotSchema.validate(req.body, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};

export const blockSlotValidationRules = [validateBlockSlot];
