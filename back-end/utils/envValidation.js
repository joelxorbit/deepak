import fs from 'fs';
import path from 'path';

/**
 * Validates mandatory environment variables at server startup.
 * Throws a fatal Error only when essential production variables are absent.
 */
export const validateEnv = (ENV = {}) => {
  const missing = [];

  if (!ENV.JWT_SECRET || String(ENV.JWT_SECRET).trim() === '') {
    missing.push('JWT_SECRET');
  }

  // Check if Firebase env credentials or file exist
  const hasFirebaseEnv = ENV.FIREBASE_PROJECT_ID && ENV.FIREBASE_PRIVATE_KEY && ENV.FIREBASE_CLIENT_EMAIL;
  if (!hasFirebaseEnv && !process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccountPath = ENV.FIREBASE_SERVICE_ACCOUNT_PATH || './config/firebase-service-account.json';
    const resolvedPath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.resolve(process.cwd(), serviceAccountPath);

    if (!fs.existsSync(resolvedPath)) {
      console.warn(`[Env Warning] Firebase service account credentials not found in .env or file at ${resolvedPath}.`);
    }
  }

  if (missing.length > 0) {
    throw new Error(`[Fatal] Startup validation failed. Missing required environment variables: ${missing.join(', ')}`);
  }
};

/**
 * Check if WhatsApp Cloud API credentials are fully configured.
 * WhatsApp is optional and never blocks server startup if missing.
 */
export const isWhatsAppConfigured = (ENV = {}) => {
  return Boolean(
    ENV.WHATSAPP_API_TOKEN &&
    ENV.WHATSAPP_PHONE_NUMBER_ID &&
    ENV.WHATSAPP_BUSINESS_ACCOUNT_ID
  );
};

/**
 * Check if Razorpay credentials are configured.
 */
export const isRazorpayConfigured = (ENV = {}) => {
  return Boolean(ENV.RAZORPAY_KEY_ID && ENV.RAZORPAY_KEY_SECRET);
};

/**
 * Check if Google OAuth credentials are configured.
 */
export const isGoogleOAuthConfigured = (ENV = {}) => {
  return Boolean(ENV.GOOGLE_CLIENT_ID);
};

/**
 * Produces a safe, sanitized diagnostic summary of environment settings.
 * All sensitive secrets are strictly masked.
 */
export const getMaskedEnvConfig = (ENV = {}) => {
  const mask = (val) => {
    if (!val || typeof val !== 'string') return 'NOT_CONFIGURED';
    if (val.length <= 6) return '***';
    return `${val.substring(0, 3)}...${val.substring(val.length - 3)}`;
  };

  return {
    NODE_ENV: ENV.NODE_ENV || 'development',
    PORT: ENV.PORT || 5000,
    CLIENT_URL: ENV.CLIENT_URL || 'http://localhost:5173',
    FIREBASE_PROJECT_ID: mask(ENV.FIREBASE_PROJECT_ID),
    FIREBASE_CLIENT_EMAIL: mask(ENV.FIREBASE_CLIENT_EMAIL),
    FIREBASE_CREDENTIALS_CONFIGURED: Boolean(
      (ENV.FIREBASE_PROJECT_ID && ENV.FIREBASE_PRIVATE_KEY && ENV.FIREBASE_CLIENT_EMAIL) ||
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      fs.existsSync(path.resolve(process.cwd(), ENV.FIREBASE_SERVICE_ACCOUNT_PATH || './config/firebase-service-account.json'))
    ),
    JWT_SECRET_SET: Boolean(ENV.JWT_SECRET),
    QR_SIGNING_SECRET_SET: Boolean(ENV.QR_SIGNING_SECRET),
    GOOGLE_AUTH_CONFIGURED: isGoogleOAuthConfigured(ENV),
    GOOGLE_CLIENT_ID: mask(ENV.GOOGLE_CLIENT_ID),
    RAZORPAY_CONFIGURED: isRazorpayConfigured(ENV),
    RAZORPAY_KEY_ID: mask(ENV.RAZORPAY_KEY_ID),
    WHATSAPP_CONFIGURED: isWhatsAppConfigured(ENV),
    WHATSAPP_PHONE_NUMBER_ID: mask(ENV.WHATSAPP_PHONE_NUMBER_ID)
  };
};
