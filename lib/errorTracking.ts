/**
 * Centralized error tracking service using Axiom
 *
 * Provides consistent error reporting across the application:
 * - Client-side errors via browserLogger
 * - Server-side errors via serverLogger
 * - Error context enrichment
 * - Error classification
 *
 * Usage:
 * ```typescript
 * import { trackError, ErrorCategory } from '@/lib/errorTracking';
 *
 * try {
 *   await someOperation();
 * } catch (error) {
 *   trackError(error, {
 *     category: ErrorCategory.API,
 *     context: { userId: '123', operation: 'saveProject' },
 *   });
 *   throw error; // Re-throw if needed
 * }
 * ```
 */

import { browserLogger } from './browserLogger';

export enum ErrorCategory {
  /** Client-side errors (React, browser APIs) */
  CLIENT = 'client',
  /** API route errors */
  API = 'api',
  /** External service errors (Google, FAL, ElevenLabs, etc.) */
  EXTERNAL_SERVICE = 'external_service',
  /** Database/Supabase errors */
  DATABASE = 'database',
  /** Authentication/authorization errors */
  AUTH = 'auth',
  /** Validation errors */
  VALIDATION = 'validation',
  /** Network/timeout errors */
  NETWORK = 'network',
  /** Unknown/uncategorized errors */
  UNKNOWN = 'unknown',
}

export enum ErrorSeverity {
  /** Critical errors that break core functionality */
  CRITICAL = 'critical',
  /** Errors that impact user experience */
  HIGH = 'high',
  /** Errors that are recoverable */
  MEDIUM = 'medium',
  /** Minor errors, warnings */
  LOW = 'low',
}

export interface ErrorContext {
  /** Error category for classification */
  category?: ErrorCategory;
  /** Error severity level */
  severity?: ErrorSeverity;
  /** User ID if available */
  userId?: string;
  /** Project ID if relevant */
  projectId?: string;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** Tags for filtering/grouping */
  tags?: string[];
}

/**
 * Track an error to Axiom with context
 */
export function trackError(
  error: unknown,
  options: ErrorContext = {}
): void {
  const {
    category = ErrorCategory.UNKNOWN,
    severity = ErrorSeverity.MEDIUM,
    userId,
    projectId,
    context = {},
    tags = [],
  } = options;

  // Normalize error object
  const errorObj = normalizeError(error);

  // Build enriched error context
  const enrichedContext = {
    ...context,
    category,
    severity,
    userId,
    projectId,
    tags: [...tags, category],
    error: errorObj,
    timestamp: new Date().toISOString(),
  };

  // Log based on severity
  const message = `[${category.toUpperCase()}] ${errorObj.message}`;

  if (severity === ErrorSeverity.CRITICAL) {
    browserLogger.fatal(enrichedContext, message);
  } else if (severity === ErrorSeverity.HIGH) {
    browserLogger.error(enrichedContext, message);
  } else if (severity === ErrorSeverity.MEDIUM) {
    browserLogger.warn(enrichedContext, message);
  } else {
    browserLogger.info(enrichedContext, message);
  }
}

/**
 * Normalize various error types to a consistent structure
 */
function normalizeError(error: unknown): {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;
  details?: unknown;
} {
  // Standard Error object
  if (error instanceof Error) {
    const errorWithExtras = error as Error & { code?: string; statusCode?: number };
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      // Include additional properties if they exist
      code: errorWithExtras.code,
      statusCode: errorWithExtras.statusCode,
    };
  }

  // HTTP Response errors
  if (error && typeof error === 'object' && 'status' in error) {
    const httpError = error as { status?: number; statusText?: string };
    return {
      name: 'HTTPError',
      message: httpError.statusText || 'HTTP request failed',
      statusCode: httpError.status,
      details: error,
    };
  }

  // String errors
  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
    };
  }

  // Object errors
  if (error && typeof error === 'object') {
    return {
      name: 'Error',
      message: JSON.stringify(error),
      details: error,
    };
  }

  // Unknown error type
  return {
    name: 'UnknownError',
    message: String(error),
    details: error,
  };
}

/**
 * Create an error tracking wrapper for async functions
 *
 * @example
 * const safeFetch = withErrorTracking(
 *   async (url: string) => {
 *     const res = await fetch(url);
 *     return res.json();
 *   },
 *   { category: ErrorCategory.NETWORK }
 * );
 */
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  errorContext: ErrorContext
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      trackError(error, errorContext);
      throw error;
    }
  }) as T;
}

/**
 * Browser-only: Track performance metrics
 */
export function trackPerformance(
  metricName: string,
  duration: number,
  context: Record<string, unknown> = {}
): void {
  if (typeof window === 'undefined') return;

  browserLogger.info(
    {
      ...context,
      type: 'performance_metric',
      metricName,
      duration,
      durationMs: duration,
    },
    `Performance: ${metricName} took ${duration.toFixed(2)}ms`
  );
}

/**
 * Browser-only: Track user actions for analytics
 */
export function trackAction(
  action: string,
  context: Record<string, unknown> = {}
): void {
  if (typeof window === 'undefined') return;

  browserLogger.info(
    {
      ...context,
      type: 'user_action',
      action,
    },
    `User action: ${action}`
  );
}
