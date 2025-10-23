/**
 * Ultra-thin Pino-based server logger with Axiom integration
 *
 * Features:
 * - High-performance JSON logging with Pino
 * - Automatic Axiom ingest with batching
 * - Pretty printing in development
 * - Optimized for serverless (Next.js/Vercel)
 * - Child loggers for contextual logging
 *
 * Usage:
 * ```typescript
 * import { serverLogger } from '@/lib/serverLogger';
 *
 * serverLogger.info('Server started');
 * serverLogger.error({ error: err, userId: '123' }, 'Failed to save');
 *
 * // Create child logger with context
 * const routeLogger = serverLogger.child({ route: '/api/users' });
 * routeLogger.info('Route accessed');
 * ```
 */

import pino from 'pino';
import { axiomTransport } from './axiomTransport';
import { Writable } from 'stream';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Custom writable stream that sends logs to Axiom transport.
 * This stream parses the JSON log entries and forwards them to Axiom.
 */
class AxiomStream extends Writable {
  override _write(chunk: Buffer, _encoding: string, callback: () => void) {
    // Parse and send to Axiom (async, non-blocking)
    if (process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET) {
      try {
        const log = JSON.parse(chunk.toString());
        axiomTransport.write(log);
      } catch {
        // Ignore parse errors
      }
    }
    callback();
  }
}

// Create Axiom stream instance
const axiomStream = new AxiomStream();

// Create base Pino logger with multistream
const baseLogger = pino(
  {
    level: isDevelopment ? 'debug' : 'info',

    // Custom serializers for common objects
    serializers: {
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },

    // Base metadata
    base: {
      env: process.env.NODE_ENV,
      service: 'genai-video-production',
    },

    // Timestamp configuration
    timestamp: () => `,"time":${Date.now()}`,
  },
  isDevelopment
    ? pino.multistream([
        // Pretty print to console in development
        {
          level: 'debug',
          stream: pino.transport({
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname',
            },
          }),
        },
        // Also send to Axiom
        { level: 'debug', stream: axiomStream },
      ])
    : // In production, send to both stdout and Axiom
      pino.multistream([
        { level: 'info', stream: process.stdout },
        { level: 'info', stream: axiomStream },
      ])
);

/**
 * Singleton server logger instance
 *
 * @example
 * serverLogger.info({ userId: '123' }, 'User logged in');
 * serverLogger.error({ error: err }, 'Database connection failed');
 */
export const serverLogger = baseLogger;

/**
 * Type export for compatibility
 */
export type Logger = typeof baseLogger;
