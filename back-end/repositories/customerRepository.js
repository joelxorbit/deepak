import { getCustomersCollection } from '../config/firestoreCollections.js';
import { generateSearchTokens, normalizePhone } from '../utils/slotNormalizer.js';

export const findCustomerByUsername = async (username) => {
  if (!username) return null;
  const raw = username.trim().toLowerCase();
  
  const snap = await getCustomersCollection()
    .where('username', '==', raw)
    .limit(1)
    .get();
    
  if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

  return null;
};

export const findCustomerById = async (id) => {
  if (!id) return null;
  const doc = await getCustomersCollection().doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

export const findCustomerByEmail = async (email) => {
  if (!email) return null;
  const raw = email.trim().toLowerCase();

  const snap = await getCustomersCollection()
    .where('email', '==', raw)
    .limit(1)
    .get();

  if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

  return null;
};

export const createCustomerRecord = async (customerData) => {
  const now = new Date().toISOString();
  const username = customerData.username.trim().toLowerCase();
  const searchTokens = generateSearchTokens(customerData.name, username);

  const payload = {
    name: customerData.name,
    username,
    phone: customerData.phone || null,
    email: customerData.email ? customerData.email.trim().toLowerCase() : null,
    googleId: customerData.googleId || null,
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
  
  if (updateData.name || updateData.username || updateData.phone) {
    const currentDoc = await docRef.get();
    const currentData = currentDoc.data() || {};
    const name = updateData.name || currentData.name;
    const username = updateData.username ? updateData.username.trim().toLowerCase() : currentData.username;
    updateData.searchTokens = generateSearchTokens(name, username);
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
