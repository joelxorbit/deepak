import { getIdempotencyKeysCollection } from '../config/firestoreCollections.js';
import { logger } from '../utils/logger.js';

/**
 * Express middleware for transparent HTTP idempotency handling.
 */
export const handleIdempotency = async (req, res, next) => {
  const idempotencyKey = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];

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

    // Intercept res.json to cache successful response
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

/**
 * Programmatic helper to fetch an idempotency record.
 * @param {string} key
 * @returns {Promise<object|null>}
 */
export const getIdempotencyRecord = async (key) => {
  if (!key || typeof key !== 'string') return null;
  try {
    const doc = await getIdempotencyKeysCollection().doc(key.trim()).get();
    return doc.exists ? doc.data() : null;
  } catch (err) {
    logger.warn(`[Idempotency Helper Warning] ${err.message}`);
    return null;
  }
};

/**
 * Programmatic helper to store an idempotency record.
 * @param {string} key
 * @param {number} statusCode
 * @param {object} payload
 * @param {number} [ttlMs=86400000]
 */
export const saveIdempotencyRecord = async (key, statusCode, payload, ttlMs = 24 * 60 * 60 * 1000) => {
  if (!key || typeof key !== 'string') return;
  try {
    await getIdempotencyKeysCollection().doc(key.trim()).set({
      key: key.trim(),
      statusCode,
      responsePayload: payload,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlMs).toISOString()
    });
  } catch (err) {
    logger.warn(`[Idempotency Helper Warning] Failed to save record: ${err.message}`);
  }
};
