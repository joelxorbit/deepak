export const sendSuccess = (res, message, data = null, statusCode = 200) => {
  const payload = {
    success: true,
    message
  };
  if (data !== null) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
};

export const sendError = (res, message, errors = null, statusCode = 500) => {
  const payload = {
    success: false,
    message
  };
  if (errors !== null) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
};

export const sendPaginated = (res, message, data, pagination, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination
  });
};
