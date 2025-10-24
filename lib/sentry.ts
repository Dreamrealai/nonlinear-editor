/**
 * Sentry Integration Utilities
 *
 * Provides utilities for enhanced error tracking with Sentry.
 * Automatically integrated with Next.js via @sentry/nextjs.
 *
 * Features:
 * - Breadcrumb tracking for user actions
 * - Context enrichment for errors
 * - Performance monitoring helpers
 * - User identification
 * - Custom tags and metadata
 *
 * Usage:
 * ```typescript
 * import { captureError, addBreadcrumb, setUserContext } from '@/lib/sentry';
 *
 * // Track user action
 * addBreadcrumb({
 *   message: 'User generated video',
 *   category: 'video',
 *   data: { duration: 30, format: 'mp4' }
 * });
 *
 * // Capture error with context
 * try {
 *   await generateVideo();
 * } catch (error) {
 *   captureError(error, {
 *     tags: { operation: 'video_generation' },
 *     context: { projectId: '123' }
 *   });
 * }
 * ```
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Check if Sentry is configured
 */
export function isSentryConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

/**
 * Breadcrumb categories for classification
 */
export enum BreadcrumbCategory {
  AUTH = 'auth',
  API = 'api',
  UI = 'ui',
  VIDEO = 'video',
  IMAGE = 'image',
  AUDIO = 'audio',
  PROJECT = 'project',
  TIMELINE = 'timeline',
  EXPORT = 'export',
  PAYMENT = 'payment',
  STORAGE = 'storage',
  NAVIGATION = 'navigation',
  ERROR = 'error',
}

/**
 * Breadcrumb data structure
 */
export interface BreadcrumbData {
  message: string;
  category?: BreadcrumbCategory | string;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, unknown>;
}

/**
 * Error capture options
 */
export interface ErrorCaptureOptions {
  /** Tags for filtering and grouping */
  tags?: Record<string, string>;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** Error severity level */
  level?: 'fatal' | 'error' | 'warning' | 'info';
  /** Fingerprint for custom grouping */
  fingerprint?: string[];
  /** User information */
  user?: {
    id?: string;
    email?: string;
    username?: string;
    [key: string]: unknown;
  };
}

/**
 * Add breadcrumb for user action tracking
 *
 * Breadcrumbs provide context leading up to an error.
 *
 * @example
 * addBreadcrumb({
 *   message: 'User clicked generate button',
 *   category: BreadcrumbCategory.VIDEO,
 *   data: { prompt: 'A cat playing piano', duration: 5 }
 * });
 */
export function addBreadcrumb(breadcrumb: BreadcrumbData): void {
  if (!isSentryConfigured()) {
    return;
  }

  Sentry.addBreadcrumb({
    message: breadcrumb.message,
    category: breadcrumb.category || 'default',
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture an exception with enhanced context
 *
 * @example
 * try {
 *   await generateVideo(params);
 * } catch (error) {
 *   captureError(error, {
 *     tags: { operation: 'video_generation', provider: 'fal' },
 *     context: { projectId: '123', userId: 'abc' },
 *     level: 'error'
 *   });
 *   throw error;
 * }
 */
export function captureError(
  error: unknown,
  options: ErrorCaptureOptions = {}
): string | undefined {
  if (!isSentryConfigured()) {
    return undefined;
  }

  // Set tags if provided
  if (options.tags) {
    Sentry.setTags(options.tags);
  }

  // Set context if provided
  if (options.context) {
    Sentry.setContext('additional', options.context);
  }

  // Set user if provided
  if (options.user) {
    Sentry.setUser(options.user);
  }

  // Capture exception with options
  const eventId = Sentry.captureException(error, {
    level: options.level || 'error',
    fingerprint: options.fingerprint,
  });

  return eventId;
}

/**
 * Capture a message (non-error event)
 *
 * @example
 * captureMessage('User reached API rate limit', {
 *   level: 'warning',
 *   tags: { endpoint: '/api/video/generate' },
 *   context: { userId: '123', limit: 10 }
 * });
 */
export function captureMessage(
  message: string,
  options: ErrorCaptureOptions = {}
): string | undefined {
  if (!isSentryConfigured()) {
    return undefined;
  }

  // Set tags if provided
  if (options.tags) {
    Sentry.setTags(options.tags);
  }

  // Set context if provided
  if (options.context) {
    Sentry.setContext('additional', options.context);
  }

  // Capture message with options
  const eventId = Sentry.captureMessage(message, {
    level: options.level || 'info',
    fingerprint: options.fingerprint,
  });

  return eventId;
}

/**
 * Set user context for error tracking
 *
 * Associates all future errors with this user until cleared.
 *
 * @example
 * setUserContext({
 *   id: 'user_123',
 *   email: 'user@example.com',
 *   subscription: 'premium'
 * });
 */
export function setUserContext(user: {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: unknown;
}): void {
  if (!isSentryConfigured()) {
    return;
  }

  Sentry.setUser(user);
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext(): void {
  if (!isSentryConfigured()) {
    return;
  }

  Sentry.setUser(null);
}

/**
 * Set custom tags for filtering
 *
 * @example
 * setTags({
 *   feature: 'video-generation',
 *   provider: 'fal',
 *   environment: 'production'
 * });
 */
export function setTags(tags: Record<string, string>): void {
  if (!isSentryConfigured()) {
    return;
  }

  Sentry.setTags(tags);
}

/**
 * Set custom context for additional metadata
 *
 * @example
 * setContext('video_generation', {
 *   prompt: 'A cat playing piano',
 *   duration: 5,
 *   aspectRatio: '16:9'
 * });
 */
export function setContext(key: string, context: Record<string, unknown>): void {
  if (!isSentryConfigured()) {
    return;
  }

  Sentry.setContext(key, context);
}

/**
 * Start a transaction for performance monitoring
 *
 * @example
 * const transaction = startTransaction({
 *   name: 'video_generation',
 *   op: 'ai.generate'
 * });
 *
 * try {
 *   await generateVideo();
 *   transaction.setStatus('ok');
 * } catch (error) {
 *   transaction.setStatus('error');
 *   throw error;
 * } finally {
 *   transaction.finish();
 * }
 */
export function startTransaction(options: {
  name: string;
  op: string;
  data?: Record<string, unknown>;
}): Sentry.Span | undefined {
  if (!isSentryConfigured()) {
    return undefined;
  }

  return Sentry.startSpan(
    {
      name: options.name,
      op: options.op,
      attributes: options.data as Record<string, string | number | boolean | undefined> || {},
    },
    (span): Sentry.Span => span
  );
}

/**
 * Wrap a function with error tracking
 *
 * Automatically captures and reports any errors thrown.
 *
 * @example
 * const safeGenerate = withErrorTracking(
 *   async (params) => {
 *     return await generateVideo(params);
 *   },
 *   {
 *     tags: { operation: 'video_generation' },
 *     context: { feature: 'ai-video' }
 *   }
 * );
 */
export function withErrorTracking<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: ErrorCaptureOptions = {}
): T {
  return (async (...args: unknown[]): Promise<unknown> => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error, options);
      throw error;
    }
  }) as T;
}

/**
 * Track API request for monitoring
 *
 * @example
 * trackAPIRequest({
 *   method: 'POST',
 *   endpoint: '/api/video/generate',
 *   status: 200,
 *   duration: 1234,
 *   userId: 'user_123'
 * });
 */
export function trackAPIRequest(data: {
  method: string;
  endpoint: string;
  status: number;
  duration: number;
  userId?: string;
  error?: string;
}): void {
  if (!isSentryConfigured()) {
    return;
  }

  addBreadcrumb({
    message: `${data.method} ${data.endpoint} - ${data.status}`,
    category: BreadcrumbCategory.API,
    level: data.status >= 500 ? 'error' : data.status >= 400 ? 'warning' : 'info',
    data: {
      method: data.method,
      endpoint: data.endpoint,
      status: data.status,
      duration: data.duration,
      userId: data.userId,
      error: data.error,
    },
  });
}

/**
 * Track user action for context
 *
 * @example
 * trackUserAction({
 *   action: 'generate_video',
 *   category: 'video',
 *   data: { prompt: 'A cat', duration: 5 }
 * });
 */
export function trackUserAction(data: {
  action: string;
  category?: BreadcrumbCategory | string;
  data?: Record<string, unknown>;
}): void {
  if (!isSentryConfigured()) {
    return;
  }

  addBreadcrumb({
    message: `User action: ${data.action}`,
    category: data.category || BreadcrumbCategory.UI,
    level: 'info',
    data: data.data,
  });
}

/**
 * Track navigation for context
 *
 * @example
 * trackNavigation({
 *   from: '/projects',
 *   to: '/editor',
 *   userId: 'user_123'
 * });
 */
export function trackNavigation(data: {
  from: string;
  to: string;
  userId?: string;
}): void {
  if (!isSentryConfigured()) {
    return;
  }

  addBreadcrumb({
    message: `Navigation: ${data.from} → ${data.to}`,
    category: BreadcrumbCategory.NAVIGATION,
    level: 'info',
    data,
  });
}

/**
 * Common error types for consistent tracking
 */
export const ErrorTypes = {
  VALIDATION: 'ValidationError',
  AUTHENTICATION: 'AuthenticationError',
  AUTHORIZATION: 'AuthorizationError',
  RATE_LIMIT: 'RateLimitError',
  API: 'APIError',
  DATABASE: 'DatabaseError',
  EXTERNAL_SERVICE: 'ExternalServiceError',
  NETWORK: 'NetworkError',
  TIMEOUT: 'TimeoutError',
  UNKNOWN: 'UnknownError',
} as const;

/**
 * Common operation tags for filtering
 */
export const OperationTags = {
  VIDEO_GENERATION: 'video_generation',
  IMAGE_GENERATION: 'image_generation',
  AUDIO_GENERATION: 'audio_generation',
  EXPORT: 'export',
  UPLOAD: 'upload',
  PAYMENT: 'payment',
  AUTH: 'auth',
  PROJECT_OPERATION: 'project_operation',
  TIMELINE_OPERATION: 'timeline_operation',
} as const;

/**
 * Export Sentry SDK for direct access if needed
 */
export { Sentry };
