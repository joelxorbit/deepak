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

export const findBookingByPublicIdDoc = async (publicBookingId) => {
  if (!publicBookingId || typeof publicBookingId !== 'string') return null;
  const cleanId = publicBookingId.trim().toUpperCase();

  const querySnap = await getBookingsCollection()
    .where('bookingId', '==', cleanId)
    .limit(1)
    .get();

  if (!querySnap.empty) {
    return await populateBookingRelations(querySnap.docs[0]);
  }

  return null;
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

import { normalizeBookingDocument } from '../utils/bookingNormalizer.js';

export const getBookingsWithFilters = async ({ status = 'All', filter = null, search = '', limit = 50, cursor = null }) => {
  const activeFilter = filter || status || 'All';
  let snapshot = await getBookingsCollection().get();
  let docs = snapshot.docs.filter(doc => !doc.data().isDeleted);

  // Normalize each booking
  let populated = await Promise.all(docs.map(async (doc) => {
    const raw = { id: doc.id, _id: doc.id, ...doc.data() };
    const normalized = normalizeBookingDocument(raw);
    return await populateBookingRelations(normalized);
  }));

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Apply search
  if (search && search.trim() !== '') {
    const term = search.toLowerCase().trim();
    populated = populated.filter(b => {
      const bId = (b.bookingId || b.id || '').toLowerCase();
      const cName = (b.customerName || b.customer?.name || '').toLowerCase();
      const cPhone = (b.customerPhone || b.mobileNumber || b.customer?.phone || '');
      return bId.includes(term) || cName.includes(term) || cPhone.includes(term);
    });
  }

  // Apply Phase 5 filter criteria
  if (activeFilter && activeFilter !== 'All') {
    const lowerFilter = activeFilter.toLowerCase().replace(/[\s_-]/g, '');

    populated = populated.filter(b => {
      const bDateStr = b.dateStr || (b.date ? b.date.split('T')[0] : '');
      const isCancelled = b.status === BOOKING_STATUS.CANCELLED || b.cancellation?.isCancelled === true;

      switch (lowerFilter) {
        case 'unreviewed':
        case 'pendingreview':
          return !b.isReviewed && !isCancelled;
        case 'reviewed':
          return b.isReviewed === true;
        case 'today':
          return bDateStr === todayStr && !isCancelled;
        case 'upcoming':
          return bDateStr >= todayStr && !isCancelled;
        case 'cancelled':
          return isCancelled;
        case 'advancepaid':
          return b.paymentStatus === 'Advance Paid';
        case 'balancepending':
          return (b.balanceDue || 0) > 0 && !isCancelled;
        case 'fullypaid':
          return b.paymentStatus === 'Fully Paid' || b.paymentStatus === 'Cash Received' || b.paymentStatus === 'Paid';
        case 'cashpending':
        case 'payatspot':
          return b.paymentStatus === 'Cash Pending';
        case 'confirmed':
          return b.status === BOOKING_STATUS.CONFIRMED;
        case 'pending':
          return b.status === BOOKING_STATUS.PENDING;
        case 'rejected':
          return b.status === BOOKING_STATUS.REJECTED;
        default:
          return b.status === activeFilter || b.paymentStatus === activeFilter;
      }
    });
  }

  // Sort newest first
  populated.sort((a, b) => {
    const dateA = a.date || a.createdAt || '';
    const dateB = b.date || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  return populated;
};
