import { getCountersCollection } from '../config/firestoreCollections.js';

/**
 * Generates an atomic, race-condition safe Booking ID: BK-YYYYMMDD-0001
 * Uses Firestore transaction with document counter update.
 */
export const generateAtomicBookingIdInTransaction = async (transaction, date) => {
  const d = date ? new Date(date) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const counterDocRef = getCountersCollection().doc(`booking_${dateStr}`);
  const counterDoc = await transaction.get(counterDocRef);

  let seq = 1;
  if (counterDoc.exists) {
    seq = (counterDoc.data().seq || 0) + 1;
    transaction.update(counterDocRef, { seq, updatedAt: new Date().toISOString() });
  } else {
    transaction.set(counterDocRef, { seq: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  const seqStr = String(seq).padStart(4, '0');
  return `BK-${dateStr}-${seqStr}`;
};

export const generateBookingId = (date = new Date(), sequenceNumber = 1) => {
  const d = date ? new Date(date) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const seqStr = String(sequenceNumber).padStart(4, '0');
  return `BK-${dateStr}-${seqStr}`;
};
