export const errorMiddleware = (err, req, res, next) => {
  console.error('[Global Error Handler]', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  const payload = {
    success: false,
    message
  };
  if (err.errors) payload.errors = err.errors;
  if (err.requiresPhone) payload.requiresPhone = err.requiresPhone;

  return res.status(statusCode).json(payload);
};
