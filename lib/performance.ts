/**
 * Performance Monitoring Utilities
 *
 * Provides tools for tracking and reporting component render performance,
 * database query times, and other performance metrics.
 */

import { browserLogger } from './browserLogger';

/**
 * Performance metric categories
 */
export enum PerformanceCategory {
  COMPONENT_RENDER = 'component_render',
  DATABASE_QUERY = 'database_query',
  API_REQUEST = 'api_request',
  ASSET_PROCESSING = 'asset_processing',
  WAVEFORM_GENERATION = 'waveform_generation',
}

/**
 * Performance metric data
 */
interface PerformanceMetric {
  category: PerformanceCategory;
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * In-memory performance metrics store (last 100 metrics)
 */
const performanceMetrics: PerformanceMetric[] = [];
const MAX_METRICS = 100;

/**
 * Slow operation thresholds (milliseconds)
 */
const SLOW_THRESHOLDS: Record<PerformanceCategory, number> = {
  [PerformanceCategory.COMPONENT_RENDER]: 16, // 60fps = 16ms per frame
  [PerformanceCategory.DATABASE_QUERY]: 100,
  [PerformanceCategory.API_REQUEST]: 500,
  [PerformanceCategory.ASSET_PROCESSING]: 1000,
  [PerformanceCategory.WAVEFORM_GENERATION]: 2000,
};

/**
 * Record a performance metric
 */
export function recordPerformanceMetric(
  category: PerformanceCategory,
  name: string,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  const metric: PerformanceMetric = {
    category,
    name,
    duration,
    timestamp: Date.now(),
    metadata,
  };

  performanceMetrics.push(metric);

  // Keep only last MAX_METRICS
  if (performanceMetrics.length > MAX_METRICS) {
    performanceMetrics.shift();
  }

  // Log slow operations
  const threshold = SLOW_THRESHOLDS[category];
  if (duration > threshold) {
    browserLogger.warn(
      {
        category,
        name,
        duration,
        threshold,
        metadata,
      },
      `Slow ${category}: ${name} took ${duration}ms (threshold: ${threshold}ms)`
    );
  }
}

/**
 * Measure the execution time of a function
 */
export async function measurePerformance<T>(
  category: PerformanceCategory,
  name: string,
  fn: () => Promise<T> | T,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;
    recordPerformanceMetric(category, name, duration, metadata);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    recordPerformanceMetric(category, name, duration, {
      ...metadata,
      error: true,
    });
    throw error;
  }
}

/**
 * Create a performance timer for manual measurement
 */
export function createPerformanceTimer(
  category: PerformanceCategory,
  name: string,
  metadata?: Record<string, unknown>
) {
  const start = performance.now();

  return {
    end: () => {
      const duration = performance.now() - start;
      recordPerformanceMetric(category, name, duration, metadata);
      return duration;
    },
  };
}

/**
 * Get performance statistics for a category
 */
export function getPerformanceStats(category: PerformanceCategory) {
  const categoryMetrics = performanceMetrics.filter((m) => m.category === category);

  if (categoryMetrics.length === 0) {
    return null;
  }

  const durations = categoryMetrics.map((m) => m.duration);
  const sum = durations.reduce((a, b) => a + b, 0);
  const avg = sum / durations.length;
  const min = Math.min(...durations);
  const max = Math.max(...durations);

  // Calculate percentiles
  const sorted = durations.slice().sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return {
    count: categoryMetrics.length,
    avg,
    min,
    max,
    p50,
    p90,
    p95,
    p99,
    threshold: SLOW_THRESHOLDS[category],
    slowOperations: categoryMetrics.filter((m) => m.duration > SLOW_THRESHOLDS[category]).length,
  };
}

/**
 * Get all performance metrics
 */
export function getAllPerformanceMetrics(): PerformanceMetric[] {
  return [...performanceMetrics];
}

/**
 * Clear all performance metrics
 */
export function clearPerformanceMetrics(): void {
  performanceMetrics.length = 0;
}

/**
 * Export performance report
 */
export function exportPerformanceReport(): string {
  const report = {
    timestamp: new Date().toISOString(),
    metrics: performanceMetrics,
    stats: Object.values(PerformanceCategory).reduce(
      (acc, category) => {
        const stats = getPerformanceStats(category);
        if (stats) {
          acc[category] = stats;
        }
        return acc;
      },
      {} as Record<string, ReturnType<typeof getPerformanceStats>>
    ),
  };

  return JSON.stringify(report, null, 2);
}

/**
 * React hook for measuring component render performance
 */
/**
 * Hook for measuring render performance
 * Note: This is a placeholder that should be implemented in a .tsx file
 * @deprecated Use measureComponentRender instead
 */
export function useRenderPerformance() {
  // Placeholder - actual implementation requires React hooks in a .tsx file
  return;
}

/**
 * HOC for measuring component render performance
 * Note: This is a placeholder implementation that requires proper React integration
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  // Return the component as-is in the current implementation
  // Full implementation would require this file to be .tsx
  return Component;
}

/**
 * Browser performance API utilities
 */
export const browserPerformance = {
  /**
   * Get navigation timing metrics
   */
  getNavigationTiming: () => {
    if (typeof window === 'undefined' || !window.performance) {
      return null;
    }

    const timing = window.performance.timing;
    return {
      // Page load times
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      domInteractive: timing.domInteractive - timing.navigationStart,
      domComplete: timing.domComplete - timing.navigationStart,
      loadComplete: timing.loadEventEnd - timing.navigationStart,

      // Network times
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,

      // Processing times
      domProcessing: timing.domComplete - timing.domLoading,
      rendering: timing.loadEventEnd - timing.domContentLoadedEventEnd,
    };
  },

  /**
   * Get resource timing metrics
   */
  getResourceTiming: () => {
    if (typeof window === 'undefined' || !window.performance) {
      return [];
    }

    return window.performance.getEntriesByType('resource').map((entry) => ({
      name: (entry as PerformanceResourceTiming).name,
      duration: entry.duration,
      size: (entry as PerformanceResourceTiming).transferSize,
      type: (entry as PerformanceResourceTiming).initiatorType,
    }));
  },

  /**
   * Get memory usage (Chrome only)
   */
  getMemoryUsage: () => {
    if (typeof window === 'undefined') {
      return null;
    }

    const memory = (
      window.performance as unknown as {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
      }
    ).memory;
    if (!memory) {
      return null;
    }

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedPercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  },
};
