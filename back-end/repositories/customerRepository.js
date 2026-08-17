import { getCustomersCollection } from '../config/firestoreCollections.js';
import { generateSearchTokens, normalizePhone } from '../utils/slotNormalizer.js';

export const findCustomerByPhone = async (phone) => {
  if (!phone) return null;
  const raw = phone.trim();
  const normalized = normalizePhone(raw);
  
  // Try exact normalized 10-digit match first
  if (normalized) {
    const snap1 = await getCustomersCollection()
      .where('phone', '==', normalized)
      .limit(1)
      .get();
    if (!snap1.empty) return { id: snap1.docs[0].id, ...snap1.docs[0].data() };
  }

  // Try raw string match
  const snap2 = await getCustomersCollection()
    .where('phone', '==', raw)
    .limit(1)
    .get();
  if (!snap2.empty) return { id: snap2.docs[0].id, ...snap2.docs[0].data() };

  // Try +91 formatted string match
  if (normalized) {
    const snap3 = await getCustomersCollection()
      .where('phone', '==', `+91 ${normalized}`)
      .limit(1)
      .get();
    if (!snap3.empty) return { id: snap3.docs[0].id, ...snap3.docs[0].data() };
  }

  return null;
};

export const findCustomerById = async (id) => {
  if (!id) return null;
  const doc = await getCustomersCollection().doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

export const createCustomerRecord = async (customerData) => {
  const now = new Date().toISOString();
  const normalizedPhone = normalizePhone(customerData.phone) || customerData.phone.trim();
  const searchTokens = generateSearchTokens(customerData.name, normalizedPhone);

  const payload = {
    name: customerData.name,
    phone: normalizedPhone,
    bookingHistory: customerData.bookingHistory || [],
    searchTokens,
    createdAt: now,
    updatedAt: now
  };

  const docRef = await getCustomersCollection().add(payload);
  const doc = await docRef.get();
  return { id: doc.id, ...doc.data() };
};

export const updateCustomerRecord = async (id, updateData) => {
  const docRef = getCustomersCollection().doc(id);
  const now = new Date().toISOString();
  
  if (updateData.name || updateData.phone) {
    const currentDoc = await docRef.get();
    const currentData = currentDoc.data() || {};
    const name = updateData.name || currentData.name;
    const phone = updateData.phone ? normalizePhone(updateData.phone) : currentData.phone;
    updateData.searchTokens = generateSearchTokens(name, phone);
  }

  updateData.updatedAt = now;
  await docRef.update(updateData);
  const updated = await docRef.get();
  return { id: updated.id, ...updated.data() };
};

export const getCustomersWithPagination = async ({ search, limit = 20, cursor = null }) => {
  let query = getCustomersCollection().orderBy('createdAt', 'desc');

  if (search) {
    const searchToken = search.toLowerCase().trim();
    query = getCustomersCollection()
      .where('searchTokens', 'array-contains', searchToken)
      .orderBy('createdAt', 'desc');
  }

  if (cursor) {
    const cursorDoc = await getCustomersCollection().doc(cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.limit(limit + 1).get();
  const docs = snapshot.docs;

  const hasMore = docs.length > limit;
  const resultDocs = hasMore ? docs.slice(0, limit) : docs;
  const nextCursor = resultDocs.length > 0 ? resultDocs[resultDocs.length - 1].id : null;

  const data = resultDocs.map(doc => ({
    id: doc.id,
    _id: doc.id,
    ...doc.data()
  }));

  return {
    data,
    pagination: {
      nextCursor,
      hasMore,
      pageSize: limit
    }
  };
};

export const getCustomersCount = async () => {
  const snapshot = await getCustomersCollection().get();
  return snapshot.size;
};
