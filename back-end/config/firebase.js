import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { ENV } from './env.js';
import { logger } from '../utils/logger.js';
import { MockDb } from './mockDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;
let storageBucket = null;

export const initializeFirebase = () => {
  if (process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test') {
    if (!db) {
      db = new MockDb();
      logger.info('[Firebase] Using MockDb for Jest testing environment to bypass missing credentials.');
    }
    return { db, admin };
  }

  if (admin.apps.length > 0) {
    db = admin.firestore();
    return { db, admin };
  }

  try {
    let credential = null;

    // 1. Prioritize environment variables loaded from .env
    if (ENV.FIREBASE_PROJECT_ID && ENV.FIREBASE_PRIVATE_KEY && ENV.FIREBASE_CLIENT_EMAIL) {
      const serviceAccount = {
        type: ENV.FIREBASE_TYPE || 'service_account',
        project_id: ENV.FIREBASE_PROJECT_ID,
        private_key_id: ENV.FIREBASE_PRIVATE_KEY_ID,
        private_key: ENV.FIREBASE_PRIVATE_KEY,
        client_email: ENV.FIREBASE_CLIENT_EMAIL,
        client_id: ENV.FIREBASE_CLIENT_ID,
        auth_uri: ENV.FIREBASE_AUTH_URI,
        token_uri: ENV.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: ENV.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: ENV.FIREBASE_CLIENT_X509_CERT_URL
      };
      credential = admin.credential.cert(serviceAccount);
      logger.info('[Firebase] Successfully initialized service account credential from environment variables (.env).');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // 2. Check if JSON string env variable exists
      const parsedAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : process.env.FIREBASE_SERVICE_ACCOUNT;
      if (parsedAccount.private_key) {
        parsedAccount.private_key = parsedAccount.private_key.replace(/\\n/g, '\n');
      }
      credential = admin.credential.cert(parsedAccount);
      logger.info('[Firebase] Loaded service account credential from FIREBASE_SERVICE_ACCOUNT JSON string.');
    } else {
      // 3. Fallback to file path if exists
      const saPath = path.isAbsolute(ENV.FIREBASE_SERVICE_ACCOUNT_PATH)
        ? ENV.FIREBASE_SERVICE_ACCOUNT_PATH
        : path.resolve(__dirname, '..', ENV.FIREBASE_SERVICE_ACCOUNT_PATH);

      if (fs.existsSync(saPath)) {
        const fileContent = fs.readFileSync(saPath, 'utf8');
        const parsedAccount = JSON.parse(fileContent);
        if (parsedAccount.private_key) {
          parsedAccount.private_key = parsedAccount.private_key.replace(/\\n/g, '\n');
        }
        credential = admin.credential.cert(parsedAccount);
        logger.info(`[Firebase] Loaded service account credential from file: ${saPath}`);
      } else {
        logger.warn('[Firebase] Service account environment variables or file not found. Falling back to default application credentials.');
        credential = admin.credential.applicationDefault();
      }
    }

    admin.initializeApp({
      credential,
      storageBucket: ENV.FIREBASE_STORAGE_BUCKET
    });

    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    
    try {
      storageBucket = admin.storage().bucket();
    } catch (e) {
      logger.warn(`[Firebase Storage] Bucket warning: ${e.message}`);
    }

    logger.info('[Firebase] Firestore successfully initialized.');
    return { db, admin, storageBucket };
  } catch (error) {
    logger.error(`[Firebase Initialization Error] ${error.message}`);
    throw error;
  }
};

export const getDb = () => {
  if (!db) {
    initializeFirebase();
  }
  return db;
};

export const getStorageBucket = () => {
  if (!storageBucket) {
    initializeFirebase();
  }
  return storageBucket;
};

export { admin };
