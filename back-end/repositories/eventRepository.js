import { getEventsCollection } from '../config/firestoreCollections.js';

export const findEventById = async (id) => {
  if (!id) return null;
  const doc = await getEventsCollection().doc(id).get();
  if (!doc.exists || doc.data().isDeleted) return null;
  return { id: doc.id, _id: doc.id, ...doc.data() };
};

/**
 * Returns public events:
 * - Published upcoming events (isPublished === true || status === 'Published')
 * - Completed showcase events (status === 'Completed')
 * Strictly filters out drafts, unpublished, archived, and deleted events.
 */
export const getPublicEventsDoc = async () => {
  const snapshot = await getEventsCollection().get();

  const docs = snapshot.docs
    .map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() }))
    .filter(event => {
      if (event.isDeleted) return false;
      if (event.isArchived || event.status === 'Archived') return false;

      // Completed events are always public showcase items
      if (event.status === 'Completed') return true;

      // Upcoming / Published events must have isPublished === true or status === 'Published'
      return Boolean(event.isPublished === true || event.status === 'Published');
    });

  return docs.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
};

export const getCompletedEvents = async () => {
  const snapshot = await getEventsCollection()
    .where('status', '==', 'Completed')
    .get();

  const docs = snapshot.docs
    .map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() }))
    .filter(item => !item.isDeleted && !item.isArchived);

  return docs.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
};

export const getAdminEventsDoc = async ({ status, search, limit = 50 } = {}) => {
  const snapshot = await getEventsCollection().get();
  let docs = snapshot.docs
    .map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() }))
    .filter(event => !event.isDeleted);

  if (status && status !== 'All') {
    docs = docs.filter(e => {
      if (status === 'Upcoming') return e.status === 'Upcoming' || (e.isPublished && e.status !== 'Completed' && e.status !== 'Archived');
      if (status === 'Draft') return e.status === 'Draft' || (!e.isPublished && e.status !== 'Completed' && e.status !== 'Archived');
      if (status === 'Published') return e.isPublished || e.status === 'Published';
      if (status === 'Completed') return e.status === 'Completed';
      if (status === 'Archived') return e.isArchived || e.status === 'Archived';
      return e.status === status;
    });
  }

  if (search) {
    const s = search.toLowerCase().trim();
    docs = docs.filter(e =>
      e.title?.toLowerCase().includes(s) ||
      e.description?.toLowerCase().includes(s) ||
      e.category?.toLowerCase().includes(s) ||
      e.venue?.toLowerCase().includes(s)
    );
  }

  docs.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  return docs.slice(0, Math.min(limit, 100));
};

export const createEvent = async (eventData, adminUser = null) => {
  const now = new Date().toISOString();
  const adminId = adminUser?.id || adminUser?._id || adminUser?.adminId || adminUser?.username || 'admin';

  const isCompleted = eventData.status === 'Completed' || eventData.category === 'COMPLETED';
  const isPublished = eventData.isPublished !== undefined
    ? Boolean(eventData.isPublished)
    : (isCompleted || eventData.status === 'Published');

  const resolvedStatus = eventData.status || (isCompleted ? 'Completed' : (isPublished ? 'Upcoming' : 'Draft'));

  const payload = {
    title: eventData.title.trim(),
    description: eventData.description.trim(),
    category: eventData.category || (isCompleted ? 'COMPLETED' : 'Tournament'),
    date: eventData.date,
    startTime: eventData.startTime || null,
    endTime: eventData.endTime || null,
    venue: eventData.venue || 'Main Arena (FIFA-Grade Turf)',
    image: eventData.image,
    gallery: Array.isArray(eventData.gallery) ? eventData.gallery : [],
    registrationStatus: eventData.registrationStatus || 'OPEN',
    registrationDeadline: eventData.registrationDeadline || null,
    maxParticipants: eventData.maxParticipants ? Number(eventData.maxParticipants) : null,
    currentParticipants: eventData.currentParticipants ? Number(eventData.currentParticipants) : 0,
    contactPhone: eventData.contactPhone || null,
    contactEmail: eventData.contactEmail || null,
    rules: eventData.rules || null,
    status: resolvedStatus,
    isPublished,
    isArchived: Boolean(eventData.isArchived || resolvedStatus === 'Archived'),
    isDeleted: false,
    createdBy: adminId,
    createdAt: now,
    updatedAt: now,
    publishedAt: isPublished ? now : null
  };

  const docRef = await getEventsCollection().add(payload);
  const doc = await docRef.get();
  return { id: doc.id, _id: doc.id, ...doc.data() };
};

export const updateEvent = async (id, updateData, adminUser = null) => {
  const docRef = getEventsCollection().doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().isDeleted) return null;

  const now = new Date().toISOString();
  const existing = doc.data();

  const payload = {
    ...updateData,
    updatedAt: now
  };

  if (updateData.title) payload.title = updateData.title.trim();
  if (updateData.description) payload.description = updateData.description.trim();
  if (updateData.maxParticipants !== undefined) {
    payload.maxParticipants = updateData.maxParticipants ? Number(updateData.maxParticipants) : null;
  }
  if (updateData.isPublished !== undefined) {
    payload.isPublished = Boolean(updateData.isPublished);
    if (payload.isPublished && !existing.publishedAt) {
      payload.publishedAt = now;
    }
  }

  await docRef.update(payload);
  const updatedDoc = await docRef.get();
  return { id: updatedDoc.id, _id: updatedDoc.id, ...updatedDoc.data() };
};

export const publishEventDoc = async (id, adminUser = null) => {
  const docRef = getEventsCollection().doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().isDeleted) return null;

  const now = new Date().toISOString();
  const adminId = adminUser?.id || adminUser?._id || adminUser?.username || 'admin';

  const updatePayload = {
    isPublished: true,
    status: doc.data().status === 'Completed' ? 'Completed' : 'Published',
    publishedAt: now,
    publishedBy: adminId,
    updatedAt: now
  };

  await docRef.update(updatePayload);
  const updatedDoc = await docRef.get();
  return { id: updatedDoc.id, _id: updatedDoc.id, ...updatedDoc.data() };
};

export const unpublishEventDoc = async (id, adminUser = null) => {
  const docRef = getEventsCollection().doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().isDeleted) return null;

  const now = new Date().toISOString();
  const updatePayload = {
    isPublished: false,
    status: 'Draft',
    updatedAt: now
  };

  await docRef.update(updatePayload);
  const updatedDoc = await docRef.get();
  return { id: updatedDoc.id, _id: updatedDoc.id, ...updatedDoc.data() };
};

export const archiveEventDoc = async (id, adminUser = null) => {
  const docRef = getEventsCollection().doc(id);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().isDeleted) return null;

  const now = new Date().toISOString();
  const adminId = adminUser?.id || adminUser?._id || adminUser?.username || 'admin';

  const updatePayload = {
    isArchived: true,
    isPublished: false,
    status: 'Archived',
    archivedAt: now,
    archivedBy: adminId,
    updatedAt: now
  };

  await docRef.update(updatePayload);
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
