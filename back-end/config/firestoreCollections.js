import { getDb } from './firebase.js';
import { FIRESTORE_COLLECTIONS } from '../utils/constants.js';

// Phase 0 & Phase 1 Active Production Collections
export const getAdminsCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.ADMINS);
export const getBookingsCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.BOOKINGS);
export const getCustomersCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.CUSTOMERS);
export const getEventsCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.EVENTS);
export const getCountersCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.COUNTERS);
export const getAuditLogsCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.AUDIT_LOGS);
export const getIdempotencyKeysCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.IDEMPOTENCY_KEYS);
export const getEnquiriesCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.ENQUIRIES);

// Reserved Collection Getters (For future phases 2-9)
export const getSettingsCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.SETTINGS);
export const getRatesCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.RATES);
export const getSlotHoldsCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.SLOT_HOLDS);
export const getBlockedSlotsCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.BLOCKED_SLOTS);
export const getNotificationsCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS);
export const getMessageDeliveriesCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.MESSAGE_DELIVERIES);
