/**
 * Sentry Edge Runtime Configuration
 *
 * Configures error tracking for Edge Runtime (middleware, edge functions).
 * Lightweight configuration optimized for edge environments.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV,

    // Release tracking
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development',

    // Sample rate for error events
    sampleRate: 1.0,

    // Sample rate for performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Ignore specific errors
    ignoreErrors: [
      'Invalid Refresh Token',
      'Auth session missing',
      'ValidationError',
    ],
  });
}
