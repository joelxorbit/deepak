import { getCouponsCollection } from '../config/firestoreCollections.js';
import { logger } from '../utils/logger.js';

/**
 * Retrieves all coupons.
 * @returns {Promise<Array>}
 */
export const getAllCouponsDoc = async () => {
  const collection = getCouponsCollection();
  const snapshot = await collection.get();
  return snapshot.docs.map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() }));
};

/**
 * Finds a coupon by coupon code (case-insensitive).
 * @param {string} code
 * @returns {Promise<object|null>}
 */
export const findCouponByCodeDoc = async (code) => {
  if (!code || typeof code !== 'string') return null;
  const cleanCode = code.trim().toUpperCase();

  const collection = getCouponsCollection();
  try {
    const snapshot = await collection.where('code', '==', cleanCode).get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, _id: doc.id, ...doc.data() };
    }
  } catch (err) {
    logger.warn(`[CouponRepository] Query by code error: ${err.message}`);
  }

  // Fallback in-memory search for case-insensitivity across any backend
  const all = await getAllCouponsDoc();
  return all.find(c => (c.code || '').trim().toUpperCase() === cleanCode) || null;
};

/**
 * Finds a coupon by document ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export const findCouponByIdDoc = async (id) => {
  if (!id) return null;
  const doc = await getCouponsCollection().doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, _id: doc.id, ...doc.data() };
};

/**
 * Creates a new coupon document.
 * @param {object} param0
 * @returns {Promise<object>}
 */
export const createCouponDoc = async ({
  code,
  discountAmount,
  validUntil,
  status = 'active',
  notes = ''
}) => {
  const collection = getCouponsCollection();
  const now = new Date().toISOString();
  const docRef = collection.doc();

  const cleanCode = String(code).trim().toUpperCase();
  const payload = {
    id: docRef.id,
    _id: docRef.id,
    code: cleanCode,
    name: cleanCode,
    discountAmount: Number(discountAmount),
    validUntil: String(validUntil).trim(),
    status: status === 'inactive' ? 'inactive' : 'active',
    notes: String(notes || '').trim(),
    createdAt: now,
    updatedAt: now
  };

  await docRef.set(payload);
  logger.info(`[CouponRepository] Created coupon ${cleanCode} (₹${discountAmount}) - ID: ${docRef.id}`);
  return payload;
};

/**
 * Updates an existing coupon document.
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<object|null>}
 */
export const updateCouponDoc = async (id, updates) => {
  const docRef = getCouponsCollection().doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const now = new Date().toISOString();
  const payload = {
    ...updates,
    updatedAt: now
  };

  if (payload.code) {
    payload.code = String(payload.code).trim().toUpperCase();
  }
  if (payload.discountAmount !== undefined) {
    payload.discountAmount = Number(payload.discountAmount);
  }

  await docRef.update(payload);
  const updatedDoc = await docRef.get();
  return { id: updatedDoc.id, _id: updatedDoc.id, ...updatedDoc.data() };
};

/**
 * Toggles coupon active/inactive status.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export const toggleCouponStatusDoc = async (id) => {
  const doc = await findCouponByIdDoc(id);
  if (!doc) return null;

  const newStatus = doc.status === 'active' ? 'inactive' : 'active';
  return await updateCouponDoc(id, { status: newStatus });
};

/**
 * Deletes a coupon document permanently.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export const deleteCouponDoc = async (id) => {
  const docRef = getCouponsCollection().doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;

  await docRef.delete();
  logger.info(`[CouponRepository] Deleted coupon ID: ${id}`);
  return true;
};
