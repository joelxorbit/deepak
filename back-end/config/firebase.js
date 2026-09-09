import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { ENV } from './env.js';
import { logger } from '../utils/logger.js';
import { MockDb } from './mockDb.js';
import { formatFirebasePrivateKey, parseFirebaseServiceAccount } from '../utils/firebaseKeyFormatter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;
let storageBucket = null;

/**
 * Returns safe diagnostic information about the Firebase configuration.
 * All sensitive values are strictly masked.
 */
export const getFirebaseDiagnostics = () => {
  const mask = (str) => {
    if (!str || typeof str !== 'string') return 'NOT_CONFIGURED';
    if (str.length <= 8) return '***';
    return `${str.substring(0, 4)}...${str.substring(str.length - 4)}`;
  };

  const key = ENV.FIREBASE_PRIVATE_KEY;
  const isKeyValidPem = Boolean(
    key &&
    (key.includes('-----BEGIN PRIVATE KEY-----') || key.includes('-----BEGIN RSA PRIVATE KEY-----')) &&
    (key.includes('-----END PRIVATE KEY-----') || key.includes('-----END RSA PRIVATE KEY-----')) &&
    key.length > 500
  );

  return {
    projectId: mask(ENV.FIREBASE_PROJECT_ID),
    clientEmail: mask(ENV.FIREBASE_CLIENT_EMAIL),
    hasPrivateKey: Boolean(key),
    isKeyValidPem,
    keyLength: key ? key.length : 0,
    storageBucket: mask(ENV.FIREBASE_STORAGE_BUCKET)
  };
};

export const initializeFirebase = () => {
  if (process.env.USE_LOCAL_DB === 'true' || process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test') {
    if (!db) {
      db = new MockDb();
      logger.info('[Firebase] Using Persistent MockDb (back-end/data/local_db.json) for local execution.');
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
      const formattedKey = formatFirebasePrivateKey(ENV.FIREBASE_PRIVATE_KEY);
      const serviceAccount = {
        type: ENV.FIREBASE_TYPE || 'service_account',
        project_id: ENV.FIREBASE_PROJECT_ID,
        private_key_id: ENV.FIREBASE_PRIVATE_KEY_ID,
        private_key: formattedKey,
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
      // 2. Check if JSON string / Base64 env variable exists
      const parsedAccount = parseFirebaseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (parsedAccount && parsedAccount.private_key) {
        credential = admin.credential.cert(parsedAccount);
        logger.info('[Firebase] Loaded service account credential from FIREBASE_SERVICE_ACCOUNT JSON / Base64 string.');
      } else {
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT configuration string or JSON.');
      }
    } else {
      // 3. Fallback to file path if exists
      const saPath = path.isAbsolute(ENV.FIREBASE_SERVICE_ACCOUNT_PATH)
        ? ENV.FIREBASE_SERVICE_ACCOUNT_PATH
        : path.resolve(__dirname, '..', ENV.FIREBASE_SERVICE_ACCOUNT_PATH);

      if (fs.existsSync(saPath)) {
        const fileContent = fs.readFileSync(saPath, 'utf8');
        const parsedAccount = parseFirebaseServiceAccount(fileContent);
        if (parsedAccount && parsedAccount.private_key) {
          credential = admin.credential.cert(parsedAccount);
          logger.info(`[Firebase] Loaded service account credential from file: ${saPath}`);
        } else {
          throw new Error(`Invalid service account file at: ${saPath}`);
        }
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
