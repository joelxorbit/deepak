import {
  getBookingsCollection,
  getBlockedSlotsCollection
} from '../config/firestoreCollections.js';
import {
  BOOKING_STATUS,
  TIME_SLOTS_ORDER,
  AUDIT_ACTIONS
} from '../utils/constants.js';
import { getActiveHoldsForDate } from './holdService.js';
import { logger } from '../utils/logger.js';
import { createAuditLog } from '../repositories/auditRepository.js';

/**
 * Calculates authoritative, real-time slot availability for a given date and sport.
 * Incorporates active bookings, temporary 10-minute holds, expired holds, and admin blocked slots.
 *
 * @param {object} params
 * @param {string} params.date - Date string (ISO or YYYY-MM-DD)
 * @param {string} [params.sportId='football-5v5'] - Sport ID
 * @param {string} [params.currentHolderId=null] - Current user's holder ID (excluded from held slots)
 * @returns {Promise<object>} Complete availability breakdown
 */
export const calculateAvailability = async ({
  date,
  sportId = 'football-5v5',
  currentHolderId = null
}) => {
  if (!date) {
    const error = new Error('Date parameter is required to calculate availability.');
    error.statusCode = 400;
    throw error;
  }

  const cleanDateStr = new Date(date).toISOString().split('T')[0];

  // 1. Fetch active bookings
  const bookingsSnap = await getBookingsCollection()
    .where('dateStr', '==', cleanDateStr)
    .get();

  const activeBookings = bookingsSnap.docs
    .map(doc => doc.data())
    .filter(b => b.status !== BOOKING_STATUS.CANCELLED && b.status !== BOOKING_STATUS.REJECTED && !b.isDeleted);

  const bookedSlots = Array.from(new Set(
    activeBookings.flatMap(b => b.timeSlots || b.slots || [])
  ));

  // 2. Fetch active temporary holds (excluding current holder's own holds)
  const { heldSlots } = await getActiveHoldsForDate(cleanDateStr, sportId, currentHolderId);

  // 3. Fetch admin blocked slots / closures
  const blockedSnap = await getBlockedSlotsCollection()
    .where('dateStr', '==', cleanDateStr)
    .get();

  const blockedDocs = blockedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const fullDayBlock = blockedDocs.find(b => b.isFullDay);
  const isFullDayBlocked = Boolean(fullDayBlock);
  const closureReason = fullDayBlock ? (fullDayBlock.reason || 'Arena Closed for Maintenance') : null;

  const blockedSlots = isFullDayBlocked
    ? [...TIME_SLOTS_ORDER]
    : Array.from(new Set(blockedDocs.flatMap(b => (b.slot ? [b.slot] : (b.slots || [])))));

  // 4. Calculate final available slots
  const unavailableSet = new Set([...bookedSlots, ...heldSlots, ...blockedSlots]);
  const availableSlots = isFullDayBlocked
    ? []
    : TIME_SLOTS_ORDER.filter(slot => !unavailableSet.has(slot));

  return {
    date: cleanDateStr,
    sportId,
    isFullDayBlocked,
    closureReason,
    bookedSlots,
    heldSlots,
    blockedSlots,
    availableSlots
  };
};

/**
 * Retrieves all blocked slot records (for Admin management).
 */
export const getBlockedSlotsService = async () => {
  const snap = await getBlockedSlotsCollection().get();
  return snap.docs.map(d => ({ id: d.id, _id: d.id, ...d.data() }));
};

/**
 * Creates an admin slot block or full-day closure.
 * Detects conflicts with active bookings and rejects with HTTP 409 Conflict if active bookings exist.
 */
export const blockSlotService = async ({
  dateStr,
  date,
  slot = null,
  slots = null,
  sportId = 'all',
  isFullDay = false,
  reason = 'Admin maintenance / private booking',
  blockedBy = 'admin'
}) => {
  const inputDate = dateStr || date;
  if (!inputDate) {
    const error = new Error('Date string is required to block slots.');
    error.statusCode = 400;
    throw error;
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    const error = new Error('A reason is required to block slots (minimum 3 characters).');
    error.statusCode = 400;
    throw error;
  }

  const cleanDateStr = new Date(inputDate).toISOString().split('T')[0];
  const targetSlots = isFullDay
    ? [...TIME_SLOTS_ORDER]
    : (slots && slots.length > 0 ? slots : (slot ? [slot] : []));

  if (!isFullDay && targetSlots.length === 0) {
    const error = new Error('At least one slot or isFullDay must be specified to create a block.');
    error.statusCode = 400;
    throw error;
  }

  // Conflict detection: verify no active bookings exist on target slots / date
  const bookingsSnap = await getBookingsCollection()
    .where('dateStr', '==', cleanDateStr)
    .get();

  const activeBookings = bookingsSnap.docs
    .map(doc => doc.data())
    .filter(b => b.status !== BOOKING_STATUS.CANCELLED && b.status !== BOOKING_STATUS.REJECTED && !b.isDeleted);

  const bookedSlotsMap = new Map();
  activeBookings.forEach(b => {
    const bSlots = b.timeSlots || b.slots || [];
    bSlots.forEach(s => bookedSlotsMap.set(s, b.bookingId || b.id));
  });

  const conflicts = [];
  if (isFullDay && activeBookings.length > 0) {
    activeBookings.forEach(b => {
      const bSlots = b.timeSlots || b.slots || [];
      conflicts.push({ bookingId: b.bookingId || b.id, slots: bSlots });
    });
  } else if (!isFullDay) {
    targetSlots.forEach(s => {
      if (bookedSlotsMap.has(s)) {
        conflicts.push({ slot: s, bookingId: bookedSlotsMap.get(s) });
      }
    });
  }

  if (conflicts.length > 0) {
    const error = new Error(
      isFullDay
        ? `Cannot block full day on ${cleanDateStr}: ${conflicts.length} active booking(s) exist on this date.`
        : `Cannot block slot(s) on ${cleanDateStr}: active booking(s) exist on requested slot(s).`
    );
    error.statusCode = 409;
    error.conflicts = conflicts;
    throw error;
  }

  const docRef = getBlockedSlotsCollection().doc();
  const adminName = typeof blockedBy === 'object' ? (blockedBy.username || blockedBy.name || blockedBy.id || 'admin') : (blockedBy || 'admin');

  const payload = {
    id: docRef.id,
    _id: docRef.id,
    dateStr: cleanDateStr,
    slot: !isFullDay && targetSlots.length === 1 ? targetSlots[0] : null,
    slots: !isFullDay ? targetSlots : [],
    sportId,
    isFullDay: Boolean(isFullDay),
    reason: reason.trim(),
    blockedBy: adminName,
    createdAt: new Date().toISOString()
  };

  await docRef.set(payload);
  logger.info(`[AvailabilityService] Created block on ${cleanDateStr} (FullDay: ${payload.isFullDay}) by ${adminName}`);

  createAuditLog({
    action: AUDIT_ACTIONS.SLOT_BLOCK,
    user: adminName,
    details: {
      blockId: payload.id,
      dateStr: cleanDateStr,
      slots: payload.slots,
      isFullDay: payload.isFullDay,
      reason: payload.reason
    }
  }).catch(err => logger.warn('Audit log write warning:', err));

  return payload;
};

/**
 * Removes an admin slot block and records audit log.
 */
export const unblockSlotService = async (blockId, adminUser = 'admin') => {
  if (!blockId) {
    const error = new Error('Block ID is required.');
    error.statusCode = 400;
    throw error;
  }

  const docRef = getBlockedSlotsCollection().doc(blockId);
  const doc = await docRef.get();
  if (!doc.exists) {
    const error = new Error('Blocked slot record not found.');
    error.statusCode = 404;
    throw error;
  }

  const blockData = doc.data();
  await docRef.delete();

  const user = typeof adminUser === 'object' ? (adminUser.username || adminUser.name || adminUser.id || 'admin') : (adminUser || 'admin');
  logger.info(`[AvailabilityService] Unblocked record ${blockId} by ${user}`);

  createAuditLog({
    action: AUDIT_ACTIONS.SLOT_UNBLOCK,
    user,
    details: {
      blockId,
      dateStr: blockData.dateStr,
      slots: blockData.slots || (blockData.slot ? [blockData.slot] : []),
      isFullDay: blockData.isFullDay,
      reason: blockData.reason
    }
  }).catch(err => logger.warn('Audit log write warning:', err));

  return { success: true, message: 'Slot unblocked successfully.' };
};

