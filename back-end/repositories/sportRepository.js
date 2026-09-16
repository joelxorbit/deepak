import { getSportsCollection } from '../config/firestoreCollections.js';

export const getAllSportsDoc = async () => {
  const snapshot = await getSportsCollection().get();
  const docs = snapshot.docs
    .map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() }))
    .filter(sport => !sport.isDeleted && sport.isActive !== false);

  return docs.sort((a, b) => (a.order || 99) - (b.order || 99));
};

export const findSportById = async (id) => {
  if (!id) return null;
  const doc = await getSportsCollection().doc(id).get();
  if (!doc.exists || doc.data().isDeleted) return null;
  return { id: doc.id, _id: doc.id, ...doc.data() };
};

export const createSport = async (sportData) => {
  const now = new Date().toISOString();
  const payload = {
    title: sportData.title.trim(),
    icon: sportData.icon || 'sports_soccer',
    tag: sportData.tag || 'Arena Sport',
    image: sportData.image || '',
    description: sportData.description ? sportData.description.trim() : '',
    order: Number(sportData.order) || 99,
    category: sportData.category || 'Sport',
    isActive: sportData.isActive !== false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  };

  const docRef = await getSportsCollection().add(payload);
  const doc = await docRef.get();
  return { id: doc.id, _id: doc.id, ...doc.data() };
};
