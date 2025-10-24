/**
 * Web Vitals Tracking
 *
 * Monitors and reports Core Web Vitals metrics for performance analysis.
 * Integrates with the existing performance monitoring system.
 */

import { browserLogger } from './browserLogger';
import { recordPerformanceMetric, PerformanceCategory } from './performance';

/**
 * Web Vitals metrics
 */
export type WebVitalMetric = 'CLS' | 'FCP' | 'LCP' | 'TTFB' | 'INP';

/**
 * Metric data interface
 */
export interface Metric {
  id: string;
  name: WebVitalMetric;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
  navigationType?: string;
}

/**
 * Performance thresholds for Web Vitals
 * Based on Google's recommendations
 */
const THRESHOLDS: Record<WebVitalMetric, { good: number; poor: number }> = {
  // Cumulative Layout Shift
  CLS: { good: 0.1, poor: 0.25 },
  // First Contentful Paint
  FCP: { good: 1800, poor: 3000 },
  // Largest Contentful Paint
  LCP: { good: 2500, poor: 4000 },
  // Time to First Byte
  TTFB: { good: 800, poor: 1800 },
  // Interaction to Next Paint
  INP: { good: 200, poor: 500 },
};

/**
 * Report metric to analytics
 */
function reportMetric(metric: Metric): void {
  // Record in performance monitoring system
  recordPerformanceMetric(
    PerformanceCategory.COMPONENT_RENDER,
    `web-vital-${metric.name}`,
    metric.value,
    {
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
    }
  );

  // Log metric
  const logMethod = metric.rating === 'poor' ? 'warn' : 'info';
  browserLogger[logMethod](
    {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    },
    `Web Vital - ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`
  );

  // Send to analytics endpoint if available
  if (typeof window !== 'undefined' && 'navigator' in window && 'sendBeacon' in navigator) {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      delta: metric.delta,
      navigationType: metric.navigationType,
    });

    // Only send if analytics endpoint is configured
    const analyticsUrl = '/api/analytics/web-vitals';
    navigator.sendBeacon(analyticsUrl, body);
  }
}

/**
 * Initialize Web Vitals tracking
 * Dynamically imports web-vitals library only in browser
 */
export async function initWebVitals(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Dynamic import to reduce initial bundle size
    const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

    // Track all Core Web Vitals
    onCLS((metric) => reportMetric(metric as unknown as Metric));
    onFCP((metric) => reportMetric(metric as unknown as Metric));
    onLCP((metric) => reportMetric(metric as unknown as Metric));
    onTTFB((metric) => reportMetric(metric as unknown as Metric));
    onINP((metric) => reportMetric(metric as unknown as Metric));

    browserLogger.info('Web Vitals tracking initialized');
  } catch (error) {
    browserLogger.error({ error }, 'Failed to initialize Web Vitals tracking');
  }
}

/**
 * Get current Web Vitals performance budgets status
 */
export function getWebVitalsBudgetStatus(): {
  metric: WebVitalMetric;
  threshold: { good: number; poor: number };
  status: string;
}[] {
  return Object.entries(THRESHOLDS).map(([metric, threshold]) => ({
    metric: metric as WebVitalMetric,
    threshold,
    status: `Good: ≤${threshold.good}ms, Poor: >${threshold.poor}ms`,
  }));
}

/**
 * Performance observer for custom metrics
 */
export class CustomMetricsObserver {
  private observers: PerformanceObserver[] = [];

  /**
   * Observe long tasks (blocking operations)
   */
  observeLongTasks(callback: (entries: PerformanceEntry[]) => void): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ entryTypes: ['longtask'] });
      this.observers.push(observer);
    } catch (error) {
      browserLogger.warn({ error }, 'Long task observation not supported');
    }
  }

  /**
   * Observe layout shifts
   */
  observeLayoutShifts(callback: (entries: PerformanceEntry[]) => void): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      browserLogger.warn({ error }, 'Layout shift observation not supported');
    }
  }

  /**
   * Disconnect all observers
   */
  disconnect(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}
