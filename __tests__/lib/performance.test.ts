/**
 * Tests for Performance Monitoring
 */

import {
  PerformanceCategory,
  recordPerformanceMetric,
  measurePerformance,
  createPerformanceTimer,
  getPerformanceStats,
  getAllPerformanceMetrics,
  clearPerformanceMetrics,
  exportPerformanceReport,
  browserPerformance,
} from '@/lib/performance';

// Mock browserLogger
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    warn: jest.fn(),
  },
}));

describe('Performance Monitoring', () => {
  beforeEach(() => {
    clearPerformanceMetrics();
    jest.clearAllMocks();
  });

  describe('recordPerformanceMetric', () => {
    it('should record a metric', () => {
      // Act
      recordPerformanceMetric(PerformanceCategory.COMPONENT_RENDER, 'TestComponent', 10, {
        props: 'test',
      });

      // Assert
      const metrics = getAllPerformanceMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        category: PerformanceCategory.COMPONENT_RENDER,
        name: 'TestComponent',
        duration: 10,
        metadata: { props: 'test' },
      });
    });

    it('should limit metrics to MAX_METRICS', () => {
      // Act
      for (let i = 0; i < 150; i++) {
        recordPerformanceMetric(PerformanceCategory.API_REQUEST, `Request${i}`, 100);
      }

      // Assert
      const metrics = getAllPerformanceMetrics();
      expect(metrics).toHaveLength(100);
    });

    it('should log warning for slow operations', () => {
      // Arrange
      const { browserLogger } = require('@/lib/browserLogger');

      // Act
      recordPerformanceMetric(
        PerformanceCategory.COMPONENT_RENDER,
        'SlowComponent',
        100 // Much higher than 16ms threshold
      );

      // Assert
      expect(browserLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          category: PerformanceCategory.COMPONENT_RENDER,
          name: 'SlowComponent',
          duration: 100,
        }),
        expect.stringContaining('Slow')
      );
    });

    it('should not log warning for fast operations', () => {
      // Arrange
      const { browserLogger } = require('@/lib/browserLogger');

      // Act
      recordPerformanceMetric(
        PerformanceCategory.COMPONENT_RENDER,
        'FastComponent',
        10 // Below 16ms threshold
      );

      // Assert
      expect(browserLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('measurePerformance', () => {
    it('should measure synchronous function', async () => {
      // Arrange
      const fn = () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      };

      // Act
      const result = await measurePerformance(
        PerformanceCategory.COMPONENT_RENDER,
        'TestFunction',
        fn
      );

      // Assert
      expect(result).toBe(499500);
      const metrics = getAllPerformanceMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('TestFunction');
      expect(metrics[0].duration).toBeGreaterThan(0);
    });

    it('should measure asynchronous function', async () => {
      // Arrange
      const fn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'done';
      };

      // Act
      const result = await measurePerformance(PerformanceCategory.API_REQUEST, 'AsyncFunction', fn);

      // Assert
      expect(result).toBe('done');
      const metrics = getAllPerformanceMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].duration).toBeGreaterThanOrEqual(10);
    });

    it('should record metric even when function throws', async () => {
      // Arrange
      const fn = () => {
        throw new Error('Test error');
      };

      // Act & Assert
      await expect(
        measurePerformance(PerformanceCategory.DATABASE_QUERY, 'FailingFunction', fn)
      ).rejects.toThrow('Test error');

      const metrics = getAllPerformanceMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].metadata).toEqual({ error: true });
    });
  });

  describe('createPerformanceTimer', () => {
    it('should measure time with manual timer', async () => {
      // Act
      const timer = createPerformanceTimer(PerformanceCategory.WAVEFORM_GENERATION, 'TimerTest');

      await new Promise((resolve) => setTimeout(resolve, 10));

      const duration = timer.end();

      // Assert
      expect(duration).toBeGreaterThanOrEqual(10);
      const metrics = getAllPerformanceMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].duration).toBe(duration);
    });

    it('should allow multiple timers simultaneously', () => {
      // Act
      const timer1 = createPerformanceTimer(PerformanceCategory.API_REQUEST, 'Request1');
      const timer2 = createPerformanceTimer(PerformanceCategory.API_REQUEST, 'Request2');

      timer1.end();
      timer2.end();

      // Assert
      const metrics = getAllPerformanceMetrics();
      expect(metrics).toHaveLength(2);
    });
  });

  describe('getPerformanceStats', () => {
    it('should calculate stats correctly', () => {
      // Arrange
      recordPerformanceMetric(PerformanceCategory.API_REQUEST, 'Request1', 100);
      recordPerformanceMetric(PerformanceCategory.API_REQUEST, 'Request2', 200);
      recordPerformanceMetric(PerformanceCategory.API_REQUEST, 'Request3', 300);
      recordPerformanceMetric(PerformanceCategory.API_REQUEST, 'Request4', 400);
      recordPerformanceMetric(PerformanceCategory.API_REQUEST, 'Request5', 500);

      // Act
      const stats = getPerformanceStats(PerformanceCategory.API_REQUEST);

      // Assert
      expect(stats).toMatchObject({
        count: 5,
        avg: 300,
        min: 100,
        max: 500,
        p50: 300,
      });
    });

    it('should return null for category with no metrics', () => {
      // Act
      const stats = getPerformanceStats(PerformanceCategory.WAVEFORM_GENERATION);

      // Assert
      expect(stats).toBeNull();
    });

    it('should count slow operations', () => {
      // Arrange
      recordPerformanceMetric(PerformanceCategory.API_REQUEST, 'Fast', 100);
      recordPerformanceMetric(PerformanceCategory.API_REQUEST, 'Slow1', 600);
      recordPerformanceMetric(PerformanceCategory.API_REQUEST, 'Slow2', 700);

      // Act
      const stats = getPerformanceStats(PerformanceCategory.API_REQUEST);

      // Assert
      expect(stats?.slowOperations).toBe(2);
    });
  });

  describe('exportPerformanceReport', () => {
    it('should export complete report', () => {
      // Arrange
      recordPerformanceMetric(PerformanceCategory.API_REQUEST, 'Request1', 100);
      recordPerformanceMetric(PerformanceCategory.COMPONENT_RENDER, 'Component1', 10);

      // Act
      const report = exportPerformanceReport();
      const parsed = JSON.parse(report);

      // Assert
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('metrics');
      expect(parsed).toHaveProperty('stats');
      expect(parsed.metrics).toHaveLength(2);
      expect(parsed.stats).toHaveProperty(PerformanceCategory.API_REQUEST);
      expect(parsed.stats).toHaveProperty(PerformanceCategory.COMPONENT_RENDER);
    });
  });

  describe('clearPerformanceMetrics', () => {
    it('should clear all metrics', () => {
      // Arrange
      recordPerformanceMetric(PerformanceCategory.API_REQUEST, 'Request1', 100);
      recordPerformanceMetric(PerformanceCategory.API_REQUEST, 'Request2', 200);

      // Act
      clearPerformanceMetrics();

      // Assert
      const metrics = getAllPerformanceMetrics();
      expect(metrics).toHaveLength(0);
    });
  });

  describe('browserPerformance', () => {
    describe('getNavigationTiming', () => {
      it('should return null when window is undefined', () => {
        // Arrange
        const originalWindow = global.window;
        (global as { window?: unknown }).window = undefined;

        // Act
        const timing = browserPerformance.getNavigationTiming();

        // Assert
        expect(timing).toBeNull();

        // Restore
        global.window = originalWindow;
      });

      it('should return null when performance is undefined', () => {
        // Arrange
        const originalPerformance = window.performance;
        delete (window as { performance?: unknown }).performance;

        // Act
        const timing = browserPerformance.getNavigationTiming();

        // Assert
        expect(timing).toBeNull();

        // Restore
        Object.defineProperty(window, 'performance', {
          value: originalPerformance,
          writable: true,
          configurable: true,
        });
      });
    });

    describe('getResourceTiming', () => {
      it('should return empty array when window is undefined', () => {
        // Arrange
        const originalWindow = global.window;
        (global as { window?: unknown }).window = undefined;

        // Act
        const resources = browserPerformance.getResourceTiming();

        // Assert
        expect(resources).toEqual([]);

        // Restore
        global.window = originalWindow;
      });
    });

    describe('getMemoryUsage', () => {
      it('should return null when window is undefined', () => {
        // Arrange
        const originalWindow = global.window;
        (global as { window?: unknown }).window = undefined;

        // Act
        const memory = browserPerformance.getMemoryUsage();

        // Assert
        expect(memory).toBeNull();

        // Restore
        global.window = originalWindow;
      });

      it('should return null when memory API is not available', () => {
        // Act
        const memory = browserPerformance.getMemoryUsage();

        // Assert
        expect(memory).toBeNull();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle metrics with zero duration', () => {
      // Act
      recordPerformanceMetric(PerformanceCategory.API_REQUEST, 'Instant', 0);

      // Assert
      const metrics = getAllPerformanceMetrics();
      expect(metrics[0].duration).toBe(0);
    });

    it('should handle negative durations gracefully', () => {
      // Act
      recordPerformanceMetric(PerformanceCategory.API_REQUEST, 'Negative', -10);

      // Assert
      const metrics = getAllPerformanceMetrics();
      expect(metrics[0].duration).toBe(-10);
    });

    it('should handle metrics without metadata', () => {
      // Act
      recordPerformanceMetric(PerformanceCategory.COMPONENT_RENDER, 'NoMetadata', 10);

      // Assert
      const metrics = getAllPerformanceMetrics();
      expect(metrics[0].metadata).toBeUndefined();
    });
  });
});
