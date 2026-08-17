import { logger } from './logger.js';

export const withFirestoreRetry = async (fn, maxRetries = 3, initialDelayMs = 200) => {
  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      const isTransient = error.code === 10 || // ABORTED
                          error.code === 14 || // UNAVAILABLE
                          error.code === 4  || // DEADLINE_EXCEEDED
                          error.message?.includes('Contention') ||
                          error.message?.includes('transaction');

      if (!isTransient || attempt >= maxRetries) {
        throw error;
      }

      const jitter = Math.random() * 100;
      const sleepTime = delay + jitter;
      logger.warn(`[Firestore Retry] Retryable error caught (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying in ${Math.round(sleepTime)}ms...`);
      await new Promise(resolve => setTimeout(resolve, sleepTime));
      delay *= 2;
    }
  }
};
