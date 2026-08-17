import { getBookingsCollection } from '../config/firestoreCollections.js';
import { findCustomerById, findCustomerByPhone } from './customerRepository.js';
import { findAdminById } from './adminRepository.js';
import { BOOKING_STATUS } from '../utils/constants.js';
import { normalizePhone } from '../utils/slotNormalizer.js';

export const populateBookingRelations = async (bookingDoc) => {
  if (!bookingDoc) return null;
  const data = typeof bookingDoc.data === 'function' ? bookingDoc.data() : bookingDoc;
  const id = bookingDoc.id || data.id || data._id;

  let customer = null;
  if (data.customer) {
    if (typeof data.customer === 'object' && data.customer.name) {
      customer = data.customer;
    } else {
      customer = await findCustomerById(data.customer);
    }
  } else if (data.customerId) {
    customer = await findCustomerById(data.customerId);
  }

  let approvedBy = null;
  if (data.approvedBy) {
    if (typeof data.approvedBy === 'object' && data.approvedBy.username) {
      approvedBy = data.approvedBy;
    } else {
      const adminObj = await findAdminById(data.approvedBy);
      if (adminObj) {
        approvedBy = { _id: adminObj.id, id: adminObj.id, username: adminObj.username };
      }
    }
  }

  return {
    ...data,
    id,
    _id: id,
    customer: customer ? { _id: customer.id || customer._id, id: customer.id || customer._id, name: customer.name, phone: customer.phone } : null,
    approvedBy
  };
};

export const findBookingById = async (id) => {
  const doc = await getBookingsCollection().doc(id).get();
  if (doc.exists) {
    return await populateBookingRelations(doc);
  }

  const querySnap = await getBookingsCollection()
    .where('bookingId', '==', id.trim().toUpperCase())
    .limit(1)
    .get();

  if (!querySnap.empty) {
    return await populateBookingRelations(querySnap.docs[0]);
  }

  return null;
};

export const getBookingsForDate = async (dateStr) => {
  const snapshot = await getBookingsCollection()
    .where('dateStr', '==', dateStr)
    .get();

  const activeDocs = snapshot.docs.filter(doc => {
    const st = doc.data().status;
    return st !== BOOKING_STATUS.CANCELLED && st !== BOOKING_STATUS.REJECTED && !doc.data().isDeleted;
  });

  return activeDocs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const findBookingsByQuery = async (queryStr) => {
  if (!queryStr || typeof queryStr !== 'string') return [];
  
  const trimmed = queryStr.trim();
  const upper = trimmed.toUpperCase();
  const normalizedPhone = normalizePhone(trimmed);

  const matchedDocsMap = new Map();

  // Step 1: Direct Booking ID search (e.g. BK-20260814-0001)
  if (upper.includes('BK-') || upper.startsWith('BK')) {
    const bookingIdSnap = await getBookingsCollection()
      .where('bookingId', '==', upper)
      .get();
    bookingIdSnap.docs.forEach(doc => matchedDocsMap.set(doc.id, doc));
  }

  // Step 2: Direct Customer Phone match (e.g. 9876543210)
  if (normalizedPhone && normalizedPhone.length >= 7) {
    const phoneSnap = await getBookingsCollection()
      .where('customerPhone', '==', normalizedPhone)
      .get();
    phoneSnap.docs.forEach(doc => matchedDocsMap.set(doc.id, doc));

    // Also check un-normalized phone formats in bookings collection
    if (trimmed !== normalizedPhone) {
      const rawPhoneSnap = await getBookingsCollection()
        .where('customerPhone', '==', trimmed)
        .get();
      rawPhoneSnap.docs.forEach(doc => matchedDocsMap.set(doc.id, doc));
    }

    // Step 3: Customer profile lookup
    const customer = await findCustomerByPhone(normalizedPhone);
    if (customer) {
      const customerBookingSnap = await getBookingsCollection()
        .where('customerId', '==', customer.id)
        .get();
      customerBookingSnap.docs.forEach(doc => matchedDocsMap.set(doc.id, doc));
    }
  }

  // Step 4: If still no match, fallback to Booking ID or Search Tokens search
  if (matchedDocsMap.size === 0) {
    const bookingIdSnap = await getBookingsCollection()
      .where('bookingId', '==', upper)
      .get();
    bookingIdSnap.docs.forEach(doc => matchedDocsMap.set(doc.id, doc));

    const searchToken = trimmed.toLowerCase();
    const tokenSnap = await getBookingsCollection()
      .where('searchTokens', 'array-contains', searchToken)
      .get();
    tokenSnap.docs.forEach(doc => matchedDocsMap.set(doc.id, doc));
  }

  const validDocs = Array.from(matchedDocsMap.values()).filter(doc => !doc.data().isDeleted);
  const results = await Promise.all(validDocs.map(doc => populateBookingRelations(doc)));
  
  // Sort newest bookings first
  return results.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
};

export const getBookingsWithFilters = async ({ status, search, limit = 50, cursor = null }) => {
  let query = getBookingsCollection().where('isDeleted', '!=', true);

  if (status && status !== 'All') {
    query = getBookingsCollection()
      .where('status', '==', status)
      .where('isDeleted', '!=', true);
  }

  if (search) {
    const searchToken = search.toLowerCase().trim();
    query = getBookingsCollection()
      .where('searchTokens', 'array-contains', searchToken);
  }

  const snapshot = await query.get();
  const docs = snapshot.docs.filter(doc => !doc.data().isDeleted);

  const populated = await Promise.all(docs.map(doc => populateBookingRelations(doc)));
  populated.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

  return populated;
};
