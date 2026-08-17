import { sendError } from '../utils/response.js';

export const notFoundMiddleware = (req, res, next) => {
  return sendError(res, `Resource Not Found - ${req.originalUrl}`, null, 404);
};
