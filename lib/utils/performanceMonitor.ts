/**
 * Performance monitoring utilities for timeline operations
 *
 * Provides tools to measure and log performance metrics
 * for timeline rendering, calculations, and state updates
 */

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private marks: Map<string, number> = new Map();
  private enabled = false;

  /**
   * Enable performance monitoring
   */
  enable(): void {
    this.enabled = true;
    console.log('[Performance] Monitoring enabled');
  }

  /**
   * Disable performance monitoring
   */
  disable(): void {
    this.enabled = false;
    this.clear();
  }

  /**
   * Start measuring an operation
   */
  mark(name: string): void {
    if (!this.enabled) return;
    this.marks.set(name, performance.now());
  }

  /**
   * Measure duration since mark and log it
   */
  measure(name: string, metadata?: Record<string, unknown>): number | null {
    if (!this.enabled) return null;

    const startTime = this.marks.get(name);
    if (startTime === undefined) {
      console.warn(`[Performance] No mark found for "${name}"`);
      return null;
    }

    const duration = performance.now() - startTime;
    const metric: PerformanceMetrics = {
      operation: name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);
    this.marks.delete(name);

    // Log slow operations (>16.67ms = below 60fps)
    if (duration > 16.67) {
      console.warn(
        `[Performance] Slow operation: ${name} took ${duration.toFixed(2)}ms`,
        metadata
      );
    }

    return duration;
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for a specific operation
   */
  getMetricsForOperation(operation: string): PerformanceMetrics[] {
    return this.metrics.filter((m) => m.operation === operation);
  }

  /**
   * Get average duration for an operation
   */
  getAverageDuration(operation: string): number {
    const metrics = this.getMetricsForOperation(operation);
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * Get statistics for an operation
   */
  getStats(operation: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    total: number;
  } {
    const metrics = this.getMetricsForOperation(operation);
    if (metrics.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, total: 0 };
    }

    const durations = metrics.map((m) => m.duration);
    const total = durations.reduce((sum, d) => sum + d, 0);

    return {
      count: metrics.length,
      avg: total / metrics.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      total,
    };
  }

  /**
   * Print performance report
   */
  report(): void {
    if (this.metrics.length === 0) {
      console.log('[Performance] No metrics recorded');
      return;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Performance Report');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get unique operations
    const operations = [...new Set(this.metrics.map((m) => m.operation))];

    operations.forEach((operation) => {
      const stats = this.getStats(operation);
      console.log(`${operation}:`);
      console.log(`  Count:   ${stats.count}`);
      console.log(`  Average: ${stats.avg.toFixed(2)}ms`);
      console.log(`  Min:     ${stats.min.toFixed(2)}ms`);
      console.log(`  Max:     ${stats.max.toFixed(2)}ms`);
      console.log(`  Total:   ${stats.total.toFixed(2)}ms`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience function for measuring async operations
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  performanceMonitor.mark(operation);
  try {
    const result = await fn();
    performanceMonitor.measure(operation, metadata);
    return result;
  } catch (error) {
    performanceMonitor.measure(operation, { ...metadata, error: true });
    throw error;
  }
}

// Convenience function for measuring sync operations
export function measureSync<T>(
  operation: string,
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  performanceMonitor.mark(operation);
  try {
    const result = fn();
    performanceMonitor.measure(operation, metadata);
    return result;
  } catch (error) {
    performanceMonitor.measure(operation, { ...metadata, error: true });
    throw error;
  }
}
