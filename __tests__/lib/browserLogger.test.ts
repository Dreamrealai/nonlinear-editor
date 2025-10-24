/**
 * Tests for Browser Logger
 *
 * @module __tests__/lib/browserLogger.test
 */

import { browserLogger, generateCorrelationId } from '@/lib/browserLogger';

describe('BrowserLogger', () => {
  const originalWindow = global.window;
  const originalNavigator = global.navigator;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock window
    Object.defineProperty(global, 'window', {
      value: {
        location: { href: 'http://localhost:3000/test' },
        navigator: { userAgent: 'Test Browser' },
        addEventListener: jest.fn(),
      },
      writable: true,
      configurable: true,
    });

    // Mock navigator
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Test Browser',
        sendBeacon: jest.fn(),
      },
      writable: true,
      configurable: true,
    });

    // Mock fetch
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

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    global.window = originalWindow;
    global.navigator = originalNavigator;
    global.fetch = originalFetch;
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
      browserLogger.info('Test message');

      // Fast-forward time to trigger interval flush
      jest.advanceTimersByTime(5000);

      // Wait for async flush
      await Promise.resolve();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/logs',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should not flush empty queue', async () => {
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

      expect(requestBody.logs[0]).toMatchObject({
        level: 'info',
        message: 'Test message',
        userAgent: 'Test Browser',
        url: 'http://localhost:3000/test',
      });
    });

    it('should use sendBeacon for synchronous flush', async () => {
      browserLogger.info('Test message');

      await browserLogger.flush(true);

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        '/api/logs',
        expect.any(Blob)
      );
    });

    it('should fall back to fetch when sendBeacon unavailable', async () => {
      // @ts-ignore
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
    it('should create child logger with additional context', () => {
      const childLogger = browserLogger.child({ component: 'Editor' });

      childLogger.info('Child log');

      expect(console.info).toHaveBeenCalledWith(
        '[INFO]',
        'Child log',
        expect.objectContaining({ component: 'Editor' })
      );
    });

    it('should merge parent and child context', () => {
      const parentLogger = browserLogger.child({ userId: '123' });
      const childLogger = parentLogger.child({ action: 'click' });

      childLogger.info('Nested log');

      expect(console.info).toHaveBeenCalledWith(
        '[INFO]',
        'Nested log',
        expect.objectContaining({
          userId: '123',
          action: 'click',
        })
      );
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
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      browserLogger.info('Test message');

      // Trigger flush
      for (let i = 0; i < 9; i++) {
        browserLogger.info(`Filler ${i}`);
      }

      await Promise.resolve();

      // Should not throw
      expect(console.error).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should log fetch failure in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      browserLogger.info('Test message');

      // Trigger flush
      for (let i = 0; i < 9; i++) {
        browserLogger.info(`Filler ${i}`);
      }

      await Promise.resolve();
      // Allow console.error from fetch failure
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.error).toHaveBeenCalledWith(
        'Failed to send logs to server:',
        expect.any(Error)
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle non-ok response', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

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

      expect(console.error).toHaveBeenCalledWith(
        'Failed to send logs to server:',
        'Bad Request'
      );

      process.env.NODE_ENV = originalEnv;
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
