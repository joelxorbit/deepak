import { getAuditLogsCollection } from '../config/firestoreCollections.js';
import { logger } from '../utils/logger.js';

export const createAuditLog = async ({ action, user, details }) => {
  try {
    const logData = {
      action,
      user: user || 'system',
      details: details || {},
      timestamp: new Date().toISOString()
    };
    await getAuditLogsCollection().add(logData);
  } catch (error) {
    logger.error(`[Audit Log Failure] Failed to record audit log: ${error.message}`);
  }
};

export const purgeOldAuditLogs = async (retentionDays = 365) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffStr = cutoffDate.toISOString();

    const snapshot = await getAuditLogsCollection()
      .where('timestamp', '<', cutoffStr)
      .limit(500)
      .get();

    if (snapshot.empty) return 0;

    const batch = getAuditLogsCollection().firestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    logger.info(`[Audit Retention] Purged ${snapshot.size} expired audit log records.`);
    return snapshot.size;
  } catch (error) {
    logger.error(`[Audit Retention Error] ${error.message}`);
    return 0;
  }
};
