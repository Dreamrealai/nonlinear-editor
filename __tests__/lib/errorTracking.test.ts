/**
 * Tests for error tracking
 */

import {
  trackError,
  ErrorCategory,
  ErrorSeverity,
  withErrorTracking,
  trackPerformance,
  trackAction,
} from '@/lib/errorTracking';
import { browserLogger } from '@/lib/browserLogger';

// Mock the browserLogger
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Error Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('trackError', () => {
    it('should track Error objects', () => {
      const error = new Error('Test error');
      trackError(error);

      expect(browserLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ErrorCategory.UNKNOWN,
          severity: ErrorSeverity.MEDIUM,
          error: expect.objectContaining({
            name: 'Error',
            message: 'Test error',
            stack: expect.any(String),
          }),
        }),
        expect.stringContaining('Test error')
      );
    });

    it('should track string errors', () => {
      trackError('Something went wrong');

      expect(browserLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            name: 'Error',
            message: 'Something went wrong',
          }),
        }),
        expect.any(String)
      );
    });

    it('should track errors with custom category', () => {
      const error = new Error('API failed');
      trackError(error, { category: ErrorCategory.API });

      expect(browserLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ErrorCategory.API,
          tags: expect.arrayContaining([ErrorCategory.API]),
        }),
        expect.stringContaining('[API]')
      );
    });

    it('should use different log levels based on severity', () => {
      const error = new Error('Critical error');

      // Critical severity
      trackError(error, { severity: ErrorSeverity.CRITICAL });
      expect(browserLogger.fatal).toHaveBeenCalled();

      jest.clearAllMocks();

      // High severity
      trackError(error, { severity: ErrorSeverity.HIGH });
      expect(browserLogger.error).toHaveBeenCalled();

      jest.clearAllMocks();

      // Medium severity
      trackError(error, { severity: ErrorSeverity.MEDIUM });
      expect(browserLogger.warn).toHaveBeenCalled();

      jest.clearAllMocks();

      // Low severity
      trackError(error, { severity: ErrorSeverity.LOW });
      expect(browserLogger.info).toHaveBeenCalled();
    });

    it('should include user and project context', () => {
      const error = new Error('Context error');
      trackError(error, {
        userId: 'user123',
        projectId: 'project456',
        context: { operation: 'save' },
      });

      expect(browserLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          projectId: 'project456',
          operation: 'save',
        }),
        expect.any(String)
      );
    });

    it('should include custom tags', () => {
      const error = new Error('Tagged error');
      trackError(error, {
        tags: ['important', 'user-facing'],
      });

      expect(browserLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining(['important', 'user-facing', ErrorCategory.UNKNOWN]),
        }),
        expect.any(String)
      );
    });

    it('should normalize HTTP errors', () => {
      const httpError = {
        status: 404,
        statusText: 'Not Found',
      };

      trackError(httpError);

      expect(browserLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            name: 'HTTPError',
            message: 'Not Found',
            statusCode: 404,
          }),
        }),
        expect.any(String)
      );
    });

    it('should normalize object errors', () => {
      const objError = { code: 'ERR001', message: 'Custom error' };
      trackError(objError);

      expect(browserLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: JSON.stringify(objError),
            details: objError,
          }),
        }),
        expect.any(String)
      );
    });
  });

  describe('withErrorTracking', () => {
    it('should wrap async function and track errors', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Function error'));
      const wrappedFn = withErrorTracking(mockFn, {
        category: ErrorCategory.API,
      });

      await expect(wrappedFn('arg1', 'arg2')).rejects.toThrow('Function error');

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(browserLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ErrorCategory.API,
        }),
        expect.any(String)
      );
    });

    it('should not interfere with successful function calls', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = withErrorTracking(mockFn, {
        category: ErrorCategory.API,
      });

      const result = await wrappedFn('arg1');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledWith('arg1');
      expect(browserLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('trackPerformance', () => {
    it('should track performance metrics in browser', () => {
      // Mock window for this test
      const originalWindow = global.window;
      global.window = {} as Window & typeof globalThis;

      trackPerformance('render', 123.45, { component: 'Timeline' });

      expect(browserLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'performance_metric',
          metricName: 'render',
          duration: 123.45,
          durationMs: 123.45,
          component: 'Timeline',
        }),
        expect.stringContaining('Performance: render took 123.45ms')
      );

      // Restore window
      global.window = originalWindow;
    });

    // Skip non-browser test as Jest runs in jsdom which always has window
    it.skip('should not track performance in non-browser environment', () => {
      trackPerformance('render', 100);
    });
  });

  describe('trackAction', () => {
    it('should track user actions in browser', () => {
      // Mock window for this test
      const originalWindow = global.window;
      global.window = {} as Window & typeof globalThis;

      trackAction('click_export', { buttonId: 'export-btn' });

      expect(browserLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user_action',
          action: 'click_export',
          buttonId: 'export-btn',
        }),
        'User action: click_export'
      );

      // Restore window
      global.window = originalWindow;
    });

    // Skip non-browser test as Jest runs in jsdom which always has window
    it.skip('should not track actions in non-browser environment', () => {
      trackAction('click_export');
    });
  });
});
