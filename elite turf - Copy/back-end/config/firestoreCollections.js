import { getDb } from './firebase.js';
import { FIRESTORE_COLLECTIONS } from '../utils/constants.js';

export const getAdminsCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.ADMINS);
export const getBookingsCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.BOOKINGS);
export const getCustomersCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.CUSTOMERS);
export const getEventsCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.EVENTS);
export const getCountersCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.COUNTERS);
export const getAuditLogsCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.AUDIT_LOGS);
export const getIdempotencyKeysCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.IDEMPOTENCY_KEYS);
export const getEnquiriesCollection = () => getDb().collection(FIRESTORE_COLLECTIONS.ENQUIRIES);
