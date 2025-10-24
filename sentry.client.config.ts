/**
 * Sentry Client-Side Configuration
 *
 * Configures error tracking for browser/client-side code.
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

    // Session replay sample rate (0% by default, can enable for debugging)
    replaysSessionSampleRate: 0.0,

    // Replay on error sample rate (10% of errors get session replays)
    replaysOnErrorSampleRate: 0.1,

    // Integrations
    integrations: [
      // Replay integration for session recordings
      Sentry.replayIntegration({
        maskAllText: true, // Mask all text for privacy
        blockAllMedia: true, // Block all media (images, videos)
      }),
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration(),
    ],

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',
      // Random network errors
      'NetworkError',
      'Network request failed',
      // Non-critical video errors
      'AbortError',
      'The play() request was interrupted',
      // ResizeObserver errors (common and non-critical)
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],

    // Ignore specific URLs
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
      // Third-party scripts
      /google-analytics\.com/i,
      /googletagmanager\.com/i,
    ],

    // Before send hook for filtering and modifying events
    beforeSend(event, hint) {
      // Filter out non-critical errors in production
      if (process.env.NODE_ENV === 'production') {
        const error = hint.originalException;

        // Skip video play/pause errors
        if (
          error instanceof Error &&
          (error.name === 'AbortError' || error.message?.includes('play()'))
        ) {
          return null;
        }
      }

      return event;
    },
  });
}
