import fs from 'fs';
import path from 'path';

export const validateEnv = (ENV) => {
  const missing = [];

  if (!ENV.JWT_SECRET || ENV.JWT_SECRET.trim() === '') {
    missing.push('JWT_SECRET');
  }

  // Check if Firebase env credentials or file exist
  const hasFirebaseEnv = ENV.FIREBASE_PROJECT_ID && ENV.FIREBASE_PRIVATE_KEY && ENV.FIREBASE_CLIENT_EMAIL;
  if (!hasFirebaseEnv && !process.env.FIREBASE_SERVICE_ACCOUNT) {
    const resolvedPath = path.isAbsolute(ENV.FIREBASE_SERVICE_ACCOUNT_PATH)
      ? ENV.FIREBASE_SERVICE_ACCOUNT_PATH
      : path.resolve(process.cwd(), ENV.FIREBASE_SERVICE_ACCOUNT_PATH);

    if (!fs.existsSync(resolvedPath)) {
      console.warn(`[Env Warning] Firebase service account credentials not found in .env or file at ${resolvedPath}.`);
    }
  }

  if (missing.length > 0) {
    throw new Error(`[Fatal] Startup validation failed. Missing required environment variables: ${missing.join(', ')}`);
  }
};
