import { getNotificationsCollection } from '../config/firestoreCollections.js';
import { NOTIFICATION_RECIPIENT_TYPE } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Creates an in-app notification document with idempotency deduplication.
 */
export const createNotificationDoc = async ({
  recipientType = NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
  recipientId = null,
  recipientPhone = null,
  recipientEmail = null,
  type,
  title,
  message,
  bookingId = null,
  enquiryId = null,
  eventId = null,
  metadata = {},
  idempotencyKey = null
}) => {
  const collection = getNotificationsCollection();

  // 1. Idempotency Check: if key provided, check for existing notification
  if (idempotencyKey) {
    const existingSnap = await collection.where('idempotencyKey', '==', idempotencyKey).get();
    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      logger.info(`[NotificationRepository] Idempotent notification hit for key: ${idempotencyKey}`);
      return { id: existingDoc.id, _id: existingDoc.id, ...existingDoc.data() };
    }
  }

  const now = new Date().toISOString();
  const docRef = collection.doc();

  const payload = {
    id: docRef.id,
    _id: docRef.id,
    recipientType,
    recipientId: recipientId || (recipientType === NOTIFICATION_RECIPIENT_TYPE.ADMIN ? 'admin' : null),
    recipientPhone: recipientPhone || null,
    recipientEmail: recipientEmail ? recipientEmail.toLowerCase().trim() : null,
    type,
    title,
    message,
    bookingId: bookingId || null,
    enquiryId: enquiryId || null,
    eventId: eventId || null,
    metadata: metadata || {},
    idempotencyKey: idempotencyKey || null,
    isRead: false,
    readAt: null,
    createdAt: now,
    updatedAt: now
  };

  await docRef.set(payload);
  logger.info(`[NotificationRepository] Created notification ${docRef.id} for ${recipientType} (${payload.recipientId || payload.recipientPhone || 'admin'}) - Type: ${type}`);
  return payload;
};

const normalizePhoneStr = (p) => {
  if (!p) return null;
  const cleaned = String(p).replace(/\D/g, '');
  return cleaned.length > 10 ? cleaned.slice(-10) : cleaned;
};

/**
 * Matches notifications for an authenticated recipient (customer or admin).
 */
const matchesRecipient = (n, { recipientType, recipientId, recipientPhone, recipientEmail }) => {
  if (n.recipientType !== recipientType) return false;

  if (recipientType === NOTIFICATION_RECIPIENT_TYPE.ADMIN) {
    return true; // All admin notifications belong to the admin dashboard
  }

  // For customer recipients: must match by customerId, phone, or email
  const matchId = Boolean(recipientId && n.recipientId && (n.recipientId === recipientId));

  const reqPhoneNorm = normalizePhoneStr(recipientPhone);
  const notifPhoneNorm = normalizePhoneStr(n.recipientPhone);
  const matchPhone = Boolean(
    (recipientPhone && n.recipientPhone && recipientPhone === n.recipientPhone) ||
    (reqPhoneNorm && notifPhoneNorm && reqPhoneNorm === notifPhoneNorm)
  );

  const matchEmail = Boolean(
    recipientEmail && n.recipientEmail &&
    (n.recipientEmail.toLowerCase().trim() === recipientEmail.toLowerCase().trim())
  );

  return Boolean(matchId || matchPhone || matchEmail);
};

/**
 * Retrieves notifications for an authenticated recipient.
 */
export const getNotificationsForRecipientDoc = async ({
  recipientType,
  recipientId = null,
  recipientPhone = null,
  recipientEmail = null,
  isRead = null,
  limit = 50
}) => {
  const collection = getNotificationsCollection();
  const snapshot = await collection.get();

  let docs = snapshot.docs.map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() }));

  // Filter by recipient
  docs = docs.filter(n => matchesRecipient(n, { recipientType, recipientId, recipientPhone, recipientEmail }));

  // Filter by read status if requested
  if (typeof isRead === 'boolean') {
    docs = docs.filter(n => n.isRead === isRead);
  }

  // Sort newest first
  docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Apply bounded limit
  return docs.slice(0, Math.min(limit, 100));
};

/**
 * Gets count of unread notifications for a recipient.
 */
export const getUnreadNotificationCountDoc = async ({
  recipientType,
  recipientId = null,
  recipientPhone = null,
  recipientEmail = null
}) => {
  const collection = getNotificationsCollection();
  const snapshot = await collection.get();

  const docs = snapshot.docs.map(doc => doc.data());
  const unread = docs.filter(n => 
    matchesRecipient(n, { recipientType, recipientId, recipientPhone, recipientEmail }) && !n.isRead
  );

  return unread.length;
};

/**
 * Finds a single notification by ID.
 */
export const findNotificationByIdDoc = async (id) => {
  if (!id) return null;
  const doc = await getNotificationsCollection().doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, _id: doc.id, ...doc.data() };
};

/**
 * Marks a single notification as read.
 */
export const markNotificationAsReadDoc = async (id) => {
  const docRef = getNotificationsCollection().doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const now = new Date().toISOString();
  await docRef.update({
    isRead: true,
    readAt: now,
    updatedAt: now
  });

  const updated = await docRef.get();
  return { id: updated.id, _id: updated.id, ...updated.data() };
};

/**
 * Marks all unread notifications for a recipient as read.
 */
export const markAllNotificationsAsReadDoc = async ({
  recipientType,
  recipientId = null,
  recipientPhone = null,
  recipientEmail = null
}) => {
  const collection = getNotificationsCollection();
  const snapshot = await collection.get();

  const now = new Date().toISOString();
  let updatedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (matchesRecipient(data, { recipientType, recipientId, recipientPhone, recipientEmail }) && !data.isRead) {
      await doc.ref.update({
        isRead: true,
        readAt: now,
        updatedAt: now
      });
      updatedCount++;
    }
  }

  logger.info(`[NotificationRepository] Marked ${updatedCount} notifications as read for ${recipientType}`);
  return { updatedCount };
};
