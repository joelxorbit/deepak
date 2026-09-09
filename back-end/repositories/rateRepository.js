import { getRatesCollection } from '../config/firestoreCollections.js';

export const getAllRateRulesDoc = async ({ sportId, status, limit = 50 } = {}) => {
  const snapshot = await getRatesCollection().get();
  let docs = snapshot.docs.map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() }));

  if (sportId && sportId !== 'all') {
    docs = docs.filter(r => r.sportId === sportId || r.sportId === 'all');
  }

  if (status && status !== 'all') {
    docs = docs.filter(r => r.status === status);
  }

  docs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return docs.slice(0, Math.min(limit, 100));
};

export const findRateRuleByIdDoc = async (id) => {
  if (!id) return null;
  const doc = await getRatesCollection().doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, _id: doc.id, ...doc.data() };
};

export const createRateRuleDoc = async (ruleData, adminUser = null) => {
  const now = new Date().toISOString();
  const adminId = adminUser?.id || adminUser?._id || adminUser?.username || 'admin';

  const docRef = getRatesCollection().doc();
  const payload = {
    id: docRef.id,
    _id: docRef.id,
    sportId: ruleData.sportId || 'football-5v5',
    ratePerHour: Number(ruleData.ratePerHour),
    peakRatePerHour: ruleData.peakRatePerHour ? Number(ruleData.peakRatePerHour) : Number(ruleData.ratePerHour),
    weekendRatePerHour: ruleData.weekendRatePerHour ? Number(ruleData.weekendRatePerHour) : Number(ruleData.ratePerHour),
    dateStr: ruleData.dateStr || null,
    effectiveFrom: ruleData.effectiveFrom || null,
    effectiveTo: ruleData.effectiveTo || null,
    daysOfWeek: Array.isArray(ruleData.daysOfWeek) && ruleData.daysOfWeek.length > 0 ? ruleData.daysOfWeek : ['ALL'],
    timeSlots: Array.isArray(ruleData.timeSlots) && ruleData.timeSlots.length > 0 ? ruleData.timeSlots : ['ALL'],
    isPeak: Boolean(ruleData.isPeak),
    status: ruleData.status || 'active',
    ruleName: ruleData.ruleName || 'Price Rule',
    notes: ruleData.notes || '',
    priority: ruleData.priority ? Number(ruleData.priority) : 10,
    createdBy: adminId,
    createdAt: now,
    updatedAt: now
  };

  await docRef.set(payload);
  return payload;
};

export const updateRateRuleDoc = async (id, updateData, adminUser = null) => {
  const docRef = getRatesCollection().doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const now = new Date().toISOString();
  const payload = {
    ...updateData,
    updatedAt: now
  };

  if (updateData.ratePerHour !== undefined) {
    payload.ratePerHour = Number(updateData.ratePerHour);
  }
  if (updateData.peakRatePerHour !== undefined) {
    payload.peakRatePerHour = Number(updateData.peakRatePerHour);
  }
  if (updateData.weekendRatePerHour !== undefined) {
    payload.weekendRatePerHour = Number(updateData.weekendRatePerHour);
  }

  await docRef.update(payload);
  const updatedDoc = await docRef.get();
  return { id: updatedDoc.id, _id: updatedDoc.id, ...updatedDoc.data() };
};

export const toggleRateRuleActiveDoc = async (id, isActive, adminUser = null) => {
  const docRef = getRatesCollection().doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const now = new Date().toISOString();
  const status = isActive ? 'active' : 'inactive';

  await docRef.update({
    status,
    updatedAt: now
  });

  const updatedDoc = await docRef.get();
  return { id: updatedDoc.id, _id: updatedDoc.id, ...updatedDoc.data() };
};

export const deleteRateRuleDoc = async (id) => {
  const docRef = getRatesCollection().doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  await docRef.delete();
  return { id, _id: id };
};
