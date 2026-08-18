import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../.env')
});

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_elite_pitch_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  
  // Firebase Cloud Firestore Environment Configuration
  FIREBASE_TYPE: process.env.FIREBASE_TYPE || 'service_account',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'elite-turf-64ba8',
  FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '') : undefined,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID,
  FIREBASE_AUTH_URI: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  FIREBASE_TOKEN_URI: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
  FIREBASE_AUTH_PROVIDER_X509_CERT_URL: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
  FIREBASE_CLIENT_X509_CERT_URL: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || 'elite-turf-64ba8.appspot.com',
  FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/firebase-service-account.json'
};
