import { getIdempotencyKeysCollection } from '../config/firestoreCollections.js';
import { logger } from '../utils/logger.js';

export const handleIdempotency = async (req, res, next) => {
  const idempotencyKey = req.headers['x-idempotency-key'];

  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return next();
  }

  try {
    const keyRef = getIdempotencyKeysCollection().doc(idempotencyKey.trim());
    const doc = await keyRef.get();

    if (doc.exists) {
      const data = doc.data();
      logger.info(`[Idempotency] Returning cached response for key: ${idempotencyKey}`);
      return res.status(data.statusCode || 200).json(data.responsePayload);
    }

    // Intercept res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        keyRef.set({
          key: idempotencyKey.trim(),
          statusCode: res.statusCode,
          responsePayload: body,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }).catch(err => {
          logger.error(`[Idempotency Error] Failed to cache idempotency key: ${err.message}`);
        });
      }
      return originalJson(body);
    };

    next();
  } catch (error) {
    logger.error(`[Idempotency Error] Middleware failure: ${error.message}`);
    next();
  }
};
