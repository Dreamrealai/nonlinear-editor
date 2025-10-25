/**
 * Tests for useAssetThumbnails Hook
 *
 * Tests thumbnail generation for:
 * - Image assets
 * - Video assets
 * - Blob URL cleanup
 * - Error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useAssetThumbnails,
  createImageThumbnail,
  createVideoThumbnail,
} from '@/lib/hooks/useAssetThumbnails';
import type { AssetRow } from '@/types/assets';
import { createBrowserSupabaseClient } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createBrowserSupabaseClient: jest.fn(),
}));

// Mock browser logger
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

const createMockAsset = (overrides: Partial<AssetRow> = {}): AssetRow => ({
  id: `asset-${Date.now()}`,
  user_id: 'user-1',
  project_id: 'project-1',
  name: 'test-asset.mp4',
  type: 'video',
  storage_url: 'supabase://assets/test.mp4',
  size: 1000000,
  duration: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  metadata: null,
  ...overrides,
});

describe('useAssetThumbnails', () => {
  let mockSupabase: any;
  let onAssetUpdateMock: jest.Mock;

  beforeEach(() => {
    onAssetUpdateMock = jest.fn();

    mockSupabase = {
      storage: {
        from: jest.fn(() => ({
          createSignedUrl: jest.fn(() =>
            Promise.resolve({
              data: { signedUrl: 'https://example.com/signed-url' },
              error: null,
            })
          ),
        })),
      },
      from: jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
      })),
    };

    (createBrowserSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

    // Mock fetch for signed URL
    global.fetch = jest.fn(() =>
      Promise.resolve({
        blob: () => Promise.resolve(new Blob(['test'], { type: 'video/mp4' })),
      })
    ) as jest.Mock;

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAssetThumbnails([], false, onAssetUpdateMock));

      expect(result.current.processedThumbnailIdsRef.current.size).toBe(0);
      expect(result.current.thumbnailError).toBeNull();
      expect(result.current.processingCount).toBe(0);
    });

    it('should not process when assets not loaded', () => {
      const assets = [createMockAsset({ id: 'asset-1', metadata: null })];

      renderHook(() => useAssetThumbnails(assets, false, onAssetUpdateMock));

      expect(mockSupabase.storage.from).not.toHaveBeenCalled();
    });
  });

  describe('Thumbnail Processing', () => {
    it('should skip assets that already have thumbnails', async () => {
      const assets = [
        createMockAsset({
          id: 'asset-1',
          type: 'video',
          metadata: { thumbnail: 'data:image/jpeg;base64,abc' },
        }),
      ];

      renderHook(() => useAssetThumbnails(assets, true, onAssetUpdateMock));

      await waitFor(() => {
        expect(mockSupabase.storage.from).not.toHaveBeenCalled();
      });
    });

    it('should skip audio assets', async () => {
      const assets = [createMockAsset({ id: 'asset-1', type: 'audio', metadata: null })];

      renderHook(() => useAssetThumbnails(assets, true, onAssetUpdateMock));

      await waitFor(() => {
        expect(mockSupabase.storage.from).not.toHaveBeenCalled();
      });
    });

    it('should process assets without thumbnails', async () => {
      const assets = [createMockAsset({ id: 'asset-1', type: 'video', metadata: null })];

      renderHook(() => useAssetThumbnails(assets, true, onAssetUpdateMock));

      await waitFor(() => {
        expect(mockSupabase.storage.from).toHaveBeenCalled();
      });
    });

    it('should track processed assets to prevent reprocessing', async () => {
      const assets = [createMockAsset({ id: 'asset-1', type: 'video', metadata: null })];

      const { result, rerender } = renderHook(
        ({ assets }) => useAssetThumbnails(assets, true, onAssetUpdateMock),
        { initialProps: { assets } }
      );

      await waitFor(() => {
        expect(result.current.processedThumbnailIdsRef.current.has('asset-1')).toBe(true);
      });

      // Rerender with same assets
      rerender({ assets });

      // Should not process again
      expect(mockSupabase.storage.from).toHaveBeenCalledTimes(1);
    });

    it('should update processing count', async () => {
      const assets = [
        createMockAsset({ id: 'asset-1', type: 'video', metadata: null }),
        createMockAsset({ id: 'asset-2', type: 'image', metadata: null }),
      ];

      const { result } = renderHook(() => useAssetThumbnails(assets, true, onAssetUpdateMock));

      // Processing count should be set immediately
      expect(result.current.processingCount).toBe(2);

      await waitFor(() => {
        expect(result.current.processingCount).toBe(0);
      });
    });

    it('should clear previous errors on new processing', async () => {
      const assets = [createMockAsset({ id: 'asset-1', type: 'video', metadata: null })];

      const { result, rerender } = renderHook(
        ({ assets }) => useAssetThumbnails(assets, true, onAssetUpdateMock),
        { initialProps: { assets } }
      );

      // Manually set error
      act(() => {
        (result.current as any).thumbnailError = 'Previous error';
      });

      // New assets
      const newAssets = [createMockAsset({ id: 'asset-2', type: 'video', metadata: null })];

      rerender({ assets: newAssets });

      expect(result.current.thumbnailError).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid storage URL', async () => {
      const assets = [
        createMockAsset({ id: 'asset-1', type: 'video', storage_url: 'invalid', metadata: null }),
      ];

      renderHook(() => useAssetThumbnails(assets, true, onAssetUpdateMock));

      await waitFor(() => {
        expect(mockSupabase.storage.from).not.toHaveBeenCalled();
      });
    });

    it('should handle signed URL creation failure', async () => {
      mockSupabase.storage.from = jest.fn(() => ({
        createSignedUrl: jest.fn(() =>
          Promise.resolve({
            data: null,
            error: new Error('Failed to create signed URL'),
          })
        ),
      }));

      const assets = [createMockAsset({ id: 'asset-1', type: 'video', metadata: null })];

      const { result } = renderHook(() => useAssetThumbnails(assets, true, onAssetUpdateMock));

      await waitFor(() => {
        expect(result.current.processingCount).toBe(0);
      });
    });

    it('should set error message when thumbnails fail', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error'))) as jest.Mock;

      const assets = [createMockAsset({ id: 'asset-1', type: 'video', metadata: null })];

      const { result } = renderHook(() => useAssetThumbnails(assets, true, onAssetUpdateMock));

      await waitFor(() => {
        expect(result.current.thumbnailError).toContain('Failed to generate');
      });
    });
  });

  describe('Blob URL Cleanup', () => {
    it('should revoke blob URLs after processing', async () => {
      const assets = [createMockAsset({ id: 'asset-1', type: 'video', metadata: null })];

      renderHook(() => useAssetThumbnails(assets, true, onAssetUpdateMock));

      await waitFor(() => {
        expect(URL.revokeObjectURL).toHaveBeenCalled();
      });
    });

    it('should cleanup blob URLs on unmount', async () => {
      const assets = [createMockAsset({ id: 'asset-1', type: 'video', metadata: null })];

      const { unmount } = renderHook(() => useAssetThumbnails(assets, true, onAssetUpdateMock));

      unmount();

      // Should call cleanup
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
  });
});

describe('createImageThumbnail', () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create thumbnail from image blob', async () => {
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    const mockImage = {
      width: 1920,
      height: 1080,
      onload: null as any,
      onerror: null as any,
      crossOrigin: '',
      src: '',
    };

    // Mock Image constructor
    (global as any).Image = jest.fn(() => mockImage);

    const promise = createImageThumbnail(blob);

    // Trigger onload
    setTimeout(() => {
      if (mockImage.onload) {
        mockImage.onload();
      }
    }, 0);

    const result = await promise;

    expect(result).toBeTruthy();
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should handle image load error', async () => {
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    const mockImage = {
      onload: null as any,
      onerror: null as any,
      crossOrigin: '',
      src: '',
    };

    (global as any).Image = jest.fn(() => mockImage);

    const promise = createImageThumbnail(blob);

    // Trigger onerror
    setTimeout(() => {
      if (mockImage.onerror) {
        mockImage.onerror();
      }
    }, 0);

    const result = await promise;

    expect(result).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});

describe('createVideoThumbnail', () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create thumbnail from video blob', async () => {
    const blob = new Blob(['test'], { type: 'video/mp4' });
    const mockVideo = document.createElement('video');

    Object.defineProperty(mockVideo, 'duration', { value: 10, writable: true });
    Object.defineProperty(mockVideo, 'videoWidth', { value: 1920, writable: true });
    Object.defineProperty(mockVideo, 'videoHeight', { value: 1080, writable: true });

    jest.spyOn(document, 'createElement').mockReturnValue(mockVideo);

    const promise = createVideoThumbnail(blob);

    // Trigger loadedmetadata and seeked events
    setTimeout(() => {
      mockVideo.dispatchEvent(new Event('loadedmetadata'));
      setTimeout(() => {
        mockVideo.dispatchEvent(new Event('seeked'));
      }, 10);
    }, 0);

    const result = await promise;

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should handle video error', async () => {
    const blob = new Blob(['test'], { type: 'video/mp4' });
    const mockVideo = document.createElement('video');

    jest.spyOn(document, 'createElement').mockReturnValue(mockVideo);

    const promise = createVideoThumbnail(blob);

    // Trigger error
    setTimeout(() => {
      mockVideo.dispatchEvent(new Event('error'));
    }, 0);

    const result = await promise;

    expect(result).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should handle zero dimensions', async () => {
    const blob = new Blob(['test'], { type: 'video/mp4' });
    const mockVideo = document.createElement('video');

    Object.defineProperty(mockVideo, 'duration', { value: 10, writable: true });
    Object.defineProperty(mockVideo, 'videoWidth', { value: 0, writable: true });
    Object.defineProperty(mockVideo, 'videoHeight', { value: 0, writable: true });

    jest.spyOn(document, 'createElement').mockReturnValue(mockVideo);

    const promise = createVideoThumbnail(blob);

    // Trigger loadedmetadata and seeked
    setTimeout(() => {
      mockVideo.dispatchEvent(new Event('loadedmetadata'));
      setTimeout(() => {
        mockVideo.dispatchEvent(new Event('seeked'));
      }, 10);
    }, 0);

    const result = await promise;

    expect(result).toBeNull();
  });
});
