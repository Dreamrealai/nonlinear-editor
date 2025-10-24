/**
 * Comprehensive tests for useAssetList hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAssetList } from '@/lib/hooks/useAssetList';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { browserLogger } from '@/lib/browserLogger';
import type { AssetRow } from '@/types/assets';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/browserLogger');

const mockCreateBrowserSupabaseClient = createBrowserSupabaseClient as jest.MockedFunction<
  typeof createBrowserSupabaseClient
>;
const mockBrowserLogger = browserLogger as jest.Mocked<typeof browserLogger>;

describe('useAssetList', () => {
  const mockProjectId = 'project-123';
  let mockSupabase: any;

  const mockAssets: AssetRow[] = [
    {
      id: 'asset-1',
      project_id: mockProjectId,
      user_id: 'user-123',
      storage_url: 'supabase://assets/video1.mp4',
      type: 'video',
      metadata: { filename: 'video1.mp4', mimeType: 'video/mp4' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'asset-2',
      project_id: mockProjectId,
      user_id: 'user-123',
      storage_url: 'supabase://assets/video2.mp4',
      type: 'video',
      metadata: { filename: 'video2.mp4', mimeType: 'video/mp4' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: mockAssets,
        error: null,
        count: 2,
      }),
    };

    mockCreateBrowserSupabaseClient.mockReturnValue(mockSupabase);
  });

  describe('Initialization and Loading', () => {
    it('should initialize and load assets', async () => {
      const { result } = renderHook(() => useAssetList(mockProjectId));

      await waitFor(() => {
        expect(result.current.assetsLoaded).toBe(true);
      });

      expect(result.current.assets).toHaveLength(2);
      expect(result.current.loadingAssets).toBe(false);
      expect(result.current.assetError).toBeNull();
    });

    it('should handle loading errors', async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: null,
        error: new Error('Load failed'),
        count: 0,
      });

      const { result } = renderHook(() => useAssetList(mockProjectId));

      await waitFor(() => {
        expect(result.current.assetError).not.toBeNull();
      });

      expect(mockBrowserLogger.error).toHaveBeenCalled();
    });

    it('should set loading state correctly', async () => {
      const { result } = renderHook(() => useAssetList(mockProjectId));

      // Initially loading
      expect(result.current.loadingAssets).toBe(true);

      await waitFor(() => {
        expect(result.current.loadingAssets).toBe(false);
      });
    });
  });

  describe('Pagination', () => {
    it('should calculate pagination correctly', async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: mockAssets,
        error: null,
        count: 50,
      });

      const { result } = renderHook(() => useAssetList(mockProjectId, 10));

      await waitFor(() => {
        expect(result.current.totalCount).toBe(50);
        expect(result.current.totalPages).toBe(5);
        expect(result.current.currentPage).toBe(0);
      });
    });

    it('should handle next page', async () => {
      mockSupabase.range.mockResolvedValue({
        data: mockAssets,
        error: null,
        count: 50,
      });

      const { result } = renderHook(() => useAssetList(mockProjectId, 10));

      await waitFor(() => expect(result.current.assetsLoaded).toBe(true));

      await act(async () => {
        await result.current.loadNextPage();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it('should handle previous page', async () => {
      mockSupabase.range.mockResolvedValue({
        data: mockAssets,
        error: null,
        count: 50,
      });

      const { result } = renderHook(() => useAssetList(mockProjectId, 10));

      await waitFor(() => expect(result.current.assetsLoaded).toBe(true));

      // Go to page 2 first
      await act(async () => {
        await result.current.goToPage(2);
      });

      // Then go back
      await act(async () => {
        await result.current.loadPreviousPage();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it('should not go to next page if on last page', async () => {
      mockSupabase.range.mockResolvedValue({
        data: mockAssets,
        error: null,
        count: 10,
      });

      const { result } = renderHook(() => useAssetList(mockProjectId, 10));

      await waitFor(() => expect(result.current.assetsLoaded).toBe(true));

      await act(async () => {
        await result.current.loadNextPage();
      });

      expect(result.current.currentPage).toBe(0);
    });

    it('should not go to previous page if on first page', async () => {
      const { result } = renderHook(() => useAssetList(mockProjectId));

      await waitFor(() => expect(result.current.assetsLoaded).toBe(true));

      await act(async () => {
        await result.current.loadPreviousPage();
      });

      expect(result.current.currentPage).toBe(0);
    });

    it('should go to specific page', async () => {
      mockSupabase.range.mockResolvedValue({
        data: mockAssets,
        error: null,
        count: 100,
      });

      const { result } = renderHook(() => useAssetList(mockProjectId, 10));

      await waitFor(() => expect(result.current.assetsLoaded).toBe(true));

      await act(async () => {
        await result.current.goToPage(5);
      });

      expect(result.current.currentPage).toBe(5);
    });
  });

  describe('Asset Management', () => {
    it('should update asset', async () => {
      const { result } = renderHook(() => useAssetList(mockProjectId));

      await waitFor(() => expect(result.current.assets).toHaveLength(2));

      act(() => {
        result.current.updateAsset('asset-1', (asset) => ({
          ...asset,
          metadata: { ...asset.metadata, filename: 'updated.mp4' },
        }));
      });

      const updated = result.current.assets.find((a) => a.id === 'asset-1');
      expect(updated?.metadata?.filename).toBe('updated.mp4');
    });

    it('should remove asset', async () => {
      const { result } = renderHook(() => useAssetList(mockProjectId));

      await waitFor(() => expect(result.current.assets).toHaveLength(2));

      act(() => {
        result.current.removeAsset('asset-1');
      });

      expect(result.current.assets).toHaveLength(1);
      expect(result.current.assets.find((a) => a.id === 'asset-1')).toBeUndefined();
    });
  });

  describe('Reload Assets', () => {
    it('should reload current page', async () => {
      const { result } = renderHook(() => useAssetList(mockProjectId));

      await waitFor(() => expect(result.current.assetsLoaded).toBe(true));

      mockSupabase.range.mockClear();

      await act(async () => {
        await result.current.reloadAssets();
      });

      expect(mockSupabase.range).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty asset list', async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      const { result } = renderHook(() => useAssetList(mockProjectId));

      await waitFor(() => {
        expect(result.current.assets).toHaveLength(0);
        expect(result.current.totalPages).toBe(0);
      });
    });

    it('should handle null data', async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: null,
        error: null,
        count: 0,
      });

      const { result } = renderHook(() => useAssetList(mockProjectId));

      await waitFor(() => {
        expect(result.current.assets).toHaveLength(0);
      });
    });

    it('should handle custom page size', async () => {
      const { result } = renderHook(() => useAssetList(mockProjectId, 25));

      await waitFor(() => expect(result.current.assetsLoaded).toBe(true));

      const rangeCall = mockSupabase.range.mock.calls[0];
      expect(rangeCall[1]).toBe(24); // 0 to 24 = 25 items
    });
  });
});
