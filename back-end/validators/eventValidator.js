import Joi from 'joi';



export const createEventSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).required().messages({
    'string.empty': 'Event title is required.',
    'string.min': 'Title must be at least 3 characters long.',
    'any.required': 'Event title is required.'
  }),
  description: Joi.string().trim().min(5).max(5000).required().messages({
    'string.empty': 'Description is required.',
    'string.min': 'Description must be at least 5 characters long.',
    'any.required': 'Description is required.'
  }),
  category: Joi.string().trim().max(50).default('Tournament'),
  date: Joi.string().trim().required().messages({
    'string.empty': 'Event date is required.',
    'any.required': 'Event date is required.'
  }),
  startTime: Joi.string().trim().max(30).allow('', null).optional(),
  endTime: Joi.string().trim().max(30).allow('', null).optional(),
  venue: Joi.string().trim().max(100).default('Main Arena (FIFA-Grade Turf)').optional(),
  image: Joi.string().trim().default('https://images.unsplash.com/photo-1574629810360-7efbbe195018').optional(),
  gallery: Joi.array().items(Joi.string().trim()).default([]).optional(),
  currentParticipants: Joi.number().integer().min(0).default(0).optional(),
  contactPhone: Joi.string().trim().allow('', null).optional(),
  contactEmail: Joi.string().trim().email().allow('', null).optional(),
  rules: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(5000)).optional(),
    Joi.string().trim().max(5000).allow('', null).optional()
  ),
  status: Joi.string().valid('Upcoming', 'Published', 'Draft', 'Completed', 'Archived').optional(),
  isPublished: Joi.boolean().optional()
}).unknown(true);

export const updateEventSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).optional(),
  description: Joi.string().trim().min(5).max(5000).optional(),
  category: Joi.string().trim().max(50).optional(),
  date: Joi.string().trim().optional(),
  startTime: Joi.string().trim().max(30).allow('', null).optional(),
  endTime: Joi.string().trim().max(30).allow('', null).optional(),
  venue: Joi.string().trim().max(100).optional(),
  image: Joi.string().trim().optional(),
  gallery: Joi.array().items(Joi.string().trim()).optional(),
  currentParticipants: Joi.number().integer().min(0).optional(),
  contactPhone: Joi.string().trim().allow('', null).optional(),
  contactEmail: Joi.string().trim().email().allow('', null).optional(),
  rules: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(5000)).optional(),
    Joi.string().trim().max(5000).allow('', null).optional()
  ),
  status: Joi.string().valid('Upcoming', 'Published', 'Draft', 'Completed', 'Archived').optional(),
  isPublished: Joi.boolean().optional(),
  isArchived: Joi.boolean().optional()
}).unknown(true);

export const uploadBannerSchema = Joi.object({
  imageBase64: Joi.string().required().messages({
    'any.required': 'Image data (imageBase64) is required.'
  }),
  mimeType: Joi.string().valid('image/jpeg', 'image/png', 'image/webp', 'image/gif').required().messages({
    'any.only': 'Invalid image MIME type. Supported formats: JPEG, PNG, WebP, GIF.',
    'any.required': 'Image MIME type is required.'
  }),
  fileName: Joi.string().trim().max(100).optional()
}).unknown(true);

export const validateCreateEvent = (req, res, next) => {
  const { error } = createEventSchema.validate(req.body, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};

export const validateUpdateEvent = (req, res, next) => {
  const { error } = updateEventSchema.validate(req.body, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};

export const validateUploadBanner = (req, res, next) => {
  const { error } = uploadBannerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    req.validationErrors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
  }
  next();
};

export const eventValidationRules = [validateCreateEvent];
export const updateEventValidationRules = [validateUpdateEvent];
export const uploadBannerValidationRules = [validateUploadBanner];
