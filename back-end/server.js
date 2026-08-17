import app from './app.js';
import { ENV } from './config/env.js';
import { initializeFirebase } from './config/firebase.js';
import { validateEnv } from './utils/envValidation.js';
import { logger } from './utils/logger.js';
import { purgeOldAuditLogs } from './repositories/auditRepository.js';

let server = null;

const startServer = async () => {
  try {
    // 1. Startup Environment Validation
    validateEnv(ENV);

    // 2. Initialize Firebase Cloud Firestore
    initializeFirebase();

    // 3. Purge old audit logs asynchronously (365 days retention)
    purgeOldAuditLogs(365).catch(err => logger.warn(`[Audit Purge Warning] ${err.message}`));

    // 4. Start HTTP Server
    const PORT = ENV.PORT;
    server = app.listen(PORT, () => {
      logger.info(`[Server] Elite Pitch Backend running on port ${PORT} (${ENV.NODE_ENV})`);
    });
  } catch (error) {
    logger.error(`[Server Fatal Initialization Failure] ${error.message}`);
    process.exit(1);
  }
};

// Graceful Shutdown Handling
const gracefulShutdown = (signal) => {
  logger.info(`[Server] Received ${signal}. Initializing graceful shutdown...`);
  if (server) {
    server.close(() => {
      logger.info('[Server] HTTP server closed cleanly. Exiting process.');
      process.exit(0);
    });

    // Force close after 10s if connections persist
    setTimeout(() => {
      logger.error('[Server] Could not close connections in time, forcefully shutting down.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
