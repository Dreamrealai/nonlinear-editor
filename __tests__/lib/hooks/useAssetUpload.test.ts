/**
 * Comprehensive tests for useAssetUpload hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAssetUpload } from '@/lib/hooks/useAssetUpload';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { browserLogger } from '@/lib/browserLogger';

// Mock dependencies
jest.mock('react-hot-toast');
jest.mock('@/lib/supabase');
jest.mock('@/lib/browserLogger');
jest.mock(
  'uuid',
  () => ({
    v4: jest.fn(() => 'mock-uuid'),
  })
);
jest.mock(
  '@/lib/hooks/useAssetThumbnails',
  () => ({
    createImageThumbnail: jest.fn(),
    createVideoThumbnail: jest.fn(),
  })
);

const mockToast = toast as jest.Mocked<typeof toast>;
const mockCreateBrowserSupabaseClient = createBrowserSupabaseClient as jest.MockedFunction<
  typeof createBrowserSupabaseClient
>;
const mockBrowserLogger = browserLogger as jest.Mocked<typeof browserLogger>;
const { createImageThumbnail, createVideoThumbnail } = require('@/lib/hooks/useAssetThumbnails');

describe('useAssetUpload', () => {
  const mockProjectId = 'project-123';
  const mockOnUploadSuccess = jest.fn();

  let mockSupabase: any;

  beforeEach((): void => {
    jest.clearAllMocks();

    mockToast.success = jest.fn();
    mockToast.error = jest.fn();

    // Setup Supabase mock
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
            },
          },
          error: null,
        }),
      },
      storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn().mockResolvedValue({ error: null }),
      },
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'asset-123',
          project_id: mockProjectId,
          user_id: 'user-123',
          storage_url: 'supabase://assets/user-123/project-123/video/mock-uuid-test.mp4',
          type: 'video',
          metadata: {
            filename: 'test.mp4',
            mimeType: 'video/mp4',
          },
        },
        error: null,
      }),
    };

    mockCreateBrowserSupabaseClient.mockReturnValue(mockSupabase);
    createImageThumbnail.mockResolvedValue('thumbnail-data-url');
    createVideoThumbnail.mockResolvedValue('video-thumbnail-data-url');
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize and provide uploadAsset function', () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      expect(result.current.uploadAsset).toBeDefined();
      expect(typeof result.current.uploadAsset).toBe('function');
    });
  });

  describe('Video Upload', () => {
    it('should upload video file successfully', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const videoFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(videoFile);
      });

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('assets');
      expect(mockSupabase.storage.upload).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
      expect(mockSupabase.insert).toHaveBeenCalled();
      expect(mockOnUploadSuccess).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Asset uploaded');
    });

    it('should generate thumbnail for video', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const videoFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(videoFile);
      });

      expect(createVideoThumbnail).toHaveBeenCalled();
    });
  });

  describe('Image Upload', () => {
    it('should upload image file successfully', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const imageFile = new File(['image content'], 'test.png', { type: 'image/png' });

      await act(async () => {
        await result.current.uploadAsset(imageFile);
      });

      expect(mockSupabase.storage.upload).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Asset uploaded');
    });

    it('should generate thumbnail for image', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const imageFile = new File(['image content'], 'test.png', { type: 'image/png' });

      await act(async () => {
        await result.current.uploadAsset(imageFile);
      });

      expect(createImageThumbnail).toHaveBeenCalled();
    });
  });

  describe('Audio Upload', () => {
    it('should upload audio file successfully', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const audioFile = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });

      await act(async () => {
        await result.current.uploadAsset(audioFile);
      });

      expect(mockSupabase.storage.upload).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Asset uploaded');
    });

    it('should not generate thumbnail for audio', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const audioFile = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });

      await act(async () => {
        await result.current.uploadAsset(audioFile);
      });

      expect(createImageThumbnail).not.toHaveBeenCalled();
      expect(createVideoThumbnail).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Authentication failed'),
      });

      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      expect(mockToast.error).toHaveBeenCalledWith('Failed to upload asset');
      expect(mockBrowserLogger.error).toHaveBeenCalled();
      expect(mockOnUploadSuccess).not.toHaveBeenCalled();
    });

    it('should handle missing user session', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      expect(mockToast.error).toHaveBeenCalledWith('Failed to upload asset');
      expect(mockBrowserLogger.error).toHaveBeenCalled();
    });

    it('should handle storage upload errors', async () => {
      mockSupabase.storage.upload.mockResolvedValueOnce({
        error: new Error('Storage upload failed'),
      });

      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      expect(mockToast.error).toHaveBeenCalledWith('Failed to upload asset');
      expect(mockOnUploadSuccess).not.toHaveBeenCalled();
    });

    it('should handle database insertion errors', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Database insertion failed'),
      });

      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      expect(mockToast.error).toHaveBeenCalledWith('Failed to upload asset');
      expect(mockOnUploadSuccess).not.toHaveBeenCalled();
    });

    it('should handle thumbnail generation errors gracefully', async () => {
      createVideoThumbnail.mockRejectedValueOnce(new Error('Thumbnail generation failed'));

      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      // Should still succeed even if thumbnail fails
      await act(async () => {
        await result.current.uploadAsset(file);
      });

      // Upload should still succeed
      expect(mockSupabase.insert).toHaveBeenCalled();
    });
  });

  describe('File Name Sanitization', () => {
    it('should handle special characters in filename', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'test@#$%file.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      expect(mockSupabase.storage.upload).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalled();
    });

    it('should handle very long filenames', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const longName = 'a'.repeat(300) + '.mp4';
      const file = new File(['content'], longName, { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      expect(mockSupabase.storage.upload).toHaveBeenCalled();
    });

    it('should handle empty filename', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], '', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      expect(mockSupabase.storage.upload).toHaveBeenCalled();
    });
  });

  describe('Callback Dependencies', () => {
    it('should call onUploadSuccess after successful upload', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      expect(mockOnUploadSuccess).toHaveBeenCalledTimes(1);
    });

    it('should not call onUploadSuccess on upload failure', async () => {
      mockSupabase.storage.upload.mockResolvedValueOnce({
        error: new Error('Upload failed'),
      });

      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      expect(mockOnUploadSuccess).not.toHaveBeenCalled();
    });

    it('should update callback when dependencies change', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const { result, rerender } = renderHook(
        ({ callback }) => useAssetUpload(mockProjectId, callback),
        { initialProps: { callback: callback1 } }
      );

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      expect(callback1).toHaveBeenCalled();

      // Change callback
      rerender({ callback: callback2 });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('Storage Path Generation', () => {
    it('should generate correct storage path for video', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      const uploadCall = mockSupabase.storage.upload.mock.calls[0];
      const storagePath = uploadCall[0];

      expect(storagePath).toContain('user-123');
      expect(storagePath).toContain(mockProjectId);
      expect(storagePath).toContain('video');
    });

    it('should generate correct storage path for image', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'test.png', { type: 'image/png' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      const uploadCall = mockSupabase.storage.upload.mock.calls[0];
      const storagePath = uploadCall[0];

      expect(storagePath).toContain('image');
    });

    it('should generate correct storage path for audio', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'test.mp3', { type: 'audio/mp3' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      const uploadCall = mockSupabase.storage.upload.mock.calls[0];
      const storagePath = uploadCall[0];

      expect(storagePath).toContain('audio');
    });
  });

  describe('Metadata Creation', () => {
    it('should include correct metadata for video', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      const insertCall = mockSupabase.insert.mock.calls[0][0];

      expect(insertCall.metadata.filename).toBe('test.mp4');
      expect(insertCall.metadata.mimeType).toBe('video/mp4');
      expect(insertCall.type).toBe('video');
    });

    it('should include thumbnail in metadata when available', async () => {
      createVideoThumbnail.mockResolvedValueOnce('thumbnail-url');

      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      const insertCall = mockSupabase.insert.mock.calls[0][0];

      expect(insertCall.metadata.thumbnail).toBe('thumbnail-url');
    });

    it('should not include thumbnail when generation fails', async () => {
      createVideoThumbnail.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      const insertCall = mockSupabase.insert.mock.calls[0][0];

      expect(insertCall.metadata.thumbnail).toBeUndefined();
    });
  });

  describe('Multiple Uploads', () => {
    it('should handle multiple sequential uploads', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file1 = new File(['content1'], 'test1.mp4', { type: 'video/mp4' });
      const file2 = new File(['content2'], 'test2.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file1);
      });

      await act(async () => {
        await result.current.uploadAsset(file2);
      });

      expect(mockSupabase.storage.upload).toHaveBeenCalledTimes(2);
      expect(mockOnUploadSuccess).toHaveBeenCalledTimes(2);
      expect(mockToast.success).toHaveBeenCalledTimes(2);
    });

    it('should handle different file types in sequence', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const videoFile = new File(['video'], 'video.mp4', { type: 'video/mp4' });
      const imageFile = new File(['image'], 'image.png', { type: 'image/png' });
      const audioFile = new File(['audio'], 'audio.mp3', { type: 'audio/mp3' });

      await act(async () => {
        await result.current.uploadAsset(videoFile);
      });

      await act(async () => {
        await result.current.uploadAsset(imageFile);
      });

      await act(async () => {
        await result.current.uploadAsset(audioFile);
      });

      expect(mockSupabase.storage.upload).toHaveBeenCalledTimes(3);
      expect(mockOnUploadSuccess).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large files', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const largeContent = new Uint8Array(100 * 1024 * 1024); // 100MB
      const file = new File([largeContent], 'large.mp4', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      expect(mockSupabase.storage.upload).toHaveBeenCalled();
    });

    it('should handle files with unusual mime types', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'test.webm', { type: 'video/webm' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      expect(mockSupabase.storage.upload).toHaveBeenCalled();
    });

    it('should handle files without extension', async () => {
      const { result } = renderHook(() => useAssetUpload(mockProjectId, mockOnUploadSuccess));

      const file = new File(['content'], 'testfile', { type: 'video/mp4' });

      await act(async () => {
        await result.current.uploadAsset(file);
      });

      expect(mockSupabase.storage.upload).toHaveBeenCalled();
    });
  });
});
