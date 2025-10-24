/**
 * Browser-compatible logger that sends logs to the server for Axiom ingestion
 *
 * This logger works in client components and sends logs to /api/logs endpoint
 * which then forwards them to Axiom for aggregation and analysis.
 *
 * Features:
 * - Same interface as server logger for consistency
 * - Batching to reduce API calls (flushes every 5 seconds or 10 logs)
 * - Fallback to console in development
 * - Non-blocking async send
 * - Error serialization
 * - User context support
 *
 * Usage:
 * ```typescript
 * import { browserLogger } from '@/lib/browserLogger';
 *
 * browserLogger.info('User clicked button');
 * browserLogger.error({ error: err, userId: '123' }, 'Failed to save');
 *
 * // Create child logger with context
 * const pageLogger = browserLogger.child({ page: '/editor' });
 * pageLogger.info('Page loaded');
 * ```
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

type LogEntry = {
  level: LogLevel;
  timestamp: string;
  message: string;
  data?: Record<string, unknown>;
  userAgent?: string;
  url?: string;
  correlationId?: string; // For request tracing
};

const isDevelopment = process.env.NODE_ENV !== 'production';
const LOG_ENDPOINT = '/api/logs';
const BATCH_SIZE = 10;
const BATCH_INTERVAL_MS = 5000;

// Track if global handlers are installed (singleton)
let globalHandlersInstalled = false;

// Generate a unique session ID for tracking user sessions
const sessionId =
  typeof window !== 'undefined'
    ? `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    : null;

/**
 * Generate a correlation ID for request tracing
 */
function generateCorrelationId(): string {
  return `cor_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

class BrowserLogger {
  private queue: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private baseContext: Record<string, unknown> = {};
  private currentCorrelationId: string | null = null;

  constructor(baseContext: Record<string, unknown> = {}) {
    this.baseContext = baseContext;
    // Note: Global error handlers are set up at module level after singleton creation
  }

  /**
   * Set correlation ID for the current operation (e.g., API request)
   */
  setCorrelationId(correlationId: string): void {
    this.currentCorrelationId = correlationId;
  }

  /**
   * Clear correlation ID after operation completes
   */
  clearCorrelationId(): void {
    this.currentCorrelationId = null;
  }

  /**
   * Helper to format arguments for logging
   */
  private formatArgs(args: unknown[]): { message: string; data?: Record<string, unknown> } {
    if (args.length === 0) {
      return { message: '' };
    }

    if (args.length === 1) {
      const arg = args[0];
      // If it's an object (but not Error), use it as data
      if (typeof arg === 'object' && arg !== null && !(arg instanceof Error)) {
        return { message: '', data: this.serializeData(arg as Record<string, unknown>) };
      }
      // Otherwise treat as message
      return { message: String(arg) };
    }

    // Multiple args: last one is message, rest are context
    const lastArg = args[args.length - 1];
    const contextArgs = args.slice(0, -1);

    // If first arg is an object, use it as data
    if (typeof contextArgs[0] === 'object' && contextArgs[0] !== null) {
      return {
        message: String(lastArg),
        data: this.serializeData(contextArgs[0] as Record<string, unknown>),
      };
    }

    // Otherwise, wrap all context args
    return {
      message: String(lastArg),
      data: { args: contextArgs },
    };
  }

  /**
   * Serialize data for JSON transport (handle Errors, etc.)
   */
  private serializeData(data: Record<string, unknown>): Record<string, unknown> {
    const serialized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Error) {
        serialized[key] = {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      } else if (typeof value === 'object' && value !== null) {
        try {
          // Try to JSON serialize (will fail on circular refs)
          JSON.stringify(value);
          serialized[key] = value;
        } catch {
          serialized[key] = String(value);
        }
      } else {
        serialized[key] = value;
      }
    }

    return serialized;
  }

  /**
   * Add log entry to queue
   */
  private log(level: LogLevel, ...args: unknown[]) {
    const { message, data } = this.formatArgs(args);

    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      data: {
        ...this.baseContext,
        ...data,
        sessionId, // Add session tracking
      },
    };

    // Add browser context
    if (typeof window !== 'undefined') {
      entry.userAgent = window.navigator.userAgent;
      entry.url = window.location.href;
    }

    // Add correlation ID if set
    if (this.currentCorrelationId) {
      entry.correlationId = this.currentCorrelationId;
    }

    // In development, also log to console
    if (isDevelopment) {
      const consoleMethod = level === 'fatal' ? 'error' : level === 'trace' ? 'debug' : level;
      console[consoleMethod](`[${level.toUpperCase()}]`, message, data || '');
    }

    // Add to queue
    this.queue.push(entry);

    // Flush if batch size reached
    if (this.queue.length >= BATCH_SIZE) {
      this.flush();
    } else {
      // Schedule flush if not already scheduled
      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flush();
        }, BATCH_INTERVAL_MS);
      }
    }
  }

  /**
   * Flush queued logs to server
   */
  async flush(sync = false) {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.queue.length === 0) {
      return;
    }

    const logsToSend = [...this.queue];
    this.queue = [];

    const sendLogs = async () => {
      try {
        const response = await fetch(LOG_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logs: logsToSend }),
          // Use keepalive for synchronous flush on page unload
          keepalive: sync,
        });

        if (!response.ok) {
          // Re-queue failed logs (only in dev to avoid infinite loops)
          if (isDevelopment) {
            console.error('Failed to send logs to server:', response.statusText);
          }
        }
      } catch (error) {
        // Silently fail in production (logs are already in console in dev)
        if (isDevelopment) {
          console.error('Failed to send logs to server:', error);
        }
      }
    };

    if (sync) {
      // Synchronous send using sendBeacon as fallback
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ logs: logsToSend })], {
          type: 'application/json',
        });
        navigator.sendBeacon(LOG_ENDPOINT, blob);
      } else {
        // Fallback to fetch (may not complete)
        await sendLogs();
      }
    } else {
      // Async send (don't await to avoid blocking)
      sendLogs();
    }
  }

  /**
   * Log methods
   */
  trace(...args: unknown[]) {
    this.log('trace', ...args);
  }

  debug(...args: unknown[]) {
    this.log('debug', ...args);
  }

  info(...args: unknown[]) {
    this.log('info', ...args);
  }

  warn(...args: unknown[]) {
    this.log('warn', ...args);
  }

  error(...args: unknown[]) {
    this.log('error', ...args);
  }

  fatal(...args: unknown[]) {
    this.log('fatal', ...args);
  }

  /**
   * Create child logger with additional context
   */
  child(bindings: Record<string, unknown>): BrowserLogger {
    return new BrowserLogger({ ...this.baseContext, ...bindings });
  }
}

/**
 * Singleton browser logger instance
 */
export const browserLogger = new BrowserLogger();

/**
 * Set up global error handlers (must be after singleton creation)
 */
if (typeof window !== 'undefined' && !globalHandlersInstalled) {
  globalHandlersInstalled = true;

  // Flush logs on page unload
  window.addEventListener('beforeunload', () => {
    browserLogger.flush(true);
  });

  // Capture uncaught JavaScript errors
  window.addEventListener('error', (event) => {
    browserLogger.error(
      {
        error: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        },
        type: 'uncaught_error',
      },
      `Uncaught error: ${event.message}`
    );
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    // Skip AbortError from video play/pause (common and non-critical)
    if (event.reason?.name === 'AbortError' && event.reason?.message?.includes('play()')) {
      // Log as debug instead of error
      browserLogger.debug(
        {
          error: {
            name: event.reason.name,
            message: event.reason.message,
          },
          type: 'video_play_aborted',
        },
        'Video play interrupted (non-critical)'
      );
      return;
    }

    browserLogger.error(
      {
        error:
          event.reason instanceof Error
            ? {
                name: event.reason.name,
                message: event.reason.message,
                stack: event.reason.stack,
              }
            : { value: event.reason },
        type: 'unhandled_rejection',
      },
      `Unhandled promise rejection: ${event.reason?.message || event.reason}`
    );
  });

  // Intercept console.error and console.warn for third-party libraries
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.error = (...args: unknown[]) => {
    // Call original console.error
    originalConsoleError.apply(console, args);

    // Filter out known non-critical errors
    const message = String(args[0] || '');

    // Skip PixiJS deprecation warnings
    if (message.includes('PixiJS Deprecation Warning')) {
      browserLogger.debug({ message, source: 'pixi' }, 'PixiJS deprecation warning');
      return;
    }

    // Log to our logger
    browserLogger.error(
      {
        consoleArgs: args,
        source: 'console.error',
      },
      message
    );
  };

  console.warn = (...args: unknown[]) => {
    // Call original console.warn
    originalConsoleWarn.apply(console, args);

    const message = String(args[0] || '');

    // Filter out known non-critical warnings to reduce noise
    const ignoredPatterns = [
      'PixiJS', // PixiJS deprecation warnings
      'THREE.', // Three.js warnings
      'ResizeObserver loop', // Common browser warning
      'Chrome extensions', // Extension warnings
      'Download the React DevTools', // React DevTools suggestion
      'componentWillReceiveProps', // React lifecycle warnings (if using older deps)
      'findDOMNode is deprecated', // React DOM warnings
    ];

    // Skip if message matches any ignored pattern
    if (ignoredPatterns.some((pattern) => message.includes(pattern))) {
      // Log to debug instead for visibility if needed
      if (isDevelopment) {
        browserLogger.debug(
          { message, source: 'console.warn', filtered: true },
          'Filtered console warning'
        );
      }
      return;
    }

    // Log to our logger for non-filtered warnings
    browserLogger.warn(
      {
        consoleArgs: args,
        source: 'console.warn',
      },
      message
    );
  };
}

/**
 * Type export for compatibility with server logger
 */
export type Logger = BrowserLogger;

/**
 * Export correlation ID utilities for use in API calls
 */
export { generateCorrelationId };

/**
 * Initialize Web Vitals monitoring
 * Reports Core Web Vitals (LCP, FID, CLS, FCP, TTFB) to Axiom
 */
if (typeof window !== 'undefined') {
  // Define metric interface for type safety
  interface WebVitalMetric {
    value: number;
    rating: string;
    delta: number;
    id: string;
    name: string;
    navigationType?: string;
  }

  // Use dynamic import to avoid SSR issues
  import('web-vitals')
    .then(({ onCLS, onLCP, onFCP, onTTFB, onINP }) => {
      // Core Web Vitals
      onCLS((metric: WebVitalMetric) => {
        browserLogger.info(
          {
            type: 'web_vital',
            metric: 'CLS',
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
          },
          `Web Vital: CLS = ${metric.value.toFixed(4)} (${metric.rating})`
        );
      });

      onLCP((metric: WebVitalMetric) => {
        browserLogger.info(
          {
            type: 'web_vital',
            metric: 'LCP',
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
          },
          `Web Vital: LCP = ${metric.value.toFixed(2)}ms (${metric.rating})`
        );
      });

      onFCP((metric: WebVitalMetric) => {
        browserLogger.info(
          {
            type: 'web_vital',
            metric: 'FCP',
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
          },
          `Web Vital: FCP = ${metric.value.toFixed(2)}ms (${metric.rating})`
        );
      });

      onTTFB((metric: WebVitalMetric) => {
        browserLogger.info(
          {
            type: 'web_vital',
            metric: 'TTFB',
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
          },
          `Web Vital: TTFB = ${metric.value.toFixed(2)}ms (${metric.rating})`
        );
      });

      // Interaction to Next Paint (newer metric replacing FID)
      onINP((metric: WebVitalMetric) => {
        browserLogger.info(
          {
            type: 'web_vital',
            metric: 'INP',
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
          },
          `Web Vital: INP = ${metric.value.toFixed(2)}ms (${metric.rating})`
        );
      });
    })
    .catch((error) => {
      // Silently fail if web-vitals package not available
      if (isDevelopment) {
        console.warn('Web Vitals not available:', error);
      }
    });
}
