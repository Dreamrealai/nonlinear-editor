/**
 * Performance Tracking Utilities
 *
 * High-level utilities for tracking browser performance metrics
 * for key user interactions and component rendering.
 *
 * Uses browser Performance API (performance.mark, performance.measure)
 * and sends metrics to Axiom via browserLogger.
 */

import { browserLogger } from '@/lib/browserLogger';
import { PerformanceCategory, recordPerformanceMetric } from '@/lib/performance';

/**
 * Performance operation types for categorization
 */
export type PerformanceOperationType =
  | 'timeline_render'
  | 'asset_upload'
  | 'export_start'
  | 'export_complete'
  | 'video_generation'
  | 'component_mount'
  | 'component_render'
  | 'api_request'
  | 'user_interaction';

/**
 * Additional metadata for performance tracking
 */
export interface PerformanceMetadata {
  userId?: string;
  projectId?: string;
  assetId?: string;
  component?: string;
  operation?: string;
  [key: string]: unknown;
}

/**
 * Track a browser performance mark and measure
 *
 * @param name - Name of the operation (e.g., 'timeline-render')
 * @param type - Type of operation for categorization
 * @param metadata - Additional context for the operation
 * @returns Object with end() method to complete measurement
 *
 * @example
 * const perf = trackPerformanceMark('timeline-render', 'timeline_render', {
 *   component: 'TimelineTracks',
 *   clipCount: 10
 * });
 * // ... perform operation
 * perf.end();
 */
export function trackPerformanceMark(
  name: string,
  type: PerformanceOperationType,
  metadata?: PerformanceMetadata
): { end: () => void } {
  if (typeof window === 'undefined' || !window.performance) {
    // Server-side or unsupported browser - return no-op
    return { end: (): void => {} };
  }

  const markName = `${name}-start`;
  const measureName = name;

  try {
    // Create performance mark for operation start
    performance.mark(markName);
  } catch (error) {
    browserLogger.warn({ error, name, type }, 'Failed to create performance mark');
    return { end: (): void => {} };
  }

  return {
    end: (): void => {
      try {
        // Create performance measure from mark to now
        const measure = performance.measure(measureName, markName);
        const duration = measure.duration;

        // Map operation type to performance category
        const category = mapOperationTypeToCategory(type);

        // Record metric in performance monitoring system
        recordPerformanceMetric(category, name, duration, {
          type,
          ...metadata,
        });

        // Log to Axiom with performance context
        browserLogger.info(
          {
            type: 'performance_metric',
            operation_type: type,
            operation_name: name,
            duration_ms: duration,
            timestamp: Date.now(),
            ...metadata,
          },
          `Performance: ${name} completed in ${duration.toFixed(2)}ms`
        );

        // Clean up performance marks to prevent memory bloat
        performance.clearMarks(markName);
        performance.clearMeasures(measureName);
      } catch (error) {
        browserLogger.warn({ error, name, type }, 'Failed to measure performance');
      }
    },
  };
}

/**
 * Measure the execution time of an async operation
 *
 * @param name - Name of the operation
 * @param type - Type of operation for categorization
 * @param fn - Async function to measure
 * @param metadata - Additional context for the operation
 * @returns Promise resolving to the function's result
 *
 * @example
 * const result = await measureOperation(
 *   'fetch-assets',
 *   'api_request',
 *   async () => {
 *     return await fetch('/api/assets');
 *   },
 *   { projectId: '123' }
 * );
 */
export async function measureOperation<T>(
  name: string,
  type: PerformanceOperationType,
  fn: () => Promise<T>,
  metadata?: PerformanceMetadata
): Promise<T> {
  const perf = trackPerformanceMark(name, type, metadata);

  try {
    const result = await fn();
    perf.end();
    return result;
  } catch (error) {
    // Still end the measurement even on error
    perf.end();

    // Log error with performance context
    browserLogger.error(
      {
        error,
        operation: name,
        type,
        ...metadata,
      },
      `Performance: ${name} failed`
    );

    throw error;
  }
}

/**
 * Track component render time
 *
 * @param componentName - Name of the component (e.g., 'TimelineTracks')
 * @param duration - Render duration in milliseconds
 * @param metadata - Additional context (e.g., prop counts)
 *
 * @example
 * useEffect(() => {
 *   const start = performance.now();
 *   return () => {
 *     const duration = performance.now() - start;
 *     trackRenderTime('TimelineTracks', duration, { clipCount: clips.length });
 *   };
 * }, [clips]);
 */
export function trackRenderTime(
  componentName: string,
  duration: number,
  metadata?: PerformanceMetadata
): void {
  // Record in performance monitoring system
  recordPerformanceMetric(PerformanceCategory.COMPONENT_RENDER, componentName, duration, metadata);

  // Log to Axiom
  browserLogger.info(
    {
      type: 'component_render',
      component: componentName,
      duration_ms: duration,
      timestamp: Date.now(),
      ...metadata,
    },
    `Component Render: ${componentName} took ${duration.toFixed(2)}ms`
  );
}

/**
 * React hook for measuring component mount and render performance
 *
 * @param componentName - Name of the component
 * @param metadata - Additional context
 * @returns Object with trackRender() method
 *
 * @example
 * const perf = usePerformanceTracking('TimelineTracks', { clipCount: clips.length });
 *
 * useEffect(() => {
 *   perf.trackRender();
 * }, [clips, perf]);
 */
export function usePerformanceTracking(
  componentName: string,
  metadata?: PerformanceMetadata
): {
  trackRender: () => void;
  trackMount: () => void;
} {
  // Track initial mount time
  const mountTime = typeof window !== 'undefined' ? performance.now() : 0;

  return {
    /**
     * Track component render duration
     * Call this in a useEffect that runs after render
     */
    trackRender: (): void => {
      if (typeof window === 'undefined') return;

      const duration = performance.now() - mountTime;
      trackRenderTime(componentName, duration, metadata);
    },

    /**
     * Track component mount completion
     * Call this in a useEffect with empty deps
     */
    trackMount: (): void => {
      if (typeof window === 'undefined') return;

      const duration = performance.now() - mountTime;
      recordPerformanceMetric(
        PerformanceCategory.COMPONENT_RENDER,
        `${componentName}-mount`,
        duration,
        metadata
      );

      browserLogger.info(
        {
          type: 'component_mount',
          component: componentName,
          duration_ms: duration,
          timestamp: Date.now(),
          ...metadata,
        },
        `Component Mount: ${componentName} mounted in ${duration.toFixed(2)}ms`
      );
    },
  };
}

/**
 * Map operation type to performance category
 */
function mapOperationTypeToCategory(type: PerformanceOperationType): PerformanceCategory {
  switch (type) {
    case 'timeline_render':
    case 'component_mount':
    case 'component_render':
      return PerformanceCategory.COMPONENT_RENDER;

    case 'asset_upload':
      return PerformanceCategory.ASSET_PROCESSING;

    case 'export_start':
    case 'export_complete':
      return PerformanceCategory.ASSET_PROCESSING;

    case 'video_generation':
      return PerformanceCategory.WAVEFORM_GENERATION;

    case 'api_request':
      return PerformanceCategory.API_REQUEST;

    case 'user_interaction':
      return PerformanceCategory.COMPONENT_RENDER;

    default:
      return PerformanceCategory.COMPONENT_RENDER;
  }
}

/**
 * Track long tasks (tasks that block the main thread for >50ms)
 * Uses PerformanceObserver to detect blocking operations
 *
 * @example
 * // Start tracking long tasks on app init
 * trackLongTasks();
 */
export function trackLongTasks(): () => void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return (): void => {};
  }

  try {
    const observer = new PerformanceObserver((list): void => {
      for (const entry of list.getEntries()) {
        browserLogger.warn(
          {
            type: 'long_task',
            duration_ms: entry.duration,
            start_time: entry.startTime,
            name: entry.name,
          },
          `Long Task detected: ${entry.duration.toFixed(2)}ms`
        );
      }
    });

    observer.observe({ entryTypes: ['longtask'] });

    // Return cleanup function
    return (): void => {
      observer.disconnect();
    };
  } catch (error) {
    browserLogger.debug({ error }, 'Long task observation not supported in this browser');
    return (): void => {};
  }
}
