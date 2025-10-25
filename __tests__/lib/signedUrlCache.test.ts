/**
 * Tests for Signed URL Cache Manager
 *
 * Validates caching, invalidation, and prefetching of signed URLs
 */

import { SignedUrlCacheManager, signedUrlCache } from '@/lib/signedUrlCache';

// Mock browserLogger
jest.mock(
  '@/lib/browserLogger',
  (): Record<string, unknown> => ({
    browserLogger: {
      debug: jest.fn(),
      error: jest.fn(),
    },
  })
);

// Mock requestDeduplication - uses __mocks__/lib/requestDeduplication.ts
jest.mock('@/lib/requestDeduplication');

import { deduplicatedFetch } from '@/lib/requestDeduplication';

const mockDeduplicatedFetch = deduplicatedFetch as jest.MockedFunction<typeof deduplicatedFetch>;

// Helper function to create mock Response objects
function createMockResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('SignedUrlCacheManager', () => {
  let cacheManager: SignedUrlCacheManager;

  beforeEach((): void => {
    jest.clearAllMocks();
    cacheManager = new SignedUrlCacheManager({
      defaultTTL: 3600,
      expiryBuffer: 300000, // 5 minutes
      maxCacheSize: 10,
      enableLogging: false,
    });

    // Default mock response for deduplicatedFetch
    mockDeduplicatedFetch.mockResolvedValue(
      createMockResponse({ signedUrl: 'https://example.com/signed', expiresIn: 3600 })
    );
  });

  afterEach((): void => {
    cacheManager.clear();
  });

  describe('Cache Key Generation', () => {
    it('should throw error when neither assetId nor storageUrl provided', async () => {
      // Act & Assert
      await expect(cacheManager.get()).rejects.toThrow(
        'Either assetId or storageUrl must be provided'
      );
    });

    it('should generate key from assetId', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            signedUrl: 'https://example.com/signed',
            expiresIn: 3600,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      // Act
      await cacheManager.get('asset123');

      // Assert
      const stats = cacheManager.getStats();
      expect(stats.entries[0].key).toBe('asset:asset123');
    });

    it('should generate key from storageUrl', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: 3600,
        })
      );

      // Act
      await cacheManager.get(undefined, 'https://storage.com/file.mp4');

      // Assert
      const stats = cacheManager.getStats();
      expect(stats.entries[0].key).toBe('storage:https://storage.com/file.mp4');
    });
  });

  describe('Cache Hit/Miss', () => {
    it('should return cached URL on cache hit', async () => {
      // Arrange
      const signedUrl = 'https://example.com/signed';
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl,
          expiresIn: 3600,
        })
      );

      // Act
      const url1 = await cacheManager.get('asset123');
      const url2 = await cacheManager.get('asset123');

      // Assert
      expect(url1).toBe(signedUrl);
      expect(url2).toBe(signedUrl);
      expect(mockDeduplicatedFetch).toHaveBeenCalledTimes(1);
    });

    it('should fetch new URL on cache miss', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: 3600,
        })
      );

      // Act
      const url = await cacheManager.get('asset123');

      // Assert
      expect(url).toBe('https://example.com/signed');
      expect(mockDeduplicatedFetch).toHaveBeenCalledTimes(1);
    });

    it('should refetch when URL is expired', async () => {
      // Arrange
      const shortTTL = 1; // 1 second
      const expiryBuffer = 500; // 500ms buffer
      cacheManager = new SignedUrlCacheManager({
        expiryBuffer,
        enableLogging: false,
      });

      mockDeduplicatedFetch
        .mockResolvedValueOnce(
          createMockResponse({
            signedUrl: 'https://example.com/signed1',
            expiresIn: shortTTL,
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            signedUrl: 'https://example.com/signed2',
            expiresIn: shortTTL,
          })
        );

      // Act
      const url1 = await cacheManager.get('asset123', undefined, shortTTL);

      // Wait for expiry with buffer
      await new Promise((resolve) => setTimeout(resolve, shortTTL * 1000 - expiryBuffer + 100));

      const url2 = await cacheManager.get('asset123', undefined, shortTTL);

      // Assert
      expect(url1).toBe('https://example.com/signed1');
      expect(url2).toBe('https://example.com/signed2');
      expect(mockDeduplicatedFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Request Parameters', () => {
    it('should include assetId in request params', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: 3600,
        })
      );

      // Act
      await cacheManager.get('asset123');

      // Assert
      expect(mockDeduplicatedFetch).toHaveBeenCalledWith(
        expect.stringContaining('assetId=asset123'),
        undefined,
        expect.any(Object)
      );
    });

    it('should include storageUrl in request params', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: 3600,
        })
      );

      // Act
      await cacheManager.get(undefined, 'https://storage.com/file.mp4');

      // Assert
      expect(mockDeduplicatedFetch).toHaveBeenCalledWith(
        expect.stringContaining('storageUrl=https%3A%2F%2Fstorage.com%2Ffile.mp4'),
        undefined,
        expect.any(Object)
      );
    });

    it('should include custom TTL in request params', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: 1800,
        })
      );

      // Act
      await cacheManager.get('asset123', undefined, 1800);

      // Assert
      expect(mockDeduplicatedFetch).toHaveBeenCalledWith(
        expect.stringContaining('ttl=1800'),
        undefined,
        expect.any(Object)
      );
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate specific entry', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: 3600,
        })
      );

      await cacheManager.get('asset123');

      // Act
      const invalidated = cacheManager.invalidate('asset123');

      // Assert
      expect(invalidated).toBe(true);
      const stats = cacheManager.getStats();
      expect(stats.size).toBe(0);
    });

    it('should return false when invalidating non-existent entry', () => {
      // Act
      const invalidated = cacheManager.invalidate('nonexistent');

      // Assert
      expect(invalidated).toBe(false);
    });

    it('should invalidate matching pattern', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: 3600,
        })
      );

      await cacheManager.get('asset1');
      await cacheManager.get('asset2');
      await cacheManager.get('asset3');

      // Act
      const count = cacheManager.invalidateMatching(/asset:[12]/);

      // Assert
      expect(count).toBe(2);
      const stats = cacheManager.getStats();
      expect(stats.size).toBe(1);
    });

    it('should clear all entries', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: 3600,
        })
      );

      await cacheManager.get('asset1');
      await cacheManager.get('asset2');

      // Act
      cacheManager.clear();

      // Assert
      const stats = cacheManager.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Cache Size Limit', () => {
    it('should evict oldest entry when cache is full', async () => {
      // Arrange
      const smallCache = new SignedUrlCacheManager({
        maxCacheSize: 3,
        enableLogging: false,
      });

      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: 3600,
        })
      );

      // Act
      await smallCache.get('asset1');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await smallCache.get('asset2');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await smallCache.get('asset3');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await smallCache.get('asset4'); // Should evict asset1

      // Assert
      const stats = smallCache.getStats();
      expect(stats.size).toBe(3);
      expect(stats.entries.find((e) => e.key === 'asset:asset1')).toBeUndefined();
    });
  });

  describe('Pruning', () => {
    it('should prune expired entries', async () => {
      // Arrange
      const shortTTL = 0.5; // 500ms
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: shortTTL,
        })
      );

      await cacheManager.get('asset1', undefined, shortTTL);
      await cacheManager.get('asset2', undefined, 3600);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Act
      const pruned = cacheManager.prune();

      // Assert
      expect(pruned).toBe(1);
      const stats = cacheManager.getStats();
      expect(stats.size).toBe(1);
    });

    it('should return 0 when no entries are expired', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: 3600,
        })
      );

      await cacheManager.get('asset1');

      // Act
      const pruned = cacheManager.prune();

      // Assert
      expect(pruned).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should return accurate stats', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: 3600,
        })
      );

      await cacheManager.get('asset1');
      await cacheManager.get('asset2');

      // Act
      const stats = cacheManager.getStats();

      // Assert
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(10);
      expect(stats.entries).toHaveLength(2);
      expect(stats.entries[0]).toHaveProperty('key');
      expect(stats.entries[0]).toHaveProperty('ttl');
      expect(stats.entries[0]).toHaveProperty('age');
      expect(stats.entries[0]).toHaveProperty('timeToExpiry');
    });

    it('should calculate correct time to expiry', async () => {
      // Arrange
      const ttl = 3600;
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: ttl,
        })
      );

      await cacheManager.get('asset1', undefined, ttl);

      // Act
      const stats = cacheManager.getStats();

      // Assert
      expect(stats.entries[0].timeToExpiry).toBeGreaterThan(0);
      expect(stats.entries[0].timeToExpiry).toBeLessThanOrEqual(ttl * 1000);
    });
  });

  describe('Prefetch', () => {
    it('should prefetch multiple assets', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: 3600,
        })
      );

      const assets = [{ assetId: 'asset1' }, { assetId: 'asset2' }, { assetId: 'asset3' }];

      // Act
      await cacheManager.prefetch(assets);

      // Assert
      expect(mockDeduplicatedFetch).toHaveBeenCalledTimes(3);
      const stats = cacheManager.getStats();
      expect(stats.size).toBe(3);
    });

    it('should handle prefetch failures gracefully', async () => {
      // Arrange
      mockDeduplicatedFetch
        .mockResolvedValueOnce(
          createMockResponse({
            signedUrl: 'https://example.com/signed1',
            expiresIn: 3600,
          })
        )
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(
          createMockResponse({
            signedUrl: 'https://example.com/signed3',
            expiresIn: 3600,
          })
        );

      const assets = [{ assetId: 'asset1' }, { assetId: 'asset2' }, { assetId: 'asset3' }];

      // Act
      await cacheManager.prefetch(assets);

      // Assert
      const stats = cacheManager.getStats();
      expect(stats.size).toBe(2); // Only successful fetches cached
    });
  });

  describe('Error Handling', () => {
    it('should throw error when API response is invalid', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          // Missing signedUrl
          expiresIn: 3600,
        } as unknown as { signedUrl: string; expiresIn: number })
      );

      // Act & Assert
      await expect(cacheManager.get('asset123')).rejects.toThrow(
        'Invalid response: missing signedUrl'
      );
    });

    it('should propagate fetch errors', async () => {
      // Arrange
      mockDeduplicatedFetch.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(cacheManager.get('asset123')).rejects.toThrow('Network error');
    });
  });

  describe('Singleton Instance', () => {
    it('should provide working singleton instance', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: 3600,
        })
      );

      // Act
      const url = await signedUrlCache.get('asset123');

      // Assert
      expect(url).toBe('https://example.com/signed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short TTLs', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: 1,
        })
      );

      // Act
      const url = await cacheManager.get('asset123', undefined, 1);

      // Assert
      expect(url).toBe('https://example.com/signed');
    });

    it('should handle very long TTLs', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          expiresIn: 86400, // 24 hours
        })
      );

      // Act
      const url = await cacheManager.get('asset123', undefined, 86400);

      // Assert
      expect(url).toBe('https://example.com/signed');
    });

    it('should handle missing expiresIn in response', async () => {
      // Arrange
      mockDeduplicatedFetch.mockResolvedValue(
        createMockResponse({
          signedUrl: 'https://example.com/signed',
          // expiresIn missing
        } as unknown as { signedUrl: string; expiresIn: number })
      );

      // Act
      const url = await cacheManager.get('asset123', undefined, 1800);

      // Assert
      expect(url).toBe('https://example.com/signed');
      const stats = cacheManager.getStats();
      expect(stats.entries[0].ttl).toBe(1800); // Uses provided TTL
    });
  });
});
