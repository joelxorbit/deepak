import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { ENV } from './config/env.js';
import { getDb } from './config/firebase.js';
import { globalRateLimiter } from './middlewares/rateLimiter.js';
import { notFoundMiddleware } from './middlewares/notFoundMiddleware.js';
import { errorMiddleware } from './middlewares/errorMiddleware.js';
import { sendSuccess } from './utils/response.js';
import { setupSwagger } from './config/swagger.js';

import bookingRoutes from './routes/bookingRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import enquiryRoutes from './routes/enquiryRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import v1Routes from './routes/v1/index.js';

const app = express();

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-side calls, curl, or same-origin requests)
    if (!origin) return callback(null, true);

    // Allow requests from CLIENT_URL, localhost, or any .vercel.app domain
    if (
      origin === ENV.CLIENT_URL ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      ENV.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }

    return callback(null, true);
  },
  credentials: true
}));

app.use(globalRateLimiter);

// Request Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging Middleware
app.use(morgan('dev'));

// Swagger OpenAPI Documentation
setupSwagger(app);

// Health Check Route Handler with Firestore Latency & Connectivity Test
const healthCheckHandler = async (req, res) => {
  const startTime = Date.now();
  let firestoreStatus = 'connected';
  let latencyMs = 0;

  try {
    const db = getDb();
    await db.collection('counters').limit(1).get();
    latencyMs = Date.now() - startTime;
  } catch (err) {
    firestoreStatus = `error: ${err.message}`;
  }

  const memoryUsage = process.memoryUsage();
  return sendSuccess(res, 'Elite Pitch API Foundation is operational.', {
    status: firestoreStatus === 'connected' ? 'healthy' : 'degraded',
    version: '1.0.0',
    uptime: `${Math.floor(process.uptime())}s`,
    firestore: firestoreStatus,
    latency: `${latencyMs}ms`,
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
    },
    environment: ENV.NODE_ENV,
    timestamp: new Date().toISOString()
  });
};

app.get('/api/health', healthCheckHandler);
app.get('/api/v1/health', healthCheckHandler);

// Register Application Routes (/api)
app.use('/api/bookings', bookingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/payments', paymentRoutes);

// Register Versioned Routes (/api/v1)
app.use('/api/v1', v1Routes);

// Error & 404 Handlers Registration
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
