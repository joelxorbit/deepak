import fs from 'fs';
import path from 'path';
import { initializeFirebase, getDb } from '../config/firebase.js';
import { logger } from '../utils/logger.js';
import { generateSearchTokens } from '../utils/slotNormalizer.js';

const migrateMongoToFirestore = async () => {
  logger.info('[Migration Script] Initializing Firebase Admin SDK...');
  initializeFirebase();
  const db = getDb();

  const backupDir = path.resolve(process.cwd(), './backup');
  if (!fs.existsSync(backupDir)) {
    logger.error(`[Migration Script] Backup directory ${backupDir} does not exist. Run npm run backup:mongo first or place JSON backup files in ./backup.`);
    process.exit(1);
  }

  const files = fs.readdirSync(backupDir).filter(f => f.startsWith('mongo_backup_') && f.endsWith('.json'));
  if (files.length === 0) {
    logger.error('[Migration Script] No backup JSON files found in ./backup directory.');
    process.exit(1);
  }

  const latestFile = files.sort().pop();
  const backupFilePath = path.join(backupDir, latestFile);
  logger.info(`[Migration Script] Reading backup file: ${backupFilePath}`);

  const rawData = fs.readFileSync(backupFilePath, 'utf8');
  const backupData = JSON.parse(rawData);

  const report = {
    collectionsMigrated: 0,
    documentsMigrated: 0,
    duplicatesSkipped: 0,
    errorsEncountered: 0,
    details: {}
  };

  for (const [colName, docs] of Object.entries(backupData)) {
    logger.info(`[Migration Script] Processing collection '${colName}' (${docs.length} documents)...`);
    let migratedCount = 0;
    let skippedCount = 0;

    const targetCollection = db.collection(colName);
    const batchSize = 400;

    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      const batch = db.batch();

      for (const doc of chunk) {
        const docId = doc._id ? String(doc._id) : targetCollection.doc().id;
        const docRef = targetCollection.doc(docId);

        // Check if document already exists (Duplicate detection)
        const existingSnap = await docRef.get();
        if (existingSnap.exists) {
          skippedCount++;
          continue;
        }

        const { _id, __v, ...cleanDoc } = doc;

        // Standardize timestamps and search tokens
        if (cleanDoc.createdAt && typeof cleanDoc.createdAt === 'object' && cleanDoc.createdAt.$date) {
          cleanDoc.createdAt = new Date(cleanDoc.createdAt.$date).toISOString();
        }
        if (cleanDoc.updatedAt && typeof cleanDoc.updatedAt === 'object' && cleanDoc.updatedAt.$date) {
          cleanDoc.updatedAt = new Date(cleanDoc.updatedAt.$date).toISOString();
        }

        if (colName === 'bookings' && cleanDoc.bookingId) {
          cleanDoc.searchTokens = generateSearchTokens(cleanDoc.bookingId, cleanDoc.customerName, cleanDoc.customerPhone);
        } else if (colName === 'customers' && cleanDoc.name) {
          cleanDoc.searchTokens = generateSearchTokens(cleanDoc.name, cleanDoc.phone);
        }

        batch.set(docRef, cleanDoc);
        migratedCount++;
      }

      await batch.commit();
    }

    report.collectionsMigrated++;
    report.documentsMigrated += migratedCount;
    report.duplicatesSkipped += skippedCount;
    report.details[colName] = { migrated: migratedCount, skipped: skippedCount };
    logger.info(`[Migration Script] Completed '${colName}': ${migratedCount} imported, ${skippedCount} skipped.`);
  }

  logger.info('====================================================');
  logger.info('MIGRATION SUMMARY REPORT');
  logger.info(`Collections Migrated: ${report.collectionsMigrated}`);
  logger.info(`Documents Imported:   ${report.documentsMigrated}`);
  logger.info(`Duplicates Skipped:   ${report.duplicatesSkipped}`);
  logger.info('====================================================');
};

migrateMongoToFirestore().catch(err => {
  logger.error(`[Migration Fatal Error] ${err.message}`);
  process.exit(1);
});
