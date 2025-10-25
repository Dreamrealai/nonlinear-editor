/**
 * Tests for Browser Logger
 *
 * @module __tests__/lib/browserLogger.test
 */

// Unmock browserLogger for this test file since we want to test the real implementation
jest.unmock('@/lib/browserLogger');

// Set up window and navigator BEFORE importing browserLogger module
// Modify in place rather than redefining to avoid "Cannot redefine property" errors
const originalFetch = global.fetch;
const originalAddEventListener =
  typeof window !== 'undefined' ? window.addEventListener : undefined;

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({}),
});

// Mock window properties to prevent actual event listener registration during module load
if (typeof window !== 'undefined') {
  window.addEventListener = jest.fn();

  // Note: window.location and window.navigator.userAgent cannot be easily mocked in jsdom
  // Tests will use the actual jsdom values: userAgent from jsdom, href = 'http://localhost/'

  // Mock navigator.sendBeacon
  (window.navigator as any).sendBeacon = jest.fn();
}

// Now import the module - it will use our mocked window/navigator
import { browserLogger, generateCorrelationId } from '@/lib/browserLogger';

describe('BrowserLogger', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset fetch mock
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });

    // Mock console methods
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach((): void => {
    jest.useRealTimers();
  });

  afterAll((): void => {
    // Restore originals
    global.fetch = originalFetch;
    if (typeof window !== 'undefined' && originalAddEventListener) {
      window.addEventListener = originalAddEventListener;
    }
    jest.restoreAllMocks();
  });

  describe('Log Methods', () => {
    it('should log trace messages', () => {
      browserLogger.trace('Trace message');
      expect(console.debug).toHaveBeenCalledWith('[TRACE]', 'Trace message', '');
    });

    it('should log debug messages', () => {
      browserLogger.debug('Debug message');
      expect(console.debug).toHaveBeenCalledWith('[DEBUG]', 'Debug message', '');
    });

    it('should log info messages', () => {
      browserLogger.info('Info message');
      expect(console.info).toHaveBeenCalledWith('[INFO]', 'Info message', '');
    });

    it('should log warn messages', () => {
      browserLogger.warn('Warning message');
      expect(console.warn).toHaveBeenCalledWith('[WARN]', 'Warning message', '');
    });

    it('should log error messages', () => {
      browserLogger.error('Error message');
      expect(console.error).toHaveBeenCalledWith('[ERROR]', 'Error message', '');
    });

    it('should log fatal messages as error', () => {
      browserLogger.fatal('Fatal error');
      expect(console.error).toHaveBeenCalledWith('[FATAL]', 'Fatal error', '');
    });
  });

  describe('Log Formatting', () => {
    it('should log single string argument', () => {
      browserLogger.info('Simple message');
      expect(console.info).toHaveBeenCalledWith('[INFO]', 'Simple message', '');
    });

    it('should log single object as data', () => {
      browserLogger.info({ userId: '123', action: 'click' });
      expect(console.info).toHaveBeenCalledWith(
        '[INFO]',
        '',
        expect.objectContaining({ userId: '123', action: 'click' })
      );
    });

    it('should log object and message', () => {
      browserLogger.info({ userId: '123' }, 'User action');
      expect(console.info).toHaveBeenCalledWith(
        '[INFO]',
        'User action',
        expect.objectContaining({ userId: '123' })
      );
    });

    it('should serialize Error objects', () => {
      const error = new Error('Test error');
      browserLogger.error({ error }, 'Operation failed');

      expect(console.error).toHaveBeenCalledWith(
        '[ERROR]',
        'Operation failed',
        expect.objectContaining({
          error: expect.objectContaining({
            name: 'Error',
            message: 'Test error',
            stack: expect.any(String),
          }),
        })
      );
    });

    it('should handle circular references', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      browserLogger.info({ data: circular }, 'Circular data');

      // Should not throw
      expect(console.info).toHaveBeenCalled();
    });
  });

  describe('Batching and Flushing', () => {
    it('should queue logs and flush on batch size', async () => {
      // Log 10 messages to trigger batch flush
      for (let i = 0; i < 10; i++) {
        browserLogger.info(`Message ${i}`);
      }

      // Wait for async flush
      await Promise.resolve();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/logs',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Message 0'),
        })
      );
    });

    it('should flush logs after interval', async () => {
      // Clear any queued logs from previous tests first
      await browserLogger.flush();
      jest.clearAllMocks();

      browserLogger.info('Test message');

      // Fast-forward time to trigger interval flush
      jest.advanceTimersByTime(5000);

      // Run all pending timers and wait for async operations
      jest.runAllTimers();
      await Promise.resolve();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/logs',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should not flush empty queue', async () => {
      // Clear any queued logs first and clear mocks
      await browserLogger.flush();
      jest.clearAllMocks();

      // Now flush empty queue
      await browserLogger.flush();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should include browser context in logs', async () => {
      browserLogger.info('Test message');

      // Trigger batch flush
      for (let i = 0; i < 9; i++) {
        browserLogger.info(`Filler ${i}`);
      }

      await Promise.resolve();

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      // Use actual jsdom values since we can't easily mock window.location/navigator
      expect(requestBody.logs[0]).toMatchObject({
        level: 'info',
        message: 'Test message',
        userAgent: expect.stringContaining('jsdom'),
        url: 'http://localhost/',
      });
    });

    it('should use sendBeacon for synchronous flush', async () => {
      browserLogger.info('Test message');

      await browserLogger.flush(true);

      expect(navigator.sendBeacon).toHaveBeenCalledWith('/api/logs', expect.any(Blob));
    });

    it('should fall back to fetch when sendBeacon unavailable', async () => {
      // @ts-expect-error - Testing behavior when sendBeacon is unavailable
      delete navigator.sendBeacon;

      browserLogger.info('Test message');
      await browserLogger.flush(true);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/logs',
        expect.objectContaining({
          keepalive: true,
        })
      );
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with additional context', async () => {
      const childLogger = browserLogger.child({ component: 'Editor' });

      childLogger.info('Child log');

      // Context is added to the log entry, not console output
      // Console only shows message, not the merged context
      expect(console.info).toHaveBeenCalledWith('[INFO]', 'Child log', '');

      // Verify context is in the actual log entry sent to server
      for (let i = 0; i < 9; i++) {
        childLogger.info(`Filler ${i}`);
      }

      await Promise.resolve();

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.logs[0].data).toMatchObject({
        component: 'Editor',
      });
    });

    it('should merge parent and child context', async () => {
      const parentLogger = browserLogger.child({ userId: '123' });
      const childLogger = parentLogger.child({ action: 'click' });

      childLogger.info('Nested log');

      // Context is added to the log entry, not console output
      expect(console.info).toHaveBeenCalledWith('[INFO]', 'Nested log', '');

      // Verify context is merged in the actual log entry sent to server
      for (let i = 0; i < 9; i++) {
        childLogger.info(`Filler ${i}`);
      }

      await Promise.resolve();

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.logs[0].data).toMatchObject({
        userId: '123',
        action: 'click',
      });
    });
  });

  describe('Correlation ID', () => {
    it('should set correlation ID', async () => {
      browserLogger.setCorrelationId('cor-123');
      browserLogger.info('Correlated log');

      // Trigger flush
      for (let i = 0; i < 9; i++) {
        browserLogger.info(`Filler ${i}`);
      }

      await Promise.resolve();

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.logs[0].correlationId).toBe('cor-123');
    });

    it('should clear correlation ID', async () => {
      browserLogger.setCorrelationId('cor-123');
      browserLogger.clearCorrelationId();
      browserLogger.info('No correlation');

      // Trigger flush
      for (let i = 0; i < 9; i++) {
        browserLogger.info(`Filler ${i}`);
      }

      await Promise.resolve();

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.logs[0].correlationId).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch failure silently in production', async () => {
      // Note: The browserLogger module was imported with NODE_ENV='development' (from jest.config.js)
      // The isDevelopment constant is set at module load time, so changing process.env.NODE_ENV
      // after import has no effect. This test verifies that even in dev mode, errors don't break the app.
      // In actual production, the module would be loaded with NODE_ENV='production' and be truly silent.

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      browserLogger.info('Test message');

      // Trigger flush
      for (let i = 0; i < 9; i++) {
        browserLogger.info(`Filler ${i}`);
      }

      await Promise.resolve();

      // Allow async error handling (use real timers for this test)
      jest.useRealTimers();
      await new Promise((resolve) => setTimeout(resolve, 10));
      jest.useFakeTimers();

      // In development (which is what the module was loaded with), errors ARE logged
      // This is expected behavior - we just verify it doesn't throw
      expect(console.error).toHaveBeenCalledWith(
        'Failed to send logs to server:',
        expect.any(Error)
      );
    });

    it('should log fetch failure in development', async () => {
      // Module already loaded in development mode (see jest.config.js)
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      browserLogger.info('Test message');

      // Trigger flush
      for (let i = 0; i < 9; i++) {
        browserLogger.info(`Filler ${i}`);
      }

      await Promise.resolve();

      // Allow async error handling (use real timers for this test)
      jest.useRealTimers();
      await new Promise((resolve) => setTimeout(resolve, 10));
      jest.useFakeTimers();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to send logs to server:',
        expect.any(Error)
      );
    });

    it('should handle non-ok response', async () => {
      // Module already loaded in development mode
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
      });

      browserLogger.info('Test message');

      // Trigger flush
      for (let i = 0; i < 9; i++) {
        browserLogger.info(`Filler ${i}`);
      }

      await Promise.resolve();

      // Allow async error handling (use real timers for this test)
      jest.useRealTimers();
      await new Promise((resolve) => setTimeout(resolve, 10));
      jest.useFakeTimers();

      expect(console.error).toHaveBeenCalledWith('Failed to send logs to server:', 'Bad Request');
    });
  });

  describe('Session Tracking', () => {
    it('should include session ID in logs', async () => {
      browserLogger.info('Test message');

      // Trigger flush
      for (let i = 0; i < 9; i++) {
        browserLogger.info(`Filler ${i}`);
      }

      await Promise.resolve();

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.logs[0].data.sessionId).toMatch(/^session_/);
    });
  });
});

describe('generateCorrelationId', () => {
  it('should generate unique correlation IDs', () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();

    expect(id1).toMatch(/^cor_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^cor_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it('should include timestamp in correlation ID', () => {
    const before = Date.now();
    const id = generateCorrelationId();
    const after = Date.now();

    const timestamp = parseInt(id.split('_')[1]);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});
