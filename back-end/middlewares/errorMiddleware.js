import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const isFirebaseDatabaseError = (err) => {
  if (!err) return false;
  const message = String(err.message || '');
  const code = err.code !== undefined ? String(err.code) : '';
  const details = String(err.details || '');
  
  return (
    message.includes('16 UNAUTHENTICATED') ||
    message.includes('8 RESOURCE_EXHAUSTED') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('Quota exceeded') ||
    message.includes('invalid authentication credentials') ||
    message.includes('Expected OAuth 2 access token') ||
    message.includes('PERMISSION_DENIED') ||
    message.includes('UNAVAILABLE') ||
    message.includes('DECODER routines') ||
    message.includes('Could not load the default credentials') ||
    message.includes('invalid_grant') ||
    message.includes('error:1E08010C') ||
    code === '16' ||
    code === '8' ||
    code === '7' ||
    code === '14' ||
    details.includes('16 UNAUTHENTICATED') ||
    details.includes('8 RESOURCE_EXHAUSTED') ||
    details.includes('Quota exceeded') ||
    details.includes('invalid authentication credentials') ||
    details.includes('Expected OAuth 2 access token') ||
    details.includes('UNAVAILABLE')
  );
};

export const errorMiddleware = (err, req, res, next) => {
  logger.error(`[Global Error Handler] ${err.name || 'Error'}: ${err.message}`, { stack: err.stack });

  const isQuotaError = 
    String(err.message || '').includes('RESOURCE_EXHAUSTED') || 
    String(err.message || '').includes('Quota exceeded') ||
    String(err.code || '') === '8';

  if (isQuotaError) {
    logger.error('[Global Error Handler] Firestore Daily Quota Exceeded (8 RESOURCE_EXHAUSTED). Upgrade Firebase project to Blaze plan.');
    return sendError(
      res,
      'Firebase database daily free-tier quota has been reached. Please upgrade your Firebase project to the Blaze (pay-as-you-go) plan or wait for the daily quota reset.',
      null,
      503
    );
  }

  if (isFirebaseDatabaseError(err)) {
    logger.error(`[Global Error Handler] Firestore/Firebase infrastructure failure: ${err.name || 'AuthenticationError'}`);
    return sendError(
      res,
      'Database service is temporarily unavailable. Please verify the server configuration or try again later.',
      null,
      503
    );
  }

  // Non-database errors
  const statusCode = err.statusCode || 500;
  const message = (statusCode === 500 && process.env.NODE_ENV === 'production')
    ? (err.isPublicMessage ? err.message : 'Internal Server Error')
    : (err.message || 'Internal Server Error');

  return sendError(res, message, err.errors || null, statusCode);
};

