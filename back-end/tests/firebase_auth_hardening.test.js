import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { formatFirebasePrivateKey, parseFirebaseServiceAccount } from '../utils/firebaseKeyFormatter.js';
import { getFirebaseDiagnostics } from '../config/firebase.js';
import { errorMiddleware, isFirebaseDatabaseError } from '../middlewares/errorMiddleware.js';
import { getMaskedEnvConfig } from '../utils/envValidation.js';
import { ENV } from '../config/env.js';
import adminRoutes from '../routes/adminRoutes.js';
import { loginRateLimiter } from '../middlewares/rateLimiter.js';

describe('Firebase Authentication Credential Hardening & Error Sanitization', () => {
  describe('formatFirebasePrivateKey', () => {
    it('should return undefined for empty or non-string inputs', () => {
      expect(formatFirebasePrivateKey(null)).toBeUndefined();
      expect(formatFirebasePrivateKey(undefined)).toBeUndefined();
      expect(formatFirebasePrivateKey('')).toBeUndefined();
      expect(formatFirebasePrivateKey('   ')).toBeUndefined();
    });

    it('should correctly format key with literal \\n escape sequences', () => {
      const raw = '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD\\n-----END PRIVATE KEY-----';
      const formatted = formatFirebasePrivateKey(raw);
      expect(formatted).toContain('-----BEGIN PRIVATE KEY-----\n');
      expect(formatted).toContain('\n-----END PRIVATE KEY-----');
      expect(formatted).not.toContain('\\n');
    });

    it('should strip wrapping single and double quotes', () => {
      const doubleQuoted = '"-----BEGIN PRIVATE KEY-----\\nMIIEvg...\\n-----END PRIVATE KEY-----"';
      const singleQuoted = '\'-----BEGIN PRIVATE KEY-----\\nMIIEvg...\\n-----END PRIVATE KEY-----\'';

      const resDouble = formatFirebasePrivateKey(doubleQuoted);
      const resSingle = formatFirebasePrivateKey(singleQuoted);

      expect(resDouble.startsWith('-----BEGIN PRIVATE KEY-----')).toBe(true);
      expect(resDouble.endsWith('-----END PRIVATE KEY-----')).toBe(true);
      expect(resSingle.startsWith('-----BEGIN PRIVATE KEY-----')).toBe(true);
      expect(resSingle.endsWith('-----END PRIVATE KEY-----')).toBe(true);
    });

    it('should decode base64-encoded private keys', () => {
      const originalKey = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD\n-----END PRIVATE KEY-----';
      const base64Key = Buffer.from(originalKey).toString('base64');

      const result = formatFirebasePrivateKey(base64Key);
      expect(result).toBe(originalKey);
    });

    it('should handle windows \\r\\n sequences', () => {
      const rawWithCRLF = '-----BEGIN PRIVATE KEY-----\\r\\nMIIEvg...\\r\\n-----END PRIVATE KEY-----';
      const formatted = formatFirebasePrivateKey(rawWithCRLF);
      expect(formatted).toContain('-----BEGIN PRIVATE KEY-----\n');
      expect(formatted).toContain('\n-----END PRIVATE KEY-----');
      expect(formatted).not.toContain('\\r\\n');
    });
  });

  describe('parseFirebaseServiceAccount', () => {
    it('should parse valid JSON string and normalize private_key', () => {
      const jsonStr = JSON.stringify({
        project_id: 'test-project',
        client_email: 'test@test-project.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\\nMIIEvg...\\n-----END PRIVATE KEY-----'
      });

      const parsed = parseFirebaseServiceAccount(jsonStr);
      expect(parsed).not.null;
      expect(parsed.project_id).toBe('test-project');
      expect(parsed.private_key).toContain('\n');
      expect(parsed.private_key).not.toContain('\\n');
    });

    it('should parse base64-encoded service account JSON', () => {
      const obj = {
        project_id: 'b64-project',
        client_email: 'b64@project.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\\nKeyBody\\n-----END PRIVATE KEY-----'
      };
      const base64Str = Buffer.from(JSON.stringify(obj)).toString('base64');

      const parsed = parseFirebaseServiceAccount(base64Str);
      expect(parsed).not.null;
      expect(parsed.project_id).toBe('b64-project');
      expect(parsed.private_key).toContain('KeyBody');
    });

    it('should return null for malformed inputs', () => {
      expect(parseFirebaseServiceAccount('{invalid-json')).toBeNull();
      expect(parseFirebaseServiceAccount(null)).toBeNull();
    });
  });

  describe('Firebase Diagnostics & Masking', () => {
    it('should mask project ID and client email without exposing full secrets', () => {
      const diagnostics = getFirebaseDiagnostics();
      expect(diagnostics).toHaveProperty('projectId');
      expect(diagnostics).toHaveProperty('clientEmail');
      expect(diagnostics).toHaveProperty('hasPrivateKey');
      expect(diagnostics).toHaveProperty('isKeyValidPem');
      expect(diagnostics).toHaveProperty('storageBucket');

      // Check masking on getMaskedEnvConfig
      const masked = getMaskedEnvConfig(ENV);
      expect(masked.FIREBASE_PROJECT_ID).not.toBe(ENV.FIREBASE_PROJECT_ID);
      expect(masked.FIREBASE_PROJECT_ID).toContain('...');
    });
  });

  describe('isFirebaseDatabaseError helper', () => {
    it('should detect 16 UNAUTHENTICATED error string', () => {
      const err = new Error('16 UNAUTHENTICATED: Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential.');
      expect(isFirebaseDatabaseError(err)).toBe(true);
    });

    it('should detect gRPC code 16', () => {
      const err = new Error('Database request failed');
      err.code = 16;
      expect(isFirebaseDatabaseError(err)).toBe(true);
    });

    it('should detect PERMISSION_DENIED and UNAVAILABLE errors', () => {
      const permErr = new Error('7 PERMISSION_DENIED: Missing or insufficient permissions.');
      const unavailErr = new Error('14 UNAVAILABLE: The service is currently unavailable.');
      expect(isFirebaseDatabaseError(permErr)).toBe(true);
      expect(isFirebaseDatabaseError(unavailErr)).toBe(true);
    });

    it('should return false for regular application validation or client errors', () => {
      const appErr = new Error('Invalid credentials');
      appErr.statusCode = 401;
      expect(isFirebaseDatabaseError(appErr)).toBe(false);
    });
  });

  describe('errorMiddleware Error Sanitization', () => {
    let app;

    beforeAll(() => {
      app = express();
      app.use(express.json());
      app.use(cookieParser());

      // Route simulating a 16 UNAUTHENTICATED failure from Firestore
      app.get('/test-unauthenticated', (req, res, next) => {
        const error = new Error('16 UNAUTHENTICATED: Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential.');
        next(error);
      });

      // Route simulating a standard application error
      app.get('/test-bad-request', (req, res, next) => {
        const error = new Error('Invalid booking payload');
        error.statusCode = 400;
        next(error);
      });

      app.use(errorMiddleware);
    });

    it('should sanitize 16 UNAUTHENTICATED errors to 503 and hide internal details', async () => {
      const res = await request(app).get('/test-unauthenticated');
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Admin service is temporarily unavailable. Please verify the server configuration or try again later.');
      // Ensure no raw Google / OAuth string is leaked to client
      expect(JSON.stringify(res.body)).not.toContain('16 UNAUTHENTICATED');
      expect(JSON.stringify(res.body)).not.toContain('OAuth 2 access token');
    });

    it('should preserve standard 400 Bad Request application errors', async () => {
      const res = await request(app).get('/test-bad-request');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid booking payload');
    });
  });

  describe('Admin Authentication & Security Integrity', () => {
    let app;

    beforeAll(() => {
      app = express();
      app.use(express.json());
      app.use(cookieParser());
      app.use('/api/admin', adminRoutes);
      app.use(errorMiddleware);
    });

    it('should reject missing username or password with 400', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: '' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should successfully authenticate admin with correct password and bootstrap initial admin', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.admin.username).toBe('admin');
      expect(res.body.data.admin.role).toBe('admin');
      // Password hash must never be in response
      expect(res.body.data.admin.password).toBeUndefined();
    });

    it('should reject wrong password with 401 Invalid credentials', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'incorrect_password_123' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should protect /api/admin/dashboard against unauthenticated access', async () => {
      const res = await request(app).get('/api/admin/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
