import { getEnquiriesCollection } from '../config/firestoreCollections.js';
import { ENQUIRY_STATUS } from '../utils/constants.js';

export const createEnquiryDoc = async ({ name, phone, email, subject, message }) => {
  const now = new Date().toISOString();
  const payload = {
    name: name.trim(),
    phone: phone.trim(),
    email: email ? email.trim() : '',
    subject: subject ? subject.trim() : 'General Inquiry',
    message: message.trim(),
    status: ENQUIRY_STATUS.UNREAD,
    createdAt: now,
    updatedAt: now
  };

  const docRef = await getEnquiriesCollection().add(payload);
  const doc = await docRef.get();
  return { id: doc.id, _id: doc.id, ...doc.data() };
};

export const getEnquiriesWithFilters = async ({ status, search, limit = 50, cursor = null }) => {
  const snapshot = await getEnquiriesCollection().get();
  let docs = snapshot.docs.map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() }));

  if (status && status !== 'All') {
    docs = docs.filter(e => e.status === status);
  }

  if (search) {
    const s = search.toLowerCase().trim();
    docs = docs.filter(e => 
      e.name?.toLowerCase().includes(s) ||
      e.phone?.includes(s) ||
      e.email?.toLowerCase().includes(s) ||
      e.message?.toLowerCase().includes(s)
    );
  }

  // Sort newest first
  docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return docs;
};

export const updateEnquiryStatusDoc = async (id, status) => {
  const docRef = getEnquiriesCollection().doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const now = new Date().toISOString();
  await docRef.update({
    status,
    updatedAt: now
  });

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
  const unreadEnquiriesCount = all.filter(e => e.status === ENQUIRY_STATUS.UNREAD).length;
  return { totalEnquiriesCount, unreadEnquiriesCount };
};
