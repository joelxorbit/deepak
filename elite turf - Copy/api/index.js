import app from '../back-end/app.js';
import { initializeFirebase } from '../back-end/config/firebase.js';

// Ensure Firebase Cloud Firestore is initialized for Vercel Serverless Function invocations
try {
  initializeFirebase();
} catch (e) {
  console.error('[Vercel Serverless Firebase Init Warning]', e.message);
}

export default app;
