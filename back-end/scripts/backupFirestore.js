import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, initializeFirebase } from '../config/firebase.js';
import { FIRESTORE_COLLECTIONS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Safely backup existing Firestore collections to a local JSON file.
 * Usage: node scripts/backupFirestore.js [--dry-run]
 */
export const backupFirestoreData = async () => {
  const isDryRun = process.argv.includes('--dry-run');
  logger.info(`[Firestore Backup] Starting backup process${isDryRun ? ' (DRY RUN)' : ''}...`);

  try {
    initializeFirebase();
    const db = getDb();

    const collectionsToBackup = [
      FIRESTORE_COLLECTIONS.BOOKINGS,
      FIRESTORE_COLLECTIONS.CUSTOMERS,
      FIRESTORE_COLLECTIONS.ADMINS,
      FIRESTORE_COLLECTIONS.EVENTS,
      FIRESTORE_COLLECTIONS.ENQUIRIES,
      FIRESTORE_COLLECTIONS.COUNTERS,
      FIRESTORE_COLLECTIONS.AUDIT_LOGS,
      FIRESTORE_COLLECTIONS.IDEMPOTENCY_KEYS
    ];

    const backupData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        isDryRun,
        collections: collectionsToBackup
      },
      collections: {}
    };

    let totalDocsCount = 0;

    for (const colName of collectionsToBackup) {
      try {
        const snapshot = await db.collection(colName).get();
        const docs = snapshot.docs.map(doc => ({
          _id: doc.id,
          ...doc.data()
        }));

        backupData.collections[colName] = docs;
        totalDocsCount += docs.length;
        logger.info(`[Firestore Backup] Read ${docs.length} documents from collection '${colName}'.`);
      } catch (colErr) {
        logger.error(`[Firestore Backup Error] Failed reading collection '${colName}': ${colErr.message}`);
        throw new Error(`Firestore backup failed on collection '${colName}': ${colErr.message}`);
      }
    }

    if (isDryRun) {
      logger.info(`[Firestore Backup] DRY RUN complete. Total documents found across all collections: ${totalDocsCount}`);
      return { success: true, isDryRun: true, totalDocsCount };
    }

    const backupDir = path.resolve(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(backupDir, `firestore_backup_${timestamp}.json`);

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
    logger.info(`[Firestore Backup] SUCCESS! Full Firestore backup of ${totalDocsCount} documents saved to: ${backupFilePath}`);

    return { success: true, isDryRun: false, backupFilePath, totalDocsCount };
  } catch (error) {
    logger.error(`[Firestore Backup Failure] ${error.message}`);
    throw error;
  }
};

// Run if executed directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  backupFirestoreData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
