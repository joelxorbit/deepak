import { initializeFirebase } from '../config/firebase.js';
import { getSettingsCollection } from '../config/firestoreCollections.js';
import { logger } from '../utils/logger.js';
import { fileURLToPath } from 'url';

/**
 * Safe, explicit, non-automatic initialization script for payment settings.
 * Only writes fixedAdvanceAmount if the settings document does not already exist.
 * Usage: node scripts/seedSettings.js
 */
export const seedPaymentSettings = async () => {
  logger.info('[SeedSettings] Initializing payment settings...');
  try {
    initializeFirebase();
    const settingsCol = getSettingsCollection();
    const docRef = settingsCol.doc('paymentSettings');
    const snap = await docRef.get();

    if (snap.exists) {
      logger.info(`[SeedSettings] Settings already exist: ${JSON.stringify(snap.data())}. No changes made.`);
      return { status: 'EXISTS', data: snap.data() };
    }

    const initialSettings = {
      fixedAdvanceAmount: 200,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: 'Authoritative fixed advance amount for online turf bookings'
    };

    await docRef.set(initialSettings);
    logger.info(`[SeedSettings] SUCCESS: Created settings/paymentSettings with fixedAdvanceAmount: 200.`);
    return { status: 'CREATED', data: initialSettings };
  } catch (err) {
    logger.error(`[SeedSettings Failure] ${err.message}`);
    throw err;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedPaymentSettings()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
