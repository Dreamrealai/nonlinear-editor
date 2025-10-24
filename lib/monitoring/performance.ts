/**
 * Performance Monitoring Library
 *
 * Provides utilities for tracking application performance metrics:
 * - Timeline rendering performance
 * - Asset search latency
 * - Auto-save duration
 * - API response times
 * - Custom performance marks
 *
 * Integrates with:
 * - Axiom (via browserLogger)
 * - PostHog (via analyticsService)
 * - Browser Performance API
 *
 * Usage:
 * ```typescript
 * import { performanceMonitor } from '@/lib/monitoring/performance';
 *
 * // Track a performance metric
 * performanceMonitor.trackMetric('timeline_render', 234, {
 *   clipCount: 10,
 *   trackCount: 3
 * });
 *
 * // Track with automatic timing
 * const stopTimer = performanceMonitor.startTimer('asset_upload');
 * await uploadAsset();
 * stopTimer({ assetType: 'video', size: 1024000 });
 *
 * // Track API performance
 * await performanceMonitor.trackApiCall('/api/projects', async () => {
 *   return await fetch('/api/projects');
 * });
 * ```
 */

import { browserLogger } from '@/lib/browserLogger';
import { analyticsService } from '@/lib/services/analyticsService';

/**
 * Performance metric metadata
 */
export interface PerformanceMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Performance thresholds for alerting
 */
interface PerformanceThreshold {
  warning: number; // Milliseconds
  critical: number; // Milliseconds
}

/**
 * Default performance thresholds by metric type
 */
const PERFORMANCE_THRESHOLDS: Record<string, PerformanceThreshold> = {
  timeline_render: {
    warning: 1000, // 1 second
    critical: 3000, // 3 seconds
  },
  asset_search_latency: {
    warning: 500, // 500ms
    critical: 1000, // 1 second
  },
  auto_save_duration: {
    warning: 2000, // 2 seconds
    critical: 5000, // 5 seconds
  },
  api_request: {
    warning: 1000, // 1 second
    critical: 3000, // 3 seconds
  },
  asset_upload: {
    warning: 10000, // 10 seconds
    critical: 30000, // 30 seconds
  },
  video_export: {
    warning: 30000, // 30 seconds
    critical: 120000, // 2 minutes
  },
  page_load: {
    warning: 3000, // 3 seconds
    critical: 5000, // 5 seconds
  },
};

/**
 * Get rating for a performance metric
 */
function getPerformanceRating(metric: string, duration: number): 'good' | 'warning' | 'critical' {
  const threshold = PERFORMANCE_THRESHOLDS[metric];

  if (!threshold) {
    return 'good';
  }

  if (duration >= threshold.critical) {
    return 'critical';
  }

  if (duration >= threshold.warning) {
    return 'warning';
  }

  return 'good';
}

/**
 * Check if performance threshold is exceeded and alert should be sent
 */
function shouldAlert(metric: string, duration: number): boolean {
  const threshold = PERFORMANCE_THRESHOLDS[metric];

  if (!threshold) {
    return false;
  }

  return duration >= threshold.critical;
}

/**
 * Performance Monitor Class
 */
class PerformanceMonitor {
  private timers: Map<string, number> = new Map();
  private marks: Map<string, number> = new Map();

  /**
   * Track a performance metric
   *
   * @param metric - Metric name (use snake_case)
   * @param duration - Duration in milliseconds
   * @param metadata - Additional context
   *
   * @example
   * performanceMonitor.trackMetric('timeline_render', 234, {
   *   clipCount: 10,
   *   trackCount: 3
   * });
   */
  trackMetric(metric: string, duration: number, metadata?: PerformanceMetadata): void {
    const rating = getPerformanceRating(metric, duration);

    // Log to Axiom
    browserLogger.info(
      {
        type: 'performance_metric',
        metric,
        duration,
        rating,
        ...metadata,
      },
      `Performance: ${metric} = ${duration.toFixed(0)}ms (${rating})`
    );

    // Send to PostHog for analytics
    analyticsService.track('performance_metric', {
      metric,
      duration,
      rating,
      ...metadata,
    });

    // Alert if threshold exceeded
    if (shouldAlert(metric, duration)) {
      this.alertPerformanceIssue(metric, duration, metadata);
    }
  }

  /**
   * Start a timer for a metric
   *
   * @param metric - Metric name
   * @returns Function to stop the timer
   *
   * @example
   * const stopTimer = performanceMonitor.startTimer('asset_upload');
   * await uploadAsset();
   * stopTimer({ assetType: 'video' });
   */
  startTimer(metric: string): (metadata?: PerformanceMetadata) => void {
    const timerId = `${metric}_${Date.now()}_${Math.random()}`;
    this.timers.set(timerId, performance.now());

    return (metadata?: PerformanceMetadata): void => {
      const startTime = this.timers.get(timerId);

      if (!startTime) {
        browserLogger.warn({ metric, timerId }, 'Timer not found');
        return;
      }

      const duration = performance.now() - startTime;
      this.timers.delete(timerId);

      this.trackMetric(metric, duration, metadata);
    };
  }

  /**
   * Track API call performance
   *
   * @param endpoint - API endpoint
   * @param method - HTTP method
   * @param fn - Async function to execute
   * @returns Result of the async function
   *
   * @example
   * const data = await performanceMonitor.trackApiCall('/api/projects', 'GET', async () => {
   *   return await fetch('/api/projects');
   * });
   */
  async trackApiCall<T>(endpoint: string, method: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - start;

      this.trackMetric('api_request', duration, {
        endpoint,
        method,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;

      this.trackMetric('api_request', duration, {
        endpoint,
        method,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Create a performance mark (for use with browser Performance API)
   *
   * @param name - Mark name
   *
   * @example
   * performanceMonitor.mark('timeline_render_start');
   * // ... render timeline
   * performanceMonitor.measure('timeline_render', 'timeline_render_start');
   */
  mark(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
      this.marks.set(name, performance.now());
    }
  }

  /**
   * Measure duration between two marks
   *
   * @param metric - Metric name
   * @param startMark - Start mark name
   * @param endMark - End mark name (optional, defaults to now)
   * @param metadata - Additional context
   *
   * @example
   * performanceMonitor.mark('timeline_render_start');
   * // ... render timeline
   * performanceMonitor.measure('timeline_render', 'timeline_render_start');
   */
  measure(
    metric: string,
    startMark: string,
    endMark?: string,
    metadata?: PerformanceMetadata
  ): void {
    if (typeof performance === 'undefined') {
      return;
    }

    try {
      const measureName = `${metric}_measure`;

      if (endMark) {
        performance.measure(measureName, startMark, endMark);
      } else {
        performance.measure(measureName, startMark);
      }

      const measure = performance.getEntriesByName(measureName)[0];

      if (measure) {
        this.trackMetric(metric, measure.duration, metadata);
      }

      // Clean up marks and measures
      performance.clearMarks(startMark);
      if (endMark) {
        performance.clearMarks(endMark);
      }
      performance.clearMeasures(measureName);
    } catch (error) {
      browserLogger.warn({ error, metric, startMark, endMark }, 'Failed to measure performance');
    }
  }

  /**
   * Track timeline rendering performance
   *
   * @param duration - Render duration in milliseconds
   * @param clipCount - Number of clips
   * @param trackCount - Number of tracks
   */
  trackTimelineRender(duration: number, clipCount: number, trackCount: number): void {
    this.trackMetric('timeline_render', duration, {
      clipCount,
      trackCount,
      complexity: clipCount * trackCount,
    });
  }

  /**
   * Track asset search performance
   *
   * @param duration - Search duration in milliseconds
   * @param query - Search query
   * @param resultsCount - Number of results
   */
  trackAssetSearch(duration: number, query: string, resultsCount: number): void {
    this.trackMetric('asset_search_latency', duration, {
      queryLength: query.length,
      resultsCount,
      hasResults: resultsCount > 0,
    });
  }

  /**
   * Track auto-save performance
   *
   * @param duration - Save duration in milliseconds
   * @param projectSize - Size of project data in bytes
   * @param success - Whether save was successful
   */
  trackAutoSave(duration: number, projectSize: number, success: boolean): void {
    this.trackMetric('auto_save_duration', duration, {
      projectSize,
      projectSizeKB: Math.round(projectSize / 1024),
      success,
    });
  }

  /**
   * Track asset upload performance
   *
   * @param duration - Upload duration in milliseconds
   * @param assetType - Type of asset (video, audio, image)
   * @param fileSize - File size in bytes
   */
  trackAssetUpload(duration: number, assetType: string, fileSize: number): void {
    this.trackMetric('asset_upload', duration, {
      assetType,
      fileSize,
      fileSizeMB: Math.round(fileSize / 1024 / 1024),
      uploadSpeedMBps: fileSize / 1024 / 1024 / (duration / 1000),
    });
  }

  /**
   * Track video export performance
   *
   * @param duration - Export duration in milliseconds
   * @param videoDuration - Video duration in seconds
   * @param resolution - Video resolution
   * @param format - Export format
   */
  trackVideoExport(
    duration: number,
    videoDuration: number,
    resolution: string,
    format: string
  ): void {
    this.trackMetric('video_export', duration, {
      videoDuration,
      resolution,
      format,
      exportSpeedRatio: videoDuration / (duration / 1000),
    });
  }

  /**
   * Track page load performance
   *
   * Uses Navigation Timing API to get accurate page load metrics
   */
  trackPageLoad(): void {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    // Wait for page to fully load
    if (document.readyState !== 'complete') {
      window.addEventListener('load', (): void => this.trackPageLoad());
      return;
    }

    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (!perfData) {
      return;
    }

    // Track overall page load time
    const pageLoadTime = perfData.loadEventEnd - perfData.fetchStart;

    this.trackMetric('page_load', pageLoadTime, {
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
      domInteractive: perfData.domInteractive - perfData.fetchStart,
      dnsLookup: perfData.domainLookupEnd - perfData.domainLookupStart,
      tcpConnection: perfData.connectEnd - perfData.connectStart,
      requestTime: perfData.responseEnd - perfData.requestStart,
      responseTime: perfData.responseEnd - perfData.responseStart,
      domProcessing: perfData.domComplete - perfData.domInteractive,
    });

    // Track resource loading performance
    this.trackResourcePerformance();
  }

  /**
   * Track resource loading performance
   */
  private trackResourcePerformance(): void {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    // Group resources by type
    const resourcesByType: Record<string, number[]> = {};

    resources.forEach((resource): void => {
      const type = resource.initiatorType || 'other';
      const duration = resource.duration;

      if (!resourcesByType[type]) {
        resourcesByType[type] = [];
      }

      resourcesByType[type].push(duration);
    });

    // Track average load time by resource type
    Object.entries(resourcesByType).forEach(([type, durations]): void => {
      const avgDuration = durations.reduce((a, b): number => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      browserLogger.info(
        {
          type: 'resource_performance',
          resourceType: type,
          avgDuration,
          maxDuration,
          count: durations.length,
        },
        `Resource performance: ${type}`
      );
    });
  }

  /**
   * Alert when performance threshold is exceeded
   */
  private alertPerformanceIssue(
    metric: string,
    duration: number,
    metadata?: PerformanceMetadata
  ): void {
    const threshold = PERFORMANCE_THRESHOLDS[metric];

    browserLogger.warn(
      {
        type: 'performance_threshold_exceeded',
        metric,
        duration,
        threshold: threshold?.critical,
        ...metadata,
      },
      `Performance threshold exceeded: ${metric} = ${duration.toFixed(0)}ms`
    );

    // Track as event for alerting
    analyticsService.track('performance_threshold_exceeded', {
      metric,
      duration,
      threshold: threshold?.critical,
      ...metadata,
    });
  }

  /**
   * Get performance summary for current session
   */
  getPerformanceSummary(): {
    metrics: Record<string, { count: number; avg: number; max: number }>;
  } {
    // This would typically aggregate metrics stored in memory
    // For now, return empty summary (metrics are sent to Axiom/PostHog)
    return {
      metrics: {},
    };
  }

  /**
   * Clear all timers and marks
   */
  clear(): void {
    this.timers.clear();
    this.marks.clear();

    if (typeof performance !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
}

/**
 * Singleton performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Initialize performance monitoring
 *
 * Call this once on app startup (client-side only)
 */
export function initPerformanceMonitoring(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Track initial page load
  performanceMonitor.trackPageLoad();

  // Track navigation performance
  if ('PerformanceObserver' in window) {
    try {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list): void => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            performanceMonitor.trackMetric('page_navigation', navEntry.duration, {
              type: navEntry.type,
            });
          }
        }
      });

      navObserver.observe({ entryTypes: ['navigation'] });

      // Observe long tasks (tasks taking > 50ms)
      const longTaskObserver = new PerformanceObserver((list): void => {
        for (const entry of list.getEntries()) {
          browserLogger.warn(
            {
              type: 'long_task',
              duration: entry.duration,
              startTime: entry.startTime,
            },
            `Long task detected: ${entry.duration.toFixed(0)}ms`
          );
        }
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // PerformanceObserver not supported or error in setup
      browserLogger.debug({ error }, 'Failed to set up PerformanceObserver');
    }
  }
}

