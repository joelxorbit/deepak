import { getEventsCollection } from '../config/firestoreCollections.js';

export const getCompletedEvents = async () => {
  const snapshot = await getEventsCollection()
    .where('status', '==', 'Completed')
    .get();

  const docs = snapshot.docs
    .map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() }))
    .filter(item => !item.isDeleted);

  return docs.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
};

export const findEventById = async (id) => {
  const doc = await getEventsCollection().doc(id).get();
  if (!doc.exists || doc.data().isDeleted) return null;
  return { id: doc.id, _id: doc.id, ...doc.data() };
};

export const createEvent = async (eventData) => {
  const now = new Date().toISOString();
  const payload = {
    title: eventData.title,
    description: eventData.description,
    image: eventData.image,
    date: eventData.date,
    category: eventData.category || 'COMPLETED',
    status: 'Completed',
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  };

  const docRef = await getEventsCollection().add(payload);
  const doc = await docRef.get();
  return { id: doc.id, _id: doc.id, ...doc.data() };
};

export const updateEvent = async (id, updateData) => {
  const docRef = getEventsCollection().doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().isDeleted) return null;

  const now = new Date().toISOString();
  const payload = {
    ...updateData,
    status: 'Completed',
    updatedAt: now
  };

  await docRef.update(payload);
  const updatedDoc = await docRef.get();
  return { id: updatedDoc.id, _id: updatedDoc.id, ...updatedDoc.data() };
};

export const softDeleteEvent = async (id, adminId = null) => {
  const docRef = getEventsCollection().doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().isDeleted) return null;

  const now = new Date().toISOString();
  const updatePayload = {
    isDeleted: true,
    deletedAt: now,
    deletedBy: adminId || 'system'
  };

  await docRef.update(updatePayload);
  return { id, image: doc.data().image };
};
