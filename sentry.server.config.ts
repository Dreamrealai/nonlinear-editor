/**
 * Sentry Server-Side Configuration
 *
 * Configures error tracking for server-side code (API routes, server components).
 * Automatically captures unhandled errors and promise rejections.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV,

    // Release tracking (set via CI/CD or build process)
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development',

    // Sample rate for error events (100% = capture all errors)
    sampleRate: 1.0,

    // Sample rate for performance monitoring (10% in production, 100% in dev)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Ignore specific errors
    ignoreErrors: [
      // Supabase auth errors (handled gracefully)
      'Invalid Refresh Token',
      'Auth session missing',
      // Expected validation errors (not bugs)
      'ValidationError',
      // Non-critical errors
      'AbortError',
    ],

    // Before send hook for filtering and modifying events
    beforeSend(event, hint) {
      // Add server context
      event.contexts = {
        ...event.contexts,
        runtime: {
          name: 'node',
          version: process.version,
        },
      };

      // Filter out expected errors in production
      if (process.env.NODE_ENV === 'production') {
        const error = hint.originalException;

        // Skip validation errors (these are user errors, not bugs)
        if (error instanceof Error && error.name === 'ValidationError') {
          return null;
        }
      }

      return event;
    },
  });
}
