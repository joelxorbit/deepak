import { getEnquiriesCollection } from '../config/firestoreCollections.js';
import { ENQUIRY_STATUS } from '../utils/constants.js';

export const createEnquiryDoc = async ({
  name,
  phone,
  email = '',
  subject = 'General Inquiry',
  message,
  eventId = null,
  eventTitle = null,
  preferredDate = null,
  participantCount = null,
  contactPreference = 'any',
  customerId = null,
  notes = null
}) => {
  const now = new Date().toISOString();
  const payload = {
    name: name.trim(),
    phone: phone.trim(),
    email: email ? email.trim() : '',
    subject: subject ? subject.trim() : (eventTitle ? `Enquiry for ${eventTitle}` : 'General Inquiry'),
    message: message.trim(),
    eventId: eventId || null,
    eventTitle: eventTitle || null,
    preferredDate: preferredDate || null,
    participantCount: participantCount ? Number(participantCount) : null,
    contactPreference: contactPreference || 'any',
    customerId: customerId || null,
    notes: notes || null,
    status: ENQUIRY_STATUS.NEW,
    createdAt: now,
    updatedAt: now
  };

  const docRef = await getEnquiriesCollection().add(payload);
  const doc = await docRef.get();
  return { id: doc.id, _id: doc.id, ...doc.data() };
};

export const findEnquiryByIdDoc = async (id) => {
  if (!id) return null;
  const doc = await getEnquiriesCollection().doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, _id: doc.id, ...doc.data() };
};

export const getEnquiriesWithFilters = async ({ status, search, eventId, limit = 50 }) => {
  const snapshot = await getEnquiriesCollection().get();
  let docs = snapshot.docs.map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() }));

  if (status && status !== 'All') {
    // Check canonical status or legacy alias match
    docs = docs.filter(e => {
      if (e.status === status) return true;
      if (status === 'New' && (e.status === 'Unread' || e.status === 'New')) return true;
      if (status === 'Unread' && (e.status === 'Unread' || e.status === 'New')) return true;
      if (status === 'Contacted' && (e.status === 'Read' || e.status === 'Contacted')) return true;
      if (status === 'Read' && (e.status === 'Read' || e.status === 'Contacted')) return true;
      return false;
    });
  }

  if (eventId) {
    docs = docs.filter(e => e.eventId === eventId);
  }

  if (search) {
    const s = search.toLowerCase().trim();
    docs = docs.filter(e => 
      e.name?.toLowerCase().includes(s) ||
      e.phone?.includes(s) ||
      e.email?.toLowerCase().includes(s) ||
      e.message?.toLowerCase().includes(s) ||
      e.eventTitle?.toLowerCase().includes(s) ||
      e.subject?.toLowerCase().includes(s)
    );
  }

  // Sort newest first
  docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return docs.slice(0, Math.min(limit, 100));
};

export const getCustomerEnquiriesDoc = async ({ customerId, phone, email, limit = 50 }) => {
  const snapshot = await getEnquiriesCollection().get();
  let docs = snapshot.docs.map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() }));

  const normEmail = email ? email.toLowerCase().trim() : null;
  const normPhone = phone ? phone.trim() : null;

  docs = docs.filter(e => {
    const matchId = customerId && e.customerId === customerId;
    const matchPhone = normPhone && e.phone === normPhone;
    const matchEmail = normEmail && e.email && e.email.toLowerCase() === normEmail;
    return Boolean(matchId || matchPhone || matchEmail);
  });

  // Sort newest first
  docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return docs.slice(0, Math.min(limit, 100));
};

export const updateEnquiryStatusDoc = async (id, status, notes = null) => {
  const docRef = getEnquiriesCollection().doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const now = new Date().toISOString();
  const updatePayload = {
    status,
    updatedAt: now
  };
  if (notes !== null && notes !== undefined) {
    updatePayload.notes = notes;
  }

  await docRef.update(updatePayload);

  const updated = await docRef.get();
  return { id: updated.id, _id: updated.id, ...updated.data() };
};

export const deleteEnquiryDoc = async (id) => {
  const docRef = getEnquiriesCollection().doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  await docRef.delete();
  return { id, _id: id };
};

export const getEnquiriesCountStats = async () => {
  const snapshot = await getEnquiriesCollection().get();
  const all = snapshot.docs.map(d => d.data());
  const totalEnquiriesCount = all.length;
  const unreadEnquiriesCount = all.filter(e => e.status === ENQUIRY_STATUS.NEW || e.status === ENQUIRY_STATUS.UNREAD).length;
  return { totalEnquiriesCount, unreadEnquiriesCount };
};
