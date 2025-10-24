/**
 * Performance Monitoring Library
 *
 * Tracks Core Web Vitals and custom performance metrics using the Performance API.
 * Sends metrics to analytics for monitoring and alerting.
 *
 * Metrics tracked:
 * - Time to Interactive (TTI)
 * - First Contentful Paint (FCP)
 * - Largest Contentful Paint (LCP)
 * - Cumulative Layout Shift (CLS)
 * - First Input Delay (FID)
 * - Custom metrics (timeline render, asset load, etc.)
 */
'use client';

import { onCLS, onFCP, onFID, onLCP, onINP, onTTFB, type Metric } from 'web-vitals';

/**
 * Custom performance metric
 */
export interface CustomMetric {
  name: string;
  value: number;
  unit: 'ms' | 's' | 'count' | 'bytes';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitoringConfig {
  /** Enable performance monitoring */
  enabled?: boolean;
  /** Sample rate (0-1) */
  sampleRate?: number;
  /** Report custom metrics to analytics */
  reportToAnalytics?: boolean;
  /** Console logging for debugging */
  debug?: boolean;
}

/**
 * Performance metrics store
 */
class PerformanceMetricsStore {
  private metrics: Map<string, CustomMetric[]> = new Map();
  private config: PerformanceMonitoringConfig = {
    enabled: true,
    sampleRate: 1.0,
    reportToAnalytics: true,
    debug: false,
  };

  constructor(config?: PerformanceMonitoringConfig) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Record a custom metric
   */
  record(metric: CustomMetric): void {
    if (!this.config.enabled) return;

    // Apply sampling - default to 1.0 if undefined
    const sampleRate = this.config.sampleRate ?? 1.0;
    if (Math.random() > sampleRate) return;

    // Store metric
    const existing = this.metrics.get(metric.name) || [];
    existing.push(metric);
    this.metrics.set(metric.name, existing);

    // Debug logging
    if (this.config.debug) {
      console.log(`[Performance] ${metric.name}: ${metric.value}${metric.unit}`, metric.metadata);
    }

    // Report to analytics
    if (this.config.reportToAnalytics) {
      this.reportToAnalytics(metric);
    }
  }

  /**
   * Get all recorded metrics for a specific name
   */
  getMetrics(name: string): CustomMetric[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get statistics for a metric
   */
  getStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return null;

    const values = metrics.map((m): number => m.value).sort((a, b): number => a - b);
    const sum = values.reduce((a, b): number => a + b, 0);

    return {
      count: values.length,
      min: values[0]!,
      max: values[values.length - 1]!,
      avg: sum / values.length,
      p50: values[Math.floor(values.length * 0.5)]!,
      p95: values[Math.floor(values.length * 0.95)]!,
      p99: values[Math.floor(values.length * 0.99)]!,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Report metric to analytics
   */
  private reportToAnalytics(metric: CustomMetric): void {
    // PostHog integration
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('performance_metric', {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_unit: metric.unit,
        ...metric.metadata,
      });
    }
  }
}

/**
 * Global performance metrics store
 */
export const performanceStore = new PerformanceMetricsStore({
  enabled: typeof window !== 'undefined',
  sampleRate: 1.0,
  reportToAnalytics: true,
  debug: process.env.NODE_ENV === 'development',
});

/**
 * Initialize Core Web Vitals monitoring
 */
export function initWebVitalsMonitoring(): void {
  if (typeof window === 'undefined') return;

  // First Contentful Paint
  onFCP((metric: Metric): void => {
    performanceStore.record({
      name: 'web_vital_fcp',
      value: metric.value,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: {
        rating: metric.rating,
        navigationType: metric.navigationType,
      },
    });
  });

  // Largest Contentful Paint
  onLCP((metric: Metric): void => {
    performanceStore.record({
      name: 'web_vital_lcp',
      value: metric.value,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: {
        rating: metric.rating,
        navigationType: metric.navigationType,
      },
    });
  });

  // First Input Delay
  onFID((metric: Metric): void => {
    performanceStore.record({
      name: 'web_vital_fid',
      value: metric.value,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: {
        rating: metric.rating,
        navigationType: metric.navigationType,
      },
    });
  });

  // Cumulative Layout Shift
  onCLS((metric: Metric): void => {
    performanceStore.record({
      name: 'web_vital_cls',
      value: metric.value,
      unit: 'count',
      timestamp: Date.now(),
      metadata: {
        rating: metric.rating,
        navigationType: metric.navigationType,
      },
    });
  });

  // Interaction to Next Paint (replaces FID in newer browsers)
  onINP((metric: Metric): void => {
    performanceStore.record({
      name: 'web_vital_inp',
      value: metric.value,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: {
        rating: metric.rating,
        navigationType: metric.navigationType,
      },
    });
  });

  // Time to First Byte
  onTTFB((metric: Metric): void => {
    performanceStore.record({
      name: 'web_vital_ttfb',
      value: metric.value,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: {
        rating: metric.rating,
        navigationType: metric.navigationType,
      },
    });
  });
}

/**
 * Performance marker for measuring custom operations
 */
export class PerformanceMarker {
  private startTime: number;
  private name: string;
  private metadata?: Record<string, unknown>;

  constructor(name: string, metadata?: Record<string, unknown>) {
    this.name = name;
    this.metadata = metadata;
    this.startTime = performance.now();
  }

  /**
   * End the measurement and record the metric
   */
  end(): number {
    const endTime = performance.now();
    const duration = endTime - this.startTime;

    performanceStore.record({
      name: this.name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: this.metadata,
    });

    return duration;
  }
}

/**
 * Measure the performance of a function
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  const marker = new PerformanceMarker(name, metadata);
  try {
    return fn();
  } finally {
    marker.end();
  }
}

/**
 * Measure the performance of an async function
 */
export async function measurePerformanceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const marker = new PerformanceMarker(name, metadata);
  try {
    return await fn();
  } finally {
    marker.end();
  }
}

/**
 * Track timeline render performance
 */
export function trackTimelineRender(clipCount: number, duration: number): void {
  performanceStore.record({
    name: 'timeline_render',
    value: duration,
    unit: 'ms',
    timestamp: Date.now(),
    metadata: {
      clip_count: clipCount,
    },
  });
}

/**
 * Track asset load performance
 */
export function trackAssetLoad(assetType: string, duration: number, size?: number): void {
  performanceStore.record({
    name: 'asset_load',
    value: duration,
    unit: 'ms',
    timestamp: Date.now(),
    metadata: {
      asset_type: assetType,
      size_bytes: size,
    },
  });
}

/**
 * Track asset search performance
 */
export function trackAssetSearch(query: string, resultCount: number, duration: number): void {
  performanceStore.record({
    name: 'asset_search',
    value: duration,
    unit: 'ms',
    timestamp: Date.now(),
    metadata: {
      query_length: query.length,
      result_count: resultCount,
    },
  });
}

/**
 * Track minimap render performance
 */
export function trackMinimapRender(clipCount: number, duration: number): void {
  performanceStore.record({
    name: 'minimap_render',
    value: duration,
    unit: 'ms',
    timestamp: Date.now(),
    metadata: {
      clip_count: clipCount,
    },
  });
}

/**
 * Track onboarding performance
 */
export function trackOnboardingInit(stepCount: number, duration: number): void {
  performanceStore.record({
    name: 'onboarding_init',
    value: duration,
    unit: 'ms',
    timestamp: Date.now(),
    metadata: {
      step_count: stepCount,
    },
  });
}

/**
 * Track easter egg activation performance
 */
export function trackEasterEggActivation(eggId: string, duration: number): void {
  performanceStore.record({
    name: 'easter_egg_activation',
    value: duration,
    unit: 'ms',
    timestamp: Date.now(),
    metadata: {
      egg_id: eggId,
    },
  });
}

/**
 * Track rubber band selection performance
 */
export function trackRubberBandSelection(clipCount: number, selectedCount: number, duration: number): void {
  performanceStore.record({
    name: 'rubber_band_selection',
    value: duration,
    unit: 'ms',
    timestamp: Date.now(),
    metadata: {
      total_clips: clipCount,
      selected_clips: selectedCount,
    },
  });
}

/**
 * Track auto-save performance
 */
export function trackAutoSave(clipCount: number, duration: number, success: boolean): void {
  performanceStore.record({
    name: 'auto_save',
    value: duration,
    unit: 'ms',
    timestamp: Date.now(),
    metadata: {
      clip_count: clipCount,
      success,
    },
  });
}

/**
 * Get performance report
 */
export function getPerformanceReport(): {
  metrics: Map<string, ReturnType<typeof performanceStore.getStats>>;
  summary: {
    totalMetrics: number;
    slowestOperation: { name: string; value: number } | null;
  };
} {
  const metrics = new Map<string, ReturnType<typeof performanceStore.getStats>>();
  let slowestOperation: { name: string; value: number } | null = null;
  let totalMetrics = 0;

  performanceStore['metrics'].forEach((_, name): void => {
    const stats = performanceStore.getStats(name);
    if (stats) {
      metrics.set(name, stats);
      totalMetrics += stats.count;

      if (!slowestOperation || stats.max > slowestOperation.value) {
        slowestOperation = { name, value: stats.max };
      }
    }
  });

  return {
    metrics,
    summary: {
      totalMetrics,
      slowestOperation,
    },
  };
}

/**
 * Log performance report to console
 */
export function logPerformanceReport(): void {
  const report = getPerformanceReport();

  console.group('📊 Performance Report');
  console.log(`Total metrics recorded: ${report.summary.totalMetrics}`);

  if (report.summary.slowestOperation) {
    console.log(
      `Slowest operation: ${report.summary.slowestOperation.name} (${report.summary.slowestOperation.value.toFixed(2)}ms)`
    );
  }

  console.groupCollapsed('Detailed Metrics');
  report.metrics.forEach((stats, name): void => {
    if (stats) {
      console.group(name);
      console.log(`Count: ${stats.count}`);
      console.log(`Min: ${stats.min.toFixed(2)}ms`);
      console.log(`Avg: ${stats.avg.toFixed(2)}ms`);
      console.log(`Max: ${stats.max.toFixed(2)}ms`);
      console.log(`P95: ${stats.p95.toFixed(2)}ms`);
      console.log(`P99: ${stats.p99.toFixed(2)}ms`);
      console.groupEnd();
    }
  });
  console.groupEnd();
  console.groupEnd();
}

// Type augmentation for PostHog
declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}
