import { getDb } from '../config/firebase.js';
import {
  getSlotHoldsCollection,
  getBookingsCollection,
  getBlockedSlotsCollection
} from '../config/firestoreCollections.js';
import {
  BOOKING_STATUS,
  SLOT_HOLD_STATUS,
  DEFAULT_SLOT_HOLD_DURATION_MINUTES
} from '../utils/constants.js';
import { normalizeSlots } from '../utils/slotNormalizer.js';
import { logger } from '../utils/logger.js';

/**
 * Creates a temporary 10-minute slot hold for a user during checkout.
 * Validates against active bookings, active holds by other users, and blocked slots.
 *
 * @param {object} params
 * @param {string} params.dateStr - Date string (YYYY-MM-DD)
 * @param {string[]} params.slots - Array of slot strings
 * @param {string} [params.sportId='football-5v5'] - Sport ID
 * @param {string} params.holderId - Unique session or user ID
 * @param {number} [params.durationMinutes=10] - Hold duration in minutes
 * @returns {Promise<object>} Created hold document data
 */
export const createSlotHold = async ({
  dateStr,
  slots,
  sportId = 'football-5v5',
  holderId,
  durationMinutes = DEFAULT_SLOT_HOLD_DURATION_MINUTES
}) => {
  if (!dateStr || typeof dateStr !== 'string') {
    const error = new Error('Valid date string (YYYY-MM-DD) is required for slot hold.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedSlots = normalizeSlots(slots);
  if (!normalizedSlots || normalizedSlots.length === 0) {
    const error = new Error('At least one valid time slot is required to create a hold.');
    error.statusCode = 400;
    throw error;
  }

  if (!holderId || typeof holderId !== 'string') {
    const error = new Error('Unique holder identifier (holderId) is required.');
    error.statusCode = 400;
    throw error;
  }

  const cleanDateStr = new Date(dateStr).toISOString().split('T')[0];
  const now = new Date();
  const nowISO = now.toISOString();
  const expiresAtISO = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();

  const db = getDb();

  const holdResult = await db.runTransaction(async (transaction) => {
    // 1. Check against active bookings
    const bookingsSnap = await getBookingsCollection()
      .where('dateStr', '==', cleanDateStr)
      .get();

    const activeBookings = bookingsSnap.docs
      .map(doc => doc.data())
      .filter(b => b.status !== BOOKING_STATUS.CANCELLED && b.status !== BOOKING_STATUS.REJECTED && !b.isDeleted);

    const bookedSlots = activeBookings.flatMap(b => b.timeSlots || b.slots || []);
    const bookedConflict = normalizedSlots.find(s => bookedSlots.includes(s));
    if (bookedConflict) {
      const error = new Error(`Time slot "${bookedConflict}" is already booked. Please select an available slot.`);
      error.statusCode = 409;
      throw error;
    }

    // 2. Check against blocked slots
    const blockedSnap = await getBlockedSlotsCollection()
      .where('dateStr', '==', cleanDateStr)
      .get();

    const blockedDocs = blockedSnap.docs.map(d => d.data());
    const isFullDayBlocked = blockedDocs.some(b => b.isFullDay);
    if (isFullDayBlocked) {
      const error = new Error('The arena is closed / blocked for the entire selected date.');
      error.statusCode = 409;
      throw error;
    }

    const blockedSlots = blockedDocs.flatMap(b => (b.slot ? [b.slot] : (b.slots || [])));
    const blockedConflict = normalizedSlots.find(s => blockedSlots.includes(s));
    if (blockedConflict) {
      const error = new Error(`Time slot "${blockedConflict}" is unavailable due to arena maintenance/blocking.`);
      error.statusCode = 409;
      throw error;
    }

    // 3. Check against active holds by other users
    const holdsSnap = await getSlotHoldsCollection()
      .where('dateStr', '==', cleanDateStr)
      .get();

    const activeHolds = holdsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(h => (
        h.status === SLOT_HOLD_STATUS.ACTIVE &&
        h.expiresAt > nowISO &&
        h.holderId !== holderId
      ));

    const otherHeldSlots = activeHolds.flatMap(h => h.slots || (h.slot ? [h.slot] : []));
    const holdConflict = normalizedSlots.find(s => otherHeldSlots.includes(s));
    if (holdConflict) {
      const error = new Error(`Time slot "${holdConflict}" is temporarily held by another customer. Please select another slot or try again in a few minutes.`);
      error.statusCode = 409;
      throw error;
    }

    // 4. Release any existing holds by the SAME holder on this date to replace with new selection
    const ownExistingHolds = holdsSnap.docs
      .filter(doc => {
        const data = doc.data();
        return data.holderId === holderId && data.status === SLOT_HOLD_STATUS.ACTIVE;
      });

    for (const ownDoc of ownExistingHolds) {
      transaction.update(ownDoc.ref, {
        status: SLOT_HOLD_STATUS.RELEASED,
        releasedAt: nowISO
      });
    }

    // 5. Create new hold document
    const holdDocRef = getSlotHoldsCollection().doc();
    const holdPayload = {
      holdId: holdDocRef.id,
      dateStr: cleanDateStr,
      slots: normalizedSlots,
      sportId,
      holderId,
      status: SLOT_HOLD_STATUS.ACTIVE,
      durationMinutes,
      createdAt: nowISO,
      expiresAt: expiresAtISO
    };

    transaction.set(holdDocRef, holdPayload);
    return { id: holdDocRef.id, ...holdPayload };
  });

  logger.info(`[HoldService] Created hold ${holdResult.holdId} for slots [${normalizedSlots.join(', ')}] on ${cleanDateStr} by ${holderId}`);
  return holdResult;
};

/**
 * Releases a temporary slot hold.
 * Strictly verifies that the requesting holderId owns the hold before releasing.
 *
 * @param {object} params
 * @param {string} [params.holdId]
 * @param {string} params.holderId
 * @param {string} [params.dateStr]
 * @param {string[]} [params.slots]
 * @returns {Promise<{ success: boolean, released: boolean, message: string }>}
 */
export const releaseSlotHold = async ({
  holdId,
  holderId,
  dateStr,
  slots
}) => {
  if (!holderId) {
    const error = new Error('Holder ID is required to release a hold.');
    error.statusCode = 400;
    throw error;
  }

  const nowISO = new Date().toISOString();

  if (holdId) {
    const docRef = getSlotHoldsCollection().doc(holdId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return { success: true, released: false, message: 'Hold not found or already released.' };
    }

    const data = doc.data();
    if (data.holderId !== holderId) {
      const error = new Error('Unauthorized: You cannot release another user\'s slot hold.');
      error.statusCode = 403;
      throw error;
    }

    await docRef.update({
      status: SLOT_HOLD_STATUS.RELEASED,
      releasedAt: nowISO
    });

    logger.info(`[HoldService] Released hold ${holdId} by holder ${holderId}`);
    return { success: true, released: true, message: 'Slot hold released successfully.' };
  }

  if (dateStr) {
    const cleanDateStr = new Date(dateStr).toISOString().split('T')[0];
    const snap = await getSlotHoldsCollection()
      .where('dateStr', '==', cleanDateStr)
      .where('holderId', '==', holderId)
      .where('status', '==', SLOT_HOLD_STATUS.ACTIVE)
      .get();

    if (snap.empty) {
      return { success: true, released: false, message: 'No active holds found to release.' };
    }

    const batch = getDb().batch();
    snap.docs.forEach(d => {
      batch.update(d.ref, {
        status: SLOT_HOLD_STATUS.RELEASED,
        releasedAt: nowISO
      });
    });

    await batch.commit();
    logger.info(`[HoldService] Released ${snap.docs.length} holds on ${cleanDateStr} for holder ${holderId}`);
    return { success: true, released: true, message: 'Slot holds released successfully.' };
  }

  const error = new Error('Either holdId or dateStr must be provided.');
  error.statusCode = 400;
  throw error;
};

/**
 * Retrieves all currently active (non-expired, non-released) holds for a date.
 *
 * @param {string} dateStr
 * @param {string} [sportId]
 * @param {string} [excludeHolderId] - If provided, excludes holds belonging to this holderId
 * @returns {Promise<{ heldSlots: string[], holds: object[] }>}
 */
export const getActiveHoldsForDate = async (dateStr, sportId = null, excludeHolderId = null) => {
  if (!dateStr) return { heldSlots: [], holds: [] };

  const cleanDateStr = new Date(dateStr).toISOString().split('T')[0];
  const nowISO = new Date().toISOString();

  let query = getSlotHoldsCollection().where('dateStr', '==', cleanDateStr);
  const snap = await query.get();

  const activeHolds = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(h => (
      h.status === SLOT_HOLD_STATUS.ACTIVE &&
      h.expiresAt > nowISO &&
      (!sportId || !h.sportId || h.sportId === sportId) &&
      (!excludeHolderId || h.holderId !== excludeHolderId)
    ));

  const heldSlots = activeHolds.flatMap(h => h.slots || (h.slot ? [h.slot] : []));
  return { heldSlots, holds: activeHolds };
};
