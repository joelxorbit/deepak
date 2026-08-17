import { sendError } from '../utils/response.js';

export const validateRequest = (req, res, next) => {
  if (req.validationErrors && req.validationErrors.length > 0) {
    const formattedErrors = req.validationErrors.map(err => ({
      field: err.field || err.path || err.param,
      message: err.message || err.msg
    }));

    return sendError(
      res,
      formattedErrors[0]?.message || 'Validation Error',
      formattedErrors,
      400
    );
  }
  next();
};
