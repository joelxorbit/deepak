import app from '../back-end/app.js';
import { initializeFirebase } from '../back-end/config/firebase.js';

// Ensure Firebase Cloud Firestore is initialized for Vercel Serverless Function invocations
try {
  initializeFirebase();
} catch (e) {
  console.error('[Vercel Serverless Firebase Init Warning]', e.message);
}
export default function handler(req, res) {
  try {
    return app(req, res);
  } catch (error) {
    console.error('[Vercel Serverless Function Error]', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error during function execution: ' + error.message
      });
    }
  }
}
