/**
 * Sentry Error Tracking Service
 *
 * Provides centralized error tracking and monitoring using Sentry.
 * Integrates with existing browserLogger and serverLogger to capture errors,
 * add context, and send alerts.
 *
 * Features:
 * - Error capture with context and breadcrumbs
 * - User context tracking
 * - Performance monitoring
 * - Release tracking
 * - Custom error tags and metadata
 *
 * Usage:
 * ```typescript
 * import { sentryService } from '@/lib/services/sentryService';
 *
 * // Capture error with context
 * sentryService.captureError(error, {
 *   userId: '123',
 *   action: 'video_generation',
 *   metadata: { projectId: 'proj_123' }
 * });
 *
 * // Add breadcrumb for debugging
 * sentryService.addBreadcrumb({
 *   message: 'User clicked export button',
 *   category: 'user-action',
 *   level: 'info'
 * });
 *
 * // Track user context
 * sentryService.setUser({ id: '123', email: 'user@example.com' });
 * ```
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Error context for Sentry capture
 */
export interface ErrorContext {
  userId?: string;
  projectId?: string;
  assetId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  tags?: Record<string, string>;
}

/**
 * Breadcrumb data for debugging
 */
export interface BreadcrumbData {
  message: string;
  category?: string;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, unknown>;
}

/**
 * User context for Sentry
 */
export interface UserContext {
  id: string;
  email?: string;
  username?: string;
  ip_address?: string;
  subscription?: string;
}

/**
 * Check if Sentry is configured
 */
export function isSentryConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

/**
 * Sentry Service
 *
 * Provides methods for error tracking, breadcrumb logging, and user context.
 * All methods are no-ops if Sentry is not configured.
 */
class SentryService {
  /**
   * Capture an error with context
   *
   * @param error - Error object to capture
   * @param context - Additional context for debugging
   */
  captureError(error: Error | unknown, context?: ErrorContext): void {
    if (!isSentryConfigured()) {
      return;
    }

    Sentry.withScope((scope) => {
      // Set user context if provided
      if (context?.userId) {
        scope.setUser({ id: context.userId });
      }

      // Set custom tags
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      // Set action tag if provided
      if (context?.action) {
        scope.setTag('action', context.action);
      }

      // Add context data
      if (context?.projectId) {
        scope.setContext('project', { id: context.projectId });
      }

      if (context?.assetId) {
        scope.setContext('asset', { id: context.assetId });
      }

      if (context?.metadata) {
        scope.setContext('metadata', context.metadata);
      }

      // Capture the error
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        // Handle non-Error objects
        Sentry.captureException(new Error(String(error)));
      }
    });
  }

  /**
   * Capture a message (for non-error events)
   *
   * @param message - Message to capture
   * @param level - Severity level
   * @param context - Additional context
   */
  captureMessage(
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
    context?: ErrorContext
  ): void {
    if (!isSentryConfigured()) {
      return;
    }

    Sentry.withScope((scope) => {
      // Set level
      scope.setLevel(level);

      // Set user context if provided
      if (context?.userId) {
        scope.setUser({ id: context.userId });
      }

      // Set custom tags
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      // Add context data
      if (context?.metadata) {
        scope.setContext('metadata', context.metadata);
      }

      // Capture the message
      Sentry.captureMessage(message, level);
    });
  }

  /**
   * Add breadcrumb for debugging
   *
   * Breadcrumbs are logged events that help understand the user's journey
   * leading up to an error.
   *
   * @param breadcrumb - Breadcrumb data
   */
  addBreadcrumb(breadcrumb: BreadcrumbData): void {
    if (!isSentryConfigured()) {
      return;
    }

    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.category || 'custom',
      level: breadcrumb.level || 'info',
      data: breadcrumb.data,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Set user context
   *
   * Associates errors with a specific user for tracking and support.
   *
   * @param user - User context data
   */
  setUser(user: UserContext | null): void {
    if (!isSentryConfigured()) {
      return;
    }

    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
        ip_address: user.ip_address,
        subscription: user.subscription,
      });
    } else {
      // Clear user context
      Sentry.setUser(null);
    }
  }

  /**
   * Set custom tag
   *
   * @param key - Tag key
   * @param value - Tag value
   */
  setTag(key: string, value: string): void {
    if (!isSentryConfigured()) {
      return;
    }

    Sentry.setTag(key, value);
  }

  /**
   * Set custom context
   *
   * @param name - Context name
   * @param data - Context data
   */
  setContext(name: string, data: Record<string, unknown> | null): void {
    if (!isSentryConfigured()) {
      return;
    }

    Sentry.setContext(name, data);
  }

  /**
   * Start a performance span
   *
   * @param name - Span name
   * @param op - Operation type
   * @param callback - Function to execute within the span
   * @returns Result of the callback
   */
  startSpan<T>(name: string, op: string, callback: () => T): T {
    if (!isSentryConfigured()) {
      // Execute callback without tracing
      return callback();
    }

    return Sentry.startSpan(
      {
        name,
        op,
      },
      callback
    );
  }

  /**
   * Clear user and context
   *
   * Useful for logout scenarios
   */
  clearContext(): void {
    if (!isSentryConfigured()) {
      return;
    }

    Sentry.setUser(null);
    Sentry.setContext('user', null);
    Sentry.setContext('project', null);
    Sentry.setContext('asset', null);
    Sentry.setContext('metadata', null);
  }
}

/**
 * Singleton Sentry service instance
 */
export const sentryService = new SentryService();

/**
 * Export Sentry SDK for direct access if needed
 */
export { Sentry };
