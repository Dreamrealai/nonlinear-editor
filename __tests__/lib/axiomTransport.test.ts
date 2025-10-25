/**
 * Tests for lib/axiomTransport.ts - Axiom Logging Transport
 *
 * Tests cover:
 * - Log batching and queueing
 * - Automatic flush on batch size
 * - Flush on error/warn levels
 * - Flush on process exit
 * - API request handling
 * - Error handling and silent failures
 * - Level conversion
 */

import { axiomTransport } from '@/lib/axiomTransport';

// Mock global fetch
global.fetch = jest.fn();

// Mock process.on
const mockProcessOn = jest.fn();
const originalProcessOn = process.on;

describe('lib/axiomTransport: Axiom Logging Transport', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    originalEnv = { ...process.env };

    process.env.AXIOM_TOKEN = 'test-axiom-token';
    process.env.AXIOM_DATASET = 'test-dataset';
    process.env.NODE_ENV = 'test';

    // Reset fetch mock
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  describe('write: Queueing', () => {
    it('should queue log entries', () => {
      axiomTransport.write({
        level: 30,
        time: Date.now(),
        msg: 'Test log',
      });

      // Log should be queued, not immediately sent
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should flush automatically when batch size reached', async () => {
      // Write 5 logs (BATCH_SIZE = 5)
      for (let i = 0; i < 5; i++) {
        axiomTransport.write({
          level: 30,
          time: Date.now(),
          msg: `Test log ${i}`,
        });
      }

      // Wait for async flush
      await Promise.resolve();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.axiom.co/v1/datasets/test-dataset/ingest',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-axiom-token',
            'Content-Type': 'application/json',
          },
        })
      );

      const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(requestBody).toHaveLength(5);
    });

    it('should flush immediately for error level logs', async () => {
      axiomTransport.write({
        level: 50, // error level
        time: Date.now(),
        msg: 'Error log',
      });

      // Wait for async flush
      await Promise.resolve();

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should flush immediately for warn level logs', async () => {
      axiomTransport.write({
        level: 40, // warn level
        time: Date.now(),
        msg: 'Warning log',
      });

      // Wait for async flush
      await Promise.resolve();

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should schedule flush for info level logs', () => {
      axiomTransport.write({
        level: 30, // info level
        time: Date.now(),
        msg: 'Info log',
      });

      // Should not flush immediately
      expect(global.fetch).not.toHaveBeenCalled();

      // Advance timers to trigger flush
      jest.advanceTimersByTime(1000);

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('write: Disabled When Not Configured', () => {
    it('should not write when AXIOM_TOKEN is missing', () => {
      delete process.env.AXIOM_TOKEN;

      // Need to re-import to get new instance with updated env
      jest.resetModules();
      const { axiomTransport: newTransport } = require('@/lib/axiomTransport');

      newTransport.write({
        level: 30,
        time: Date.now(),
        msg: 'Test',
      });

      jest.runAllTimers();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not write when AXIOM_DATASET is missing', () => {
      delete process.env.AXIOM_DATASET;

      jest.resetModules();
      const { axiomTransport: newTransport } = require('@/lib/axiomTransport');

      newTransport.write({
        level: 30,
        time: Date.now(),
        msg: 'Test',
      });

      jest.runAllTimers();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('flush: Manual Flushing', () => {
    it('should flush logs manually', async () => {
      axiomTransport.write({
        level: 30,
        time: Date.now(),
        msg: 'Test log',
      });

      await axiomTransport.flush();

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should not flush when queue is empty', async () => {
      await axiomTransport.flush();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should clear scheduled flush timer', async () => {
      axiomTransport.write({
        level: 30,
        time: Date.now(),
        msg: 'Test',
      });

      await axiomTransport.flush();

      // Timer should be cleared
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should flush synchronously when sync parameter is true', async () => {
      axiomTransport.write({
        level: 30,
        time: Date.now(),
        msg: 'Test',
      });

      await axiomTransport.flush(true);

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('flush: Request Formatting', () => {
    it('should format log entries correctly', async () => {
      const timestamp = Date.now();

      axiomTransport.write({
        level: 30,
        time: timestamp,
        msg: 'Test message',
        userId: 'user-123',
        customField: 'custom-value',
      });

      await axiomTransport.flush();

      const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);

      expect(requestBody[0]).toMatchObject({
        _time: new Date(timestamp).toISOString(),
        level: 'info',
        message: 'Test message',
        source: 'server',
        userId: 'user-123',
        customField: 'custom-value',
      });
    });

    it('should convert log levels correctly', async () => {
      const levels = [
        { level: 10, expected: 'trace' },
        { level: 20, expected: 'debug' },
        { level: 30, expected: 'info' },
        { level: 40, expected: 'warn' },
        { level: 50, expected: 'error' },
        { level: 60, expected: 'fatal' },
      ];

      for (const { level, expected } of levels) {
        (global.fetch as jest.Mock).mockClear();

        axiomTransport.write({
          level,
          time: Date.now(),
          msg: 'Test',
        });

        await axiomTransport.flush();

        const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
        expect(requestBody[0].level).toBe(expected);
      }
    });

    it('should exclude level, msg, and time from rest fields', async () => {
      axiomTransport.write({
        level: 30,
        time: Date.now(),
        msg: 'Test',
        customField: 'value',
      });

      await axiomTransport.flush();

      const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);

      expect(requestBody[0]).not.toHaveProperty('level', 30);
      expect(requestBody[0]).not.toHaveProperty('msg');
      expect(requestBody[0]).not.toHaveProperty('time');
      expect(requestBody[0]).toHaveProperty('customField', 'value');
    });
  });

  describe('flush: Error Handling', () => {
    it('should handle API errors silently', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      });

      axiomTransport.write({
        level: 30,
        time: Date.now(),
        msg: 'Test',
      });

      await axiomTransport.flush();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Axiom ingest failed:',
        500,
        'Internal Server Error'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle network errors silently in production', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      axiomTransport.write({
        level: 30,
        time: Date.now(),
        msg: 'Test',
      });

      await axiomTransport.flush();

      // Should not throw
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalNodeEnv;
      consoleErrorSpy.mockRestore();
    });

    it('should log errors in development', async () => {
      process.env.NODE_ENV = 'development';

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      axiomTransport.write({
        level: 30,
        time: Date.now(),
        msg: 'Test',
      });

      await axiomTransport.flush();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Axiom transport error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should log success in development', async () => {
      process.env.NODE_ENV = 'development';

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      axiomTransport.write({
        level: 30,
        time: Date.now(),
        msg: 'Test 1',
      });

      axiomTransport.write({
        level: 30,
        time: Date.now(),
        msg: 'Test 2',
      });

      await axiomTransport.flush();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Sent 2 logs to Axiom'));

      consoleLogSpy.mockRestore();
    });
  });

  describe('flush: Async Behavior', () => {
    it('should fire and forget in async mode', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ ok: true });
          }, 100);
        });
      });

      axiomTransport.write({
        level: 30,
        time: Date.now(),
        msg: 'Test',
      });

      // Flush without waiting
      const flushPromise = axiomTransport.flush(false);

      // Should resolve immediately
      await flushPromise;

      // Fetch should be called but not awaited
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
