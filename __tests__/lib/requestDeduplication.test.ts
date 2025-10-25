/**
 * Tests for Request Deduplication
 *
 * Validates deduplication of concurrent requests, cancellation, and statistics
 */

import {
  deduplicatedFetch,
  deduplicatedFetchJSON,
  cancelRequestsMatching,
  cancelAllRequests,
  getRequestStats,
  clearRequestTracking,
} from '@/lib/requestDeduplication';

// Mock browserLogger
jest.mock('@/lib/browserLogger', (): Record<string, unknown> => ({
  browserLogger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('Request Deduplication', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
    clearRequestTracking();
  });

  afterEach((): void => {
    clearRequestTracking();
  });

  describe('deduplicatedFetch', () => {
    it('should make single request for duplicate calls', async () => {
      // Arrange
      const mockResponse = new Response('test', { status: 200 });
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const [response1, response2, response3] = await Promise.all([
        deduplicatedFetch('/api/test'),
        deduplicatedFetch('/api/test'),
        deduplicatedFetch('/api/test'),
      ]);

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(response1).toBe(mockResponse);
      expect(response2).toBe(mockResponse);
      expect(response3).toBe(mockResponse);
    });

    it('should track request statistics', async () => {
      // Arrange
      const mockResponse = new Response('test', { status: 200 });
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await Promise.all([
        deduplicatedFetch('/api/test'),
        deduplicatedFetch('/api/test'),
        deduplicatedFetch('/api/test'),
      ]);

      // Give time for cleanup
      await new Promise((resolve) => setTimeout(resolve, 10));

      const stats = getRequestStats();

      // Assert
      expect(stats.totalDuplicatesAvoided).toBe(2);
    });

    it('should make separate requests for different URLs', async () => {
      // Arrange
      const mockResponse1 = new Response('test1', { status: 200 });
      const mockResponse2 = new Response('test2', { status: 200 });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      // Act
      const [response1, response2] = await Promise.all([
        deduplicatedFetch('/api/test1'),
        deduplicatedFetch('/api/test2'),
      ]);

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(response1).toBe(mockResponse1);
      expect(response2).toBe(mockResponse2);
    });

    it('should make separate requests for different methods', async () => {
      // Arrange
      const mockResponse1 = new Response('test1', { status: 200 });
      const mockResponse2 = new Response('test2', { status: 200 });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      // Act
      const [response1, response2] = await Promise.all([
        deduplicatedFetch('/api/test', { method: 'GET' }),
        deduplicatedFetch('/api/test', { method: 'POST' }),
      ]);

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should make separate requests for different bodies', async () => {
      // Arrange
      const mockResponse1 = new Response('test1', { status: 200 });
      const mockResponse2 = new Response('test2', { status: 200 });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      // Act
      const [response1, response2] = await Promise.all([
        deduplicatedFetch('/api/test', {
          method: 'POST',
          body: JSON.stringify({ data: 'a' }),
        }),
        deduplicatedFetch('/api/test', {
          method: 'POST',
          body: JSON.stringify({ data: 'b' }),
        }),
      ]);

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should use custom key when provided', async () => {
      // Arrange
      const mockResponse1 = new Response('test1', { status: 200 });
      const mockResponse2 = new Response('test2', { status: 200 });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      // Act
      const [response1, response2] = await Promise.all([
        deduplicatedFetch('/api/test?random=1', undefined, { key: 'custom-key' }),
        deduplicatedFetch('/api/test?random=2', undefined, { key: 'custom-key' }),
      ]);

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(response1).toBe(mockResponse1);
      expect(response2).toBe(mockResponse1);
    });

    it('should handle request failures', async () => {
      // Arrange
      const error = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(
        Promise.all([deduplicatedFetch('/api/test'), deduplicatedFetch('/api/test')])
      ).rejects.toThrow('Network error');

      // All duplicate requests should receive the same error
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('deduplicatedFetchJSON', () => {
    it('should parse JSON response', async () => {
      // Arrange
      const data = { id: 1, name: 'Test' };
      const mockResponse = {
        json: jest.fn().mockResolvedValue(data),
        status: 200,
      } as unknown as Response;
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await deduplicatedFetchJSON('/api/test');

      // Assert
      expect(result).toEqual(data);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should deduplicate JSON requests', async () => {
      // Arrange
      const data = { id: 1, name: 'Test' };
      const mockResponse = {
        json: jest.fn().mockResolvedValue(data),
        status: 200,
      } as unknown as Response;
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const [result1, result2, result3] = await Promise.all([
        deduplicatedFetchJSON('/api/test'),
        deduplicatedFetchJSON('/api/test'),
        deduplicatedFetchJSON('/api/test'),
      ]);

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(data);
      expect(result2).toEqual(data);
      expect(result3).toEqual(data);
    });

    it('should handle typed responses', async () => {
      // Arrange
      interface User {
        id: number;
        name: string;
        email: string;
      }

      const user: User = {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue(user),
        status: 200,
      } as unknown as Response;
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await deduplicatedFetchJSON<User>('/api/users/1');

      // Assert
      expect(result).toEqual(user);
      expect(result.email).toBe('alice@example.com');
    });
  });

  describe('Abort Signal', () => {
    it('should merge abort signals', async () => {
      // Arrange
      const abortController = new AbortController();
      const mockResponse = new Response('test', { status: 200 });

      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        // Abort the external signal after a delay
        setTimeout(() => abortController.abort(), 50);
        return new Promise((resolve) => {
          options?.signal?.addEventListener('abort', () => {
            resolve(mockResponse);
          });
          setTimeout(() => resolve(mockResponse), 1000);
        });
      });

      // Act
      const promise = deduplicatedFetch('/api/test', {
        signal: abortController.signal,
      });

      // Assert
      await expect(promise).resolves.toBe(mockResponse);
    });
  });

  describe('Request Cancellation', () => {
    it('should cancel requests matching pattern', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      // Start multiple requests
      const promise1 = deduplicatedFetch('/api/users/1');
      const promise2 = deduplicatedFetch('/api/users/2');
      const promise3 = deduplicatedFetch('/api/projects/1');

      // Wait for requests to register
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      const cancelled = cancelRequestsMatching(/users/);

      // Assert
      expect(cancelled).toBe(2);
      await expect(promise1).rejects.toThrow();
      await expect(promise2).rejects.toThrow();
      // promise3 should still be pending
    });

    it('should cancel all requests', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      // Start multiple requests
      const promise1 = deduplicatedFetch('/api/users/1');
      const promise2 = deduplicatedFetch('/api/projects/1');
      const promise3 = deduplicatedFetch('/api/assets/1');

      // Wait for requests to register
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      const cancelled = cancelAllRequests();

      // Assert
      expect(cancelled).toBe(3);
      await expect(promise1).rejects.toThrow();
      await expect(promise2).rejects.toThrow();
      await expect(promise3).rejects.toThrow();
    });

    it('should return 0 when no requests match', async () => {
      // Act
      const cancelled = cancelRequestsMatching(/nonexistent/);

      // Assert
      expect(cancelled).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track in-flight requests', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(new Response('test')), 100))
      );

      // Act
      const promise1 = deduplicatedFetch('/api/test1');
      const promise2 = deduplicatedFetch('/api/test2');

      // Check stats while requests are in-flight
      await new Promise((resolve) => setTimeout(resolve, 10));
      const stats = getRequestStats();

      // Assert
      expect(stats.inFlightCount).toBe(2);

      // Wait for completion
      await Promise.all([promise1, promise2]);
    });

    it('should track duplicates avoided', async () => {
      // Arrange
      const mockResponse = new Response('test', { status: 200 });
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await Promise.all([
        deduplicatedFetch('/api/test'),
        deduplicatedFetch('/api/test'),
        deduplicatedFetch('/api/test'),
        deduplicatedFetch('/api/test'),
      ]);

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 10));

      const stats = getRequestStats();

      // Assert
      expect(stats.totalDuplicatesAvoided).toBe(3);
    });

    it('should reset stats after clearing', () => {
      // Act
      clearRequestTracking();
      const stats = getRequestStats();

      // Assert
      expect(stats.inFlightCount).toBe(0);
      expect(stats.totalDuplicatesAvoided).toBe(0);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle many concurrent duplicate requests', async () => {
      // Arrange
      const mockResponse = new Response('test', { status: 200 });
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const promises = Array.from({ length: 100 }, () => deduplicatedFetch('/api/test'));
      const responses = await Promise.all(promises);

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(responses).toHaveLength(100);
      responses.forEach((response) => {
        expect(response).toBe(mockResponse);
      });
    });

    it('should handle rapid sequential requests', async () => {
      // Arrange
      const mockResponse = new Response('test', { status: 200 });
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const response1 = await deduplicatedFetch('/api/test');
      const response2 = await deduplicatedFetch('/api/test');
      const response3 = await deduplicatedFetch('/api/test');

      // Assert
      // Sequential requests are not deduplicated (previous one completes first)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty URLs', async () => {
      // Arrange
      const mockResponse = new Response('test', { status: 200 });
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const response = await deduplicatedFetch('');

      // Assert
      expect(response).toBe(mockResponse);
    });

    it('should handle URLs with query parameters', async () => {
      // Arrange
      const mockResponse = new Response('test', { status: 200 });
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const [response1, response2] = await Promise.all([
        deduplicatedFetch('/api/test?param=1'),
        deduplicatedFetch('/api/test?param=1'),
      ]);

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(response1).toBe(mockResponse);
      expect(response2).toBe(mockResponse);
    });

    it('should treat different query params as different requests', async () => {
      // Arrange
      const mockResponse1 = new Response('test1', { status: 200 });
      const mockResponse2 = new Response('test2', { status: 200 });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      // Act
      const [response1, response2] = await Promise.all([
        deduplicatedFetch('/api/test?param=1'),
        deduplicatedFetch('/api/test?param=2'),
      ]);

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle requests with headers', async () => {
      // Arrange
      const mockResponse = new Response('test', { status: 200 });
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const response = await deduplicatedFetch('/api/test', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        },
      });

      // Assert
      expect(response).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
          },
        })
      );
    });
  });

  describe('Logging', () => {
    it('should accept logging options', async () => {
      // Arrange
      const mockResponse = new Response('test', { status: 200 });
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await deduplicatedFetch('/api/test', undefined, {
        enableLogging: true,
        logContext: { userId: '123' },
      });

      // Assert - no errors should occur with logging enabled
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
