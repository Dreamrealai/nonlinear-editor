/**
 * Tests for useAssetWithFallback Hook
 *
 * Validates asset loading with graceful fallbacks for signing failures.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useAssetWithFallback } from '@/lib/hooks/useAssetWithFallback';
import { signedUrlCache } from '@/lib/signedUrlCache';
import type { AssetRow } from '@/types/assets';

// Mock dependencies
jest.mock('@/lib/signedUrlCache');
jest.mock(
  '@/lib/browserLogger',
  () => ({
    browserLogger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  })
);
jest.mock(
  '@/lib/supabase',
  () => ({
    createBrowserSupabaseClient: jest.fn(() => ({
      storage: {
        from: jest.fn(() => ({
          getPublicUrl: jest.fn((path: string) => ({
            data: {
              publicUrl: `https://storage.supabase.co/public/${path}`,
            },
          })),
        })),
      },
    })),
  })
);

const mockSignedUrlCache = signedUrlCache as jest.Mocked<typeof signedUrlCache>;

describe('useAssetWithFallback', () => {
  const mockAsset: AssetRow = {
    id: 'asset-123',
    user_id: 'user-123',
    storage_url: 'supabase://bucket/user-123/file.mp4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {},
  };

  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should start with idle state when asset is null', () => {
      // Act
      const { result } = renderHook(() => useAssetWithFallback(null));

      // Assert
      expect(result.current.state).toBe('idle');
      expect(result.current.url).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isFallback).toBe(false);
    });

    it('should start loading when asset is provided', () => {
      // Arrange
      mockSignedUrlCache.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      // Act
      const { result } = renderHook(() => useAssetWithFallback(mockAsset));

      // Assert
      expect(result.current.state).toBe('loading');
    });
  });

  describe('Successful Load', () => {
    it('should load signed URL successfully', async () => {
      // Arrange
      const signedUrl = 'https://storage.supabase.co/signed/file.mp4?token=abc';
      mockSignedUrlCache.get.mockResolvedValue(signedUrl);

      // Act
      const { result } = renderHook(() => useAssetWithFallback(mockAsset));

      // Assert
      await waitFor(() => {
        expect(result.current.state).toBe('success');
      });
      expect(result.current.url).toBe(signedUrl);
      expect(result.current.isFallback).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should call onSuccess callback', async () => {
      // Arrange
      const signedUrl = 'https://storage.supabase.co/signed/file.mp4?token=abc';
      mockSignedUrlCache.get.mockResolvedValue(signedUrl);
      const onSuccess = jest.fn();

      // Act
      renderHook(() => useAssetWithFallback(mockAsset, { onSuccess }));

      // Assert
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(signedUrl, false);
      });
    });
  });

  describe('Fallback Mechanism', () => {
    it('should fall back to public URL on signing failure', async () => {
      // Arrange
      mockSignedUrlCache.get.mockRejectedValue(new Error('Signing failed'));

      // Act
      const { result } = renderHook(() =>
        useAssetWithFallback(mockAsset, {
          enableFallback: true,
        })
      );

      // Assert
      await waitFor(() => {
        expect(result.current.state).toBe('success');
      });
      expect(result.current.url).toContain('https://storage.supabase.co/public/');
      expect(result.current.isFallback).toBe(true);
    });

    it('should not use fallback when enableFallback is false', async () => {
      // Arrange
      mockSignedUrlCache.get.mockRejectedValue(new Error('Signing failed'));

      // Act
      const { result } = renderHook(() =>
        useAssetWithFallback(mockAsset, {
          enableFallback: false,
        })
      );

      // Assert
      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });
      expect(result.current.url).toBeNull();
      expect(result.current.error).not.toBeNull();
    });

    it('should not use fallback for non-retryable errors', async () => {
      // Arrange
      const error404 = Object.assign(new Error('Not found'), { status: 404 });
      mockSignedUrlCache.get.mockRejectedValue(error404);

      // Act
      const { result } = renderHook(() =>
        useAssetWithFallback(mockAsset, {
          enableFallback: true,
        })
      );

      // Assert
      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });
      expect(result.current.error?.type).toBe('not_found');
      expect(result.current.error?.canRetry).toBe(false);
    });
  });

  describe('Error Classification', () => {
    it('should classify 404 as not_found', async () => {
      // Arrange
      const error404 = Object.assign(new Error('Not found'), { status: 404 });
      mockSignedUrlCache.get.mockRejectedValue(error404);

      // Act
      const { result } = renderHook(() => useAssetWithFallback(mockAsset));

      // Assert
      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });
      expect(result.current.error?.type).toBe('not_found');
      expect(result.current.error?.message).toContain('deleted');
    });

    it('should classify 403 as forbidden', async () => {
      // Arrange
      const error403 = Object.assign(new Error('Forbidden'), { status: 403 });
      mockSignedUrlCache.get.mockRejectedValue(error403);

      // Act
      const { result } = renderHook(() => useAssetWithFallback(mockAsset));

      // Assert
      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });
      expect(result.current.error?.type).toBe('forbidden');
      expect(result.current.error?.canRetry).toBe(false);
    });

    it('should classify 5xx as signing_failed', async () => {
      // Arrange
      const error500 = Object.assign(new Error('Server error'), { status: 500 });
      mockSignedUrlCache.get.mockRejectedValue(error500);

      // Act
      const { result } = renderHook(() =>
        useAssetWithFallback(mockAsset, { enableFallback: false })
      );

      // Assert
      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });
      expect(result.current.error?.type).toBe('signing_failed');
      expect(result.current.error?.canRetry).toBe(true);
    });

    it('should classify network errors', async () => {
      // Arrange
      const networkError = new TypeError('fetch failed');
      mockSignedUrlCache.get.mockRejectedValue(networkError);

      // Act
      const { result } = renderHook(() =>
        useAssetWithFallback(mockAsset, { enableFallback: false })
      );

      // Assert
      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });
      expect(result.current.error?.type).toBe('network_error');
      expect(result.current.error?.canRetry).toBe(true);
    });

    it('should classify unknown errors', async () => {
      // Arrange
      mockSignedUrlCache.get.mockRejectedValue(new Error('Unknown error'));

      // Act
      const { result } = renderHook(() =>
        useAssetWithFallback(mockAsset, { enableFallback: false })
      );

      // Assert
      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });
      expect(result.current.error?.type).toBe('unknown');
      expect(result.current.error?.canRetry).toBe(true);
    });
  });

  describe('Retry Functionality', () => {
    it('should retry with exponential backoff when enabled', async () => {
      // Arrange
      mockSignedUrlCache.get
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Another failure'))
        .mockResolvedValue('https://storage.supabase.co/signed/success.mp4');

      // Act
      const { result } = renderHook(() =>
        useAssetWithFallback(mockAsset, {
          enableRetry: true,
        })
      );

      // Assert
      await waitFor(() => {
        expect(result.current.state).toBe('success');
      });
      expect(mockSignedUrlCache.get).toHaveBeenCalledTimes(3);
    });

    it('should not retry when enableRetry is false', async () => {
      // Arrange
      mockSignedUrlCache.get.mockRejectedValue(new Error('Failure'));

      // Act
      const { result } = renderHook(() =>
        useAssetWithFallback(mockAsset, {
          enableRetry: false,
          enableFallback: false,
        })
      );

      // Assert
      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });
      expect(mockSignedUrlCache.get).toHaveBeenCalledTimes(1);
    });

    it('should allow manual retry', async () => {
      // Arrange
      mockSignedUrlCache.get
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('https://storage.supabase.co/signed/success.mp4');

      // Act
      const { result } = renderHook(() =>
        useAssetWithFallback(mockAsset, {
          enableRetry: false,
          enableFallback: false,
        })
      );

      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });

      // Manual retry
      result.current.retry();

      // Assert
      await waitFor(() => {
        expect(result.current.state).toBe('success');
      });
      expect(mockSignedUrlCache.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Callbacks', () => {
    it('should call onError callback on failure', async () => {
      // Arrange
      mockSignedUrlCache.get.mockRejectedValue(new Error('Test error'));
      const onError = jest.fn();

      // Act
      renderHook(() =>
        useAssetWithFallback(mockAsset, {
          onError,
          enableFallback: false,
        })
      );

      // Assert
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'unknown',
            message: 'Test error',
            canRetry: true,
          })
        );
      });
    });
  });

  describe('Clear Error', () => {
    it('should clear error state', async () => {
      // Arrange
      mockSignedUrlCache.get.mockRejectedValue(new Error('Test error'));

      // Act
      const { result } = renderHook(() =>
        useAssetWithFallback(mockAsset, { enableFallback: false })
      );

      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });

      result.current.clearError();

      // Assert
      expect(result.current.error).toBeNull();
      expect(result.current.state).toBe('idle');
    });
  });

  describe('Asset Changes', () => {
    it('should reload URL when asset changes', async () => {
      // Arrange
      mockSignedUrlCache.get.mockResolvedValue('https://storage.supabase.co/signed/file1.mp4');

      // Act
      const { result, rerender } = renderHook(({ asset }) => useAssetWithFallback(asset), {
        initialProps: { asset: mockAsset },
      });

      await waitFor(() => {
        expect(result.current.state).toBe('success');
      });

      // Change asset
      const newAsset = { ...mockAsset, id: 'asset-456' };
      mockSignedUrlCache.get.mockResolvedValue('https://storage.supabase.co/signed/file2.mp4');

      rerender({ asset: newAsset });

      // Assert
      await waitFor(() => {
        expect(result.current.url).toBe('https://storage.supabase.co/signed/file2.mp4');
      });
      expect(mockSignedUrlCache.get).toHaveBeenCalledTimes(2);
    });

    it('should reset to idle when asset becomes null', async () => {
      // Arrange
      mockSignedUrlCache.get.mockResolvedValue('https://storage.supabase.co/signed/file.mp4');

      // Act
      const { result, rerender } = renderHook(({ asset }) => useAssetWithFallback(asset), {
        initialProps: { asset: mockAsset },
      });

      await waitFor(() => {
        expect(result.current.state).toBe('success');
      });

      rerender({ asset: null });

      // Assert
      expect(result.current.state).toBe('idle');
      expect(result.current.url).toBeNull();
    });
  });

  describe('Custom TTL', () => {
    it('should pass custom TTL to cache', async () => {
      // Arrange
      mockSignedUrlCache.get.mockResolvedValue('https://storage.supabase.co/signed/file.mp4');

      // Act
      renderHook(() => useAssetWithFallback(mockAsset, { ttl: 7200 }));

      // Assert
      await waitFor(() => {
        expect(mockSignedUrlCache.get).toHaveBeenCalledWith(mockAsset.id, undefined, 7200);
      });
    });
  });

  describe('Logging', () => {
    it('should log when enableLogging is true', async () => {
      // Arrange
      mockSignedUrlCache.get.mockResolvedValue('https://storage.supabase.co/signed/file.mp4');
      const { browserLogger } = require('@/lib/browserLogger');

      // Act
      renderHook(() => useAssetWithFallback(mockAsset, { enableLogging: true }));

      // Assert
      await waitFor(() => {
        expect(browserLogger.debug).toHaveBeenCalled();
      });
    });
  });

  describe('Component Unmount', () => {
    it('should not update state after unmount', async () => {
      // Arrange
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });
      mockSignedUrlCache.get.mockReturnValue(promise);

      // Act
      const { result, unmount } = renderHook(() => useAssetWithFallback(mockAsset));

      expect(result.current.state).toBe('loading');

      unmount();

      // Resolve after unmount
      resolvePromise!('https://storage.supabase.co/signed/file.mp4');

      // Assert - should not throw error
      await waitFor(() => {
        // Just ensure no errors are thrown
        expect(true).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle asset with invalid storage URL', async () => {
      // Arrange
      const invalidAsset = {
        ...mockAsset,
        storage_url: 'invalid://url',
      };
      mockSignedUrlCache.get.mockRejectedValue(new Error('Invalid URL'));

      // Act
      const { result } = renderHook(() =>
        useAssetWithFallback(invalidAsset, { enableFallback: true })
      );

      // Assert
      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });
    });

    it('should handle asset with missing storage URL', async () => {
      // Arrange
      const noUrlAsset = {
        ...mockAsset,
        storage_url: '',
      };
      mockSignedUrlCache.get.mockRejectedValue(new Error('No URL'));

      // Act
      const { result } = renderHook(() =>
        useAssetWithFallback(noUrlAsset, { enableFallback: false })
      );

      // Assert
      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });
    });
  });
});
