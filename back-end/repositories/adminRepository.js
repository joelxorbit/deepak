import { getAdminsCollection } from '../config/firestoreCollections.js';

export const findAdminByUsername = async (username) => {
  const snapshot = await getAdminsCollection()
    .where('username', '==', username)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

export const findAdminById = async (id) => {
  const doc = await getAdminsCollection().doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

export const getAdminsCount = async () => {
  const snapshot = await getAdminsCollection().get();
  return snapshot.size;
};

export const createAdmin = async (adminData) => {
  const now = new Date().toISOString();
  const docRef = await getAdminsCollection().add({
    ...adminData,
    createdAt: now,
    updatedAt: now
  });
  const newDoc = await docRef.get();
  return { id: newDoc.id, ...newDoc.data() };
};
