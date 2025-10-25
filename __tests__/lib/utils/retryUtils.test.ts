/**
 * Tests for Retry Utilities
 *
 * Validates retry logic with exponential backoff for handling transient failures.
 */

import {
  retryWithBackoff,
  retryableFetch,
  NETWORK_RETRY_OPTIONS,
  ASSET_RETRY_OPTIONS,
  type RetryOptions,
} from '@/lib/utils/retryUtils';

// Mock browserLogger
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('retryUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      // Arrange
      const mockFn = jest.fn().mockResolvedValue('success');

      // Act
      const result = await retryWithBackoff(mockFn);

      // Assert
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      // Arrange
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Another failure'))
        .mockResolvedValue('success');

      // Act
      const promise = retryWithBackoff(mockFn, {
        maxRetries: 3,
        baseDelay: 1000,
        useJitter: false,
      });

      // Fast-forward through delays
      await jest.advanceTimersByTimeAsync(1000); // First retry
      await jest.advanceTimersByTimeAsync(2000); // Second retry

      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries exhausted', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      // Act
      const promise = retryWithBackoff(mockFn, {
        maxRetries: 2,
        baseDelay: 100,
        useJitter: false,
      });

      // Fast-forward through delays
      jest.advanceTimersByTime(100); // First retry
      await Promise.resolve(); // Flush promises
      jest.advanceTimersByTime(200); // Second retry
      await Promise.resolve(); // Flush promises

      // Assert
      await expect(promise).rejects.toThrow('Persistent failure');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff delays', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Failure'));
      const delays: number[] = [];

      // Act
      const promise = retryWithBackoff(mockFn, {
        maxRetries: 3,
        baseDelay: 1000,
        backoffMultiplier: 2,
        useJitter: false,
        onRetry: (_error, _attempt, delay) => {
          delays.push(delay);
        },
      });

      // Fast-forward through delays
      jest.advanceTimersByTime(1000); // 1st retry: 1000ms
      await Promise.resolve();
      jest.advanceTimersByTime(2000); // 2nd retry: 2000ms
      await Promise.resolve();
      jest.advanceTimersByTime(4000); // 3rd retry: 4000ms
      await Promise.resolve();

      await expect(promise).rejects.toThrow('Failure');

      // Assert
      expect(delays).toEqual([1000, 2000, 4000]);
    });

    it('should respect maxDelay cap', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Failure'));
      const delays: number[] = [];

      // Act
      const promise = retryWithBackoff(mockFn, {
        maxRetries: 4,
        baseDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 3000,
        useJitter: false,
        onRetry: (_error, _attempt, delay) => {
          delays.push(delay);
        },
      });

      // Fast-forward through delays
      jest.advanceTimersByTime(1000); // 1st: 1000ms
      await Promise.resolve();
      jest.advanceTimersByTime(2000); // 2nd: 2000ms
      await Promise.resolve();
      jest.advanceTimersByTime(3000); // 3rd: 3000ms (capped)
      await Promise.resolve();
      jest.advanceTimersByTime(3000); // 4th: 3000ms (capped)
      await Promise.resolve();

      await expect(promise).rejects.toThrow('Failure');

      // Assert
      expect(delays).toEqual([1000, 2000, 3000, 3000]);
    });

    it('should not retry when shouldRetry returns false', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Non-retryable'));

      // Act & Assert
      await expect(
        retryWithBackoff(mockFn, {
          maxRetries: 3,
          shouldRetry: () => false,
        })
      ).rejects.toThrow('Non-retryable');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback on each retry', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Failure'));
      const onRetry = jest.fn();

      // Act
      const promise = retryWithBackoff(mockFn, {
        maxRetries: 2,
        baseDelay: 100,
        useJitter: false,
        onRetry,
      });

      jest.advanceTimersByTime(100);
      await Promise.resolve();
      jest.advanceTimersByTime(200);
      await Promise.resolve();

      await expect(promise).rejects.toThrow('Failure');

      // Assert
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, 100);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 2, 200);
    });

    it('should add jitter when useJitter is true', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Failure'));
      const delays: number[] = [];

      // Act
      const promise = retryWithBackoff(mockFn, {
        maxRetries: 2,
        baseDelay: 1000,
        useJitter: true,
        onRetry: (_error, _attempt, delay) => {
          delays.push(delay);
        },
      });

      // Fast-forward through delays (with jitter, delays will vary)
      jest.advanceTimersByTime(1500); // Should cover base + jitter
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
      await Promise.resolve();

      await expect(promise).rejects.toThrow('Failure');

      // Assert
      expect(delays.length).toBe(2);
      // With jitter, delays should be between base and base * 1.25
      expect(delays[0]).toBeGreaterThanOrEqual(1000);
      expect(delays[0]).toBeLessThanOrEqual(1250);
    });
  });

  describe('NETWORK_RETRY_OPTIONS', () => {
    it('should define appropriate defaults for network requests', () => {
      expect(NETWORK_RETRY_OPTIONS.maxRetries).toBe(3);
      expect(NETWORK_RETRY_OPTIONS.baseDelay).toBe(1000);
      expect(NETWORK_RETRY_OPTIONS.maxDelay).toBe(10000);
    });

    it('should retry on network errors', () => {
      const networkError = new TypeError('fetch failed');
      expect(NETWORK_RETRY_OPTIONS.shouldRetry?.(networkError, 0)).toBe(true);
    });

    it('should retry on 5xx status codes', () => {
      const serverError = { status: 500 };
      expect(NETWORK_RETRY_OPTIONS.shouldRetry?.(serverError, 0)).toBe(true);

      const serviceUnavailable = { status: 503 };
      expect(NETWORK_RETRY_OPTIONS.shouldRetry?.(serviceUnavailable, 0)).toBe(true);
    });

    it('should not retry on non-5xx status codes', () => {
      const badRequest = { status: 400 };
      expect(NETWORK_RETRY_OPTIONS.shouldRetry?.(badRequest, 0)).toBe(false);

      const notFound = { status: 404 };
      expect(NETWORK_RETRY_OPTIONS.shouldRetry?.(notFound, 0)).toBe(false);
    });
  });

  describe('ASSET_RETRY_OPTIONS', () => {
    it('should define appropriate defaults for asset operations', () => {
      expect(ASSET_RETRY_OPTIONS.maxRetries).toBe(3);
      expect(ASSET_RETRY_OPTIONS.baseDelay).toBe(1000);
      expect(ASSET_RETRY_OPTIONS.maxDelay).toBe(15000);
    });

    it('should not retry on 404 (asset not found)', () => {
      const notFound = { status: 404 };
      expect(ASSET_RETRY_OPTIONS.shouldRetry?.(notFound, 0)).toBe(false);
    });

    it('should not retry on 403 (forbidden)', () => {
      const forbidden = { status: 403 };
      expect(ASSET_RETRY_OPTIONS.shouldRetry?.(forbidden, 0)).toBe(false);
    });

    it('should retry on 5xx server errors', () => {
      const serverError = { status: 500 };
      expect(ASSET_RETRY_OPTIONS.shouldRetry?.(serverError, 0)).toBe(true);

      const badGateway = { status: 502 };
      expect(ASSET_RETRY_OPTIONS.shouldRetry?.(badGateway, 0)).toBe(true);
    });

    it('should retry on 429 (rate limit)', () => {
      const rateLimited = { status: 429 };
      expect(ASSET_RETRY_OPTIONS.shouldRetry?.(rateLimited, 0)).toBe(true);
    });

    it('should limit retries for unknown errors', () => {
      const unknownError = new Error('Unknown');
      expect(ASSET_RETRY_OPTIONS.shouldRetry?.(unknownError, 0)).toBe(true);
      expect(ASSET_RETRY_OPTIONS.shouldRetry?.(unknownError, 1)).toBe(true);
      expect(ASSET_RETRY_OPTIONS.shouldRetry?.(unknownError, 2)).toBe(false);
    });
  });

  describe('retryableFetch', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return response on successful fetch', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      } as unknown as Response;
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const response = await retryableFetch('/api/test');

      // Assert
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error with status on non-ok response', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response;
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(retryableFetch('/api/test', undefined, { maxRetries: 0 })).rejects.toThrow(
        'HTTP 404: Not Found'
      );
    });

    it('should retry on server errors', async () => {
      // Arrange
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response;
      const successResponse = {
        ok: true,
        status: 200,
      } as Response;

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse);

      // Act
      const promise = retryableFetch('/api/test', undefined, {
        maxRetries: 1,
        baseDelay: 100,
        useJitter: false,
      });

      await jest.advanceTimersByTimeAsync(100);
      const response = await promise;

      // Assert
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should attach status to thrown error', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response;
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act & Assert
      try {
        await retryableFetch('/api/test', undefined, { maxRetries: 0 });
        fail('Should have thrown error');
      } catch (error) {
        expect((error as { status?: number }).status).toBe(429);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero maxRetries', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Failure'));

      // Act & Assert
      await expect(
        retryWithBackoff(mockFn, {
          maxRetries: 0,
        })
      ).rejects.toThrow('Failure');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle very small delays', async () => {
      // Arrange
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');

      // Act
      const promise = retryWithBackoff(mockFn, {
        maxRetries: 1,
        baseDelay: 1,
        useJitter: false,
      });

      await jest.advanceTimersByTimeAsync(1);
      const result = await promise;

      // Assert
      expect(result).toBe('success');
    });

    it('should handle custom shouldRetry based on error properties', async () => {
      // Arrange
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce({ code: 'RETRYABLE' })
        .mockRejectedValueOnce({ code: 'NON_RETRYABLE' });

      // Act & Assert
      const promise = retryWithBackoff(mockFn, {
        maxRetries: 5,
        baseDelay: 100,
        useJitter: false,
        shouldRetry: (error) => {
          return (error as { code?: string }).code === 'RETRYABLE';
        },
      });

      jest.advanceTimersByTime(100);
      await Promise.resolve();

      await expect(promise).rejects.toMatchObject({ code: 'NON_RETRYABLE' });
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle attempt count in shouldRetry', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Failure'));

      // Act
      const promise = retryWithBackoff(mockFn, {
        maxRetries: 5,
        baseDelay: 100,
        useJitter: false,
        shouldRetry: (_error, attempt) => {
          return attempt < 2; // Only retry first 2 attempts
        },
      });

      jest.advanceTimersByTime(100); // 1st retry
      await Promise.resolve();
      jest.advanceTimersByTime(200); // 2nd retry
      await Promise.resolve();

      await expect(promise).rejects.toThrow('Failure');

      // Assert
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Logging', () => {
    it('should log when enableLogging is true', async () => {
      // Arrange
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');

      const { browserLogger } = require('@/lib/browserLogger');

      // Act
      const promise = retryWithBackoff(mockFn, {
        maxRetries: 1,
        baseDelay: 100,
        useJitter: false,
        enableLogging: true,
      });

      jest.advanceTimersByTime(100);
      await Promise.resolve();
      await promise;

      // Assert
      expect(browserLogger.debug).toHaveBeenCalled();
      expect(browserLogger.warn).toHaveBeenCalled();
    });

    it('should not log when enableLogging is false', async () => {
      // Arrange
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');

      const { browserLogger } = require('@/lib/browserLogger');
      jest.clearAllMocks();

      // Act
      const promise = retryWithBackoff(mockFn, {
        maxRetries: 1,
        baseDelay: 100,
        useJitter: false,
        enableLogging: false,
      });

      await jest.advanceTimersByTimeAsync(100);
      await promise;

      // Assert
      expect(browserLogger.debug).not.toHaveBeenCalled();
      expect(browserLogger.warn).not.toHaveBeenCalled();
    });
  });
});
