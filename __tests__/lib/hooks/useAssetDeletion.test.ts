/**
 * Comprehensive tests for useAssetDeletion hook
 */

import { renderHook, act } from '@testing-library/react';
import { useAssetDeletion } from '@/lib/hooks/useAssetDeletion';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';
import type { AssetRow } from '@/types/assets';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('react-hot-toast');
jest.mock('@/lib/browserLogger');

const mockCreateBrowserSupabaseClient = createBrowserSupabaseClient as jest.MockedFunction<
  typeof createBrowserSupabaseClient
>;
const mockToast = toast as jest.Mocked<typeof toast>;
const mockBrowserLogger = browserLogger as jest.Mocked<typeof browserLogger>;

// Mock window.confirm
global.confirm = jest.fn();

describe('useAssetDeletion', () => {
  const mockProjectId = 'project-123';
  const mockOnDeleteSuccess = jest.fn();
  let mockSupabase: any;

  const mockAsset: AssetRow = {
    id: 'asset-123',
    project_id: mockProjectId,
    user_id: 'user-123',
    storage_url: 'supabase://assets/video.mp4',
    type: 'video',
    metadata: { filename: 'test.mp4', mimeType: 'video/mp4' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockTimeline = {
    clips: [{ assetId: 'asset-123', id: 'clip-1' }, { assetId: 'asset-456', id: 'clip-2' }],
  };

  const mockSetTimeline = jest.fn();

  beforeEach((): void => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };

    mockCreateBrowserSupabaseClient.mockReturnValue(mockSupabase);
    mockToast.success = jest.fn();
    mockToast.error = jest.fn();
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  describe('Deletion Confirmation', () => {
    it('should show confirmation dialog', async () => {
      const { result } = renderHook(() =>
        useAssetDeletion(mockProjectId, mockOnDeleteSuccess)
      );

      await act(async () => {
        await result.current.deleteAsset(mockAsset, mockTimeline, mockSetTimeline);
      });

      expect(global.confirm).toHaveBeenCalledWith('Delete "test.mp4"?');
    });

    it('should not delete if confirmation is denied', async () => {
      (global.confirm as jest.Mock).mockReturnValueOnce(false);

      const { result } = renderHook(() =>
        useAssetDeletion(mockProjectId, mockOnDeleteSuccess)
      );

      await act(async () => {
        await result.current.deleteAsset(mockAsset, mockTimeline, mockSetTimeline);
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(mockOnDeleteSuccess).not.toHaveBeenCalled();
    });

    it('should use asset ID when filename not available', async () => {
      const assetWithoutFilename = { ...mockAsset, metadata: null };

      const { result } = renderHook(() =>
        useAssetDeletion(mockProjectId, mockOnDeleteSuccess)
      );

      await act(async () => {
        await result.current.deleteAsset(assetWithoutFilename, mockTimeline, mockSetTimeline);
      });

      expect(global.confirm).toHaveBeenCalledWith('Delete "asset-123"?');
    });
  });

  describe('Successful Deletion', () => {
    it('should delete asset from database', async () => {
      const { result } = renderHook(() =>
        useAssetDeletion(mockProjectId, mockOnDeleteSuccess)
      );

      await act(async () => {
        await result.current.deleteAsset(mockAsset, mockTimeline, mockSetTimeline);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'asset-123');
      expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', mockProjectId);
    });

    it('should call onDeleteSuccess callback', async () => {
      const { result } = renderHook(() =>
        useAssetDeletion(mockProjectId, mockOnDeleteSuccess)
      );

      await act(async () => {
        await result.current.deleteAsset(mockAsset, mockTimeline, mockSetTimeline);
      });

      expect(mockOnDeleteSuccess).toHaveBeenCalledWith('asset-123');
    });

    it('should show success message when asset not in timeline', async () => {
      const { result } = renderHook(() =>
        useAssetDeletion(mockProjectId, mockOnDeleteSuccess)
      );

      const timelineWithoutAsset = {
        clips: [{ assetId: 'other-asset', id: 'clip-1' }],
      };

      await act(async () => {
        await result.current.deleteAsset(mockAsset, timelineWithoutAsset, mockSetTimeline);
      });

      expect(mockToast.success).toHaveBeenCalledWith('Asset deleted');
    });

    it('should show enhanced message when asset removed from timeline', async () => {
      const { result } = renderHook(() =>
        useAssetDeletion(mockProjectId, mockOnDeleteSuccess)
      );

      await act(async () => {
        await result.current.deleteAsset(mockAsset, mockTimeline, mockSetTimeline);
      });

      expect(mockToast.success).toHaveBeenCalledWith('Asset deleted from library and timeline');
      expect(mockSetTimeline).toHaveBeenCalled();
    });

    it('should handle null timeline', async () => {
      const { result } = renderHook(() =>
        useAssetDeletion(mockProjectId, mockOnDeleteSuccess)
      );

      await act(async () => {
        await result.current.deleteAsset(mockAsset, null, mockSetTimeline);
      });

      expect(mockToast.success).toHaveBeenCalledWith('Asset deleted');
      expect(mockSetTimeline).not.toHaveBeenCalled();
    });
  });

  describe('Timeline Cleanup', () => {
    it('should remove clips using deleted asset from timeline', async () => {
      const { result } = renderHook(() =>
        useAssetDeletion(mockProjectId, mockOnDeleteSuccess)
      );

      await act(async () => {
        await result.current.deleteAsset(mockAsset, mockTimeline, mockSetTimeline);
      });

      expect(mockSetTimeline).toHaveBeenCalledWith({
        ...mockTimeline,
        clips: [{ assetId: 'asset-456', id: 'clip-2' }],
      });
    });

    it('should preserve other timeline properties', async () => {
      const fullTimeline = {
        ...mockTimeline,
        textOverlays: [{ id: 'text-1' }],
        transitions: [{ id: 'transition-1' }],
      };

      const { result } = renderHook(() =>
        useAssetDeletion(mockProjectId, mockOnDeleteSuccess)
      );

      await act(async () => {
        await result.current.deleteAsset(mockAsset, fullTimeline, mockSetTimeline);
      });

      const updatedTimeline = mockSetTimeline.mock.calls[0][0];
      expect(updatedTimeline.textOverlays).toEqual([{ id: 'text-1' }]);
      expect(updatedTimeline.transitions).toEqual([{ id: 'transition-1' }]);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        error: new Error('Delete failed'),
      });

      const { result } = renderHook(() =>
        useAssetDeletion(mockProjectId, mockOnDeleteSuccess)
      );

      await act(async () => {
        await result.current.deleteAsset(mockAsset, mockTimeline, mockSetTimeline);
      });

      expect(mockToast.error).toHaveBeenCalledWith('Failed to delete asset');
      expect(mockBrowserLogger.error).toHaveBeenCalled();
      expect(mockOnDeleteSuccess).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.delete.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const { result } = renderHook(() =>
        useAssetDeletion(mockProjectId, mockOnDeleteSuccess)
      );

      await act(async () => {
        await result.current.deleteAsset(mockAsset, mockTimeline, mockSetTimeline);
      });

      expect(mockToast.error).toHaveBeenCalledWith('Failed to delete asset');
      expect(mockBrowserLogger.error).toHaveBeenCalled();
    });
  });

  describe('Callback Dependencies', () => {
    it('should work with different onDeleteSuccess callbacks', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const { result, rerender } = renderHook(
        ({ callback }) => useAssetDeletion(mockProjectId, callback),
        { initialProps: { callback: callback1 } }
      );

      await act(async () => {
        await result.current.deleteAsset(mockAsset, mockTimeline, mockSetTimeline);
      });

      expect(callback1).toHaveBeenCalled();

      rerender({ callback: callback2 });

      await act(async () => {
        await result.current.deleteAsset(mockAsset, mockTimeline, mockSetTimeline);
      });

      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle asset with multiple clips in timeline', async () => {
      const timelineWithMultipleClips = {
        clips: [
          { assetId: 'asset-123', id: 'clip-1' },
          { assetId: 'asset-123', id: 'clip-2' },
          { assetId: 'asset-456', id: 'clip-3' },
        ],
      };

      const { result } = renderHook(() =>
        useAssetDeletion(mockProjectId, mockOnDeleteSuccess)
      );

      await act(async () => {
        await result.current.deleteAsset(mockAsset, timelineWithMultipleClips, mockSetTimeline);
      });

      const updatedTimeline = mockSetTimeline.mock.calls[0][0];
      expect(updatedTimeline.clips).toHaveLength(1);
      expect(updatedTimeline.clips[0].id).toBe('clip-3');
    });

    it('should handle empty timeline', async () => {
      const emptyTimeline = { clips: [] };

      const { result } = renderHook(() =>
        useAssetDeletion(mockProjectId, mockOnDeleteSuccess)
      );

      await act(async () => {
        await result.current.deleteAsset(mockAsset, emptyTimeline, mockSetTimeline);
      });

      expect(mockToast.success).toHaveBeenCalledWith('Asset deleted');
    });
  });
});
