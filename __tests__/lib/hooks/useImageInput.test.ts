/**
 * Comprehensive tests for useImageInput hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useImageInput } from '@/lib/hooks/useImageInput';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('react-hot-toast');

const mockToast = toast as jest.Mocked<typeof toast>;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock fetch
global.fetch = jest.fn();

describe('useImageInput', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
    mockToast.success = jest.fn();
    mockToast.error = jest.fn();
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useImageInput());

      expect(result.current.selectedImage).toBeNull();
      expect(result.current.imagePreviewUrl).toBeNull();
      expect(result.current.imageAssetId).toBeNull();
      expect(result.current.uploadingImage).toBe(false);
      expect(result.current.fileInputRef.current).toBeNull();
    });

    it('should provide all expected methods', () => {
      const { result } = renderHook(() => useImageInput());

      expect(typeof result.current.handleFileInputChange).toBe('function');
      expect(typeof result.current.handleAssetSelect).toBe('function');
      expect(typeof result.current.clearImage).toBe('function');
      expect(typeof result.current.uploadImageToStorage).toBe('function');
      expect(typeof result.current.setUploadingImage).toBe('function');
    });
  });

  describe('File Input Handling', () => {
    it('should handle file input change', () => {
      const { result } = renderHook(() => useImageInput());

      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const event = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileInputChange(event);
      });

      expect(result.current.selectedImage).toBe(file);
      expect(result.current.imagePreviewUrl).toBe('blob:mock-url');
      expect(result.current.imageAssetId).toBeNull();
      expect(URL.createObjectURL).toHaveBeenCalledWith(file);
      expect(mockToast.success).toHaveBeenCalledWith('Image selected!');
    });

    it('should handle empty file input', () => {
      const { result } = renderHook(() => useImageInput());

      const event = {
        target: { files: [] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileInputChange(event);
      });

      expect(result.current.selectedImage).toBeNull();
      expect(mockToast.success).not.toHaveBeenCalled();
    });

    it('should clear asset selection when file is selected', () => {
      const { result } = renderHook(() => useImageInput());

      // First select an asset
      const asset = {
        id: 'asset-1',
        storage_url: 'https://example.com/image.png',
        metadata: { thumbnail: 'https://example.com/thumb.png' },
      };

      act(() => {
        result.current.handleAssetSelect(asset);
      });

      expect(result.current.imageAssetId).toBe('asset-1');

      // Then select a file
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const event = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileInputChange(event);
      });

      expect(result.current.imageAssetId).toBeNull();
      expect(result.current.selectedImage).toBe(file);
    });
  });

  describe('Asset Selection', () => {
    it('should handle asset selection with thumbnail', () => {
      const { result } = renderHook(() => useImageInput());

      const asset = {
        id: 'asset-1',
        storage_url: 'https://example.com/image.png',
        metadata: { thumbnail: 'https://example.com/thumb.png' },
      };

      act(() => {
        result.current.handleAssetSelect(asset);
      });

      expect(result.current.imageAssetId).toBe('asset-1');
      expect(result.current.imagePreviewUrl).toBe('https://example.com/thumb.png');
      expect(result.current.selectedImage).toBeNull();
      expect(mockToast.success).toHaveBeenCalledWith('Image selected from library!');
    });

    it('should handle asset selection without thumbnail', () => {
      const { result } = renderHook(() => useImageInput());

      const asset = {
        id: 'asset-2',
        storage_url: 'https://example.com/image.png',
        metadata: null,
      };

      act(() => {
        result.current.handleAssetSelect(asset);
      });

      expect(result.current.imageAssetId).toBe('asset-2');
      expect(result.current.imagePreviewUrl).toBe('https://example.com/image.png');
    });

    it('should clear file selection when asset is selected', () => {
      const { result } = renderHook(() => useImageInput());

      // First select a file
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const event = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileInputChange(event);
      });

      expect(result.current.selectedImage).toBe(file);

      // Then select an asset
      const asset = {
        id: 'asset-1',
        storage_url: 'https://example.com/image.png',
        metadata: { thumbnail: 'https://example.com/thumb.png' },
      };

      act(() => {
        result.current.handleAssetSelect(asset);
      });

      expect(result.current.selectedImage).toBeNull();
      expect(result.current.imageAssetId).toBe('asset-1');
    });
  });

  describe('Clear Image', () => {
    it('should clear selected file and preview', () => {
      const { result } = renderHook(() => useImageInput());

      // Select a file
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const event = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileInputChange(event);
      });

      expect(result.current.selectedImage).toBe(file);
      expect(result.current.imagePreviewUrl).toBe('blob:mock-url');

      // Clear
      act(() => {
        result.current.clearImage();
      });

      expect(result.current.selectedImage).toBeNull();
      expect(result.current.imagePreviewUrl).toBeNull();
      expect(result.current.imageAssetId).toBeNull();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should clear selected asset', () => {
      const { result } = renderHook(() => useImageInput());

      // Select an asset
      const asset = {
        id: 'asset-1',
        storage_url: 'https://example.com/image.png',
        metadata: { thumbnail: 'https://example.com/thumb.png' },
      };

      act(() => {
        result.current.handleAssetSelect(asset);
      });

      expect(result.current.imageAssetId).toBe('asset-1');

      // Clear
      act(() => {
        result.current.clearImage();
      });

      expect(result.current.imageAssetId).toBeNull();
      expect(result.current.imagePreviewUrl).toBeNull();
    });

    it('should not error when clearing empty state', () => {
      const { result } = renderHook(() => useImageInput());

      act(() => {
        result.current.clearImage();
      });

      expect(result.current.selectedImage).toBeNull();
      expect(result.current.imagePreviewUrl).toBeNull();
    });
  });

  describe('Paste Event Handling', () => {
    it('should handle pasted images', () => {
      const { result } = renderHook(() => useImageInput());

      const file = new File(['test'], 'pasted.png', { type: 'image/png' });
      const mockItem = {
        type: 'image/png',
        getAsFile: jest.fn(() => file),
      };

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer(),
      });

      // Mock clipboardData
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          items: [mockItem],
        },
        writable: false,
      });

      act(() => {
        window.dispatchEvent(pasteEvent);
      });

      expect(result.current.selectedImage).toBe(file);
      expect(result.current.imagePreviewUrl).toBe('blob:mock-url');
      expect(mockToast.success).toHaveBeenCalledWith('Image pasted from clipboard!');
    });

    it('should ignore non-image paste events', () => {
      const { result } = renderHook(() => useImageInput());

      const mockItem = {
        type: 'text/plain',
        getAsFile: jest.fn(() => null),
      };

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer(),
      });

      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          items: [mockItem],
        },
        writable: false,
      });

      act(() => {
        window.dispatchEvent(pasteEvent);
      });

      expect(result.current.selectedImage).toBeNull();
      expect(mockToast.success).not.toHaveBeenCalledWith('Image pasted from clipboard!');
    });

    it('should handle paste events without clipboardData', () => {
      const { result } = renderHook(() => useImageInput());

      const pasteEvent = new ClipboardEvent('paste');

      act(() => {
        window.dispatchEvent(pasteEvent);
      });

      expect(result.current.selectedImage).toBeNull();
    });

    it('should cleanup paste listener on unmount', () => {
      const { result, unmount } = renderHook(() => useImageInput());

      unmount();

      const file = new File(['test'], 'pasted.png', { type: 'image/png' });
      const mockItem = {
        type: 'image/png',
        getAsFile: jest.fn(() => file),
      };

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer(),
      });

      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          items: [mockItem],
        },
        writable: false,
      });

      act(() => {
        window.dispatchEvent(pasteEvent);
      });

      expect(result.current.selectedImage).toBeNull();
    });
  });

  describe('Upload to Storage', () => {
    it('should upload image successfully', async () => {
      const { result } = renderHook(() => useImageInput());

      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const mockResponse = { assetId: 'uploaded-asset-123' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      let assetId: string | undefined;

      await act(async () => {
        assetId = await result.current.uploadImageToStorage(file, 'project-123');
      });

      expect(assetId).toBe('uploaded-asset-123');
      expect(global.fetch).toHaveBeenCalledWith('/api/assets/upload', {
        method: 'POST',
        body: expect.any(FormData),
      });

      // Verify FormData contents
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const formData = fetchCall[1].body as FormData;
      expect(formData.get('file')).toBe(file);
      expect(formData.get('projectId')).toBe('project-123');
      expect(formData.get('type')).toBe('image');
    });

    it('should handle upload errors', async () => {
      const { result } = renderHook(() => useImageInput());

      const file = new File(['test'], 'test.png', { type: 'image/png' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Upload failed' }),
      });

      await expect(result.current.uploadImageToStorage(file, 'project-123')).rejects.toThrow(
        'Upload failed'
      );
    });

    it('should handle network errors', async () => {
      const { result } = renderHook(() => useImageInput());

      const file = new File(['test'], 'test.png', { type: 'image/png' });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(result.current.uploadImageToStorage(file, 'project-123')).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle upload without error message', async () => {
      const { result } = renderHook(() => useImageInput());

      const file = new File(['test'], 'test.png', { type: 'image/png' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      await expect(result.current.uploadImageToStorage(file, 'project-123')).rejects.toThrow(
        'Failed to upload image'
      );
    });
  });

  describe('Uploading State', () => {
    it('should update uploading state', () => {
      const { result } = renderHook(() => useImageInput());

      expect(result.current.uploadingImage).toBe(false);

      act(() => {
        result.current.setUploadingImage(true);
      });

      expect(result.current.uploadingImage).toBe(true);

      act(() => {
        result.current.setUploadingImage(false);
      });

      expect(result.current.uploadingImage).toBe(false);
    });
  });

  describe('Memory Management', () => {
    it('should revoke old preview URL when selecting new image', () => {
      const { result } = renderHook(() => useImageInput());

      // Select first image
      const file1 = new File(['test1'], 'test1.png', { type: 'image/png' });
      const event1 = {
        target: { files: [file1] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      (URL.createObjectURL as jest.Mock).mockReturnValueOnce('blob:mock-url-1');

      act(() => {
        result.current.handleFileInputChange(event1);
      });

      expect(result.current.imagePreviewUrl).toBe('blob:mock-url-1');

      // Select second image
      const file2 = new File(['test2'], 'test2.png', { type: 'image/png' });
      const event2 = {
        target: { files: [file2] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      (URL.createObjectURL as jest.Mock).mockReturnValueOnce('blob:mock-url-2');

      act(() => {
        result.current.clearImage();
      });

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url-1');

      act(() => {
        result.current.handleFileInputChange(event2);
      });

      expect(result.current.imagePreviewUrl).toBe('blob:mock-url-2');
    });

    it('should not revoke URL when clearing without preview', () => {
      const { result } = renderHook(() => useImageInput());

      act(() => {
        result.current.clearImage();
      });

      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid file selections', () => {
      const { result } = renderHook(() => useImageInput());

      const file1 = new File(['test1'], 'test1.png', { type: 'image/png' });
      const file2 = new File(['test2'], 'test2.png', { type: 'image/png' });
      const file3 = new File(['test3'], 'test3.png', { type: 'image/png' });

      [file1, file2, file3].forEach((file, index) => {
        const event = {
          target: { files: [file] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;

        (URL.createObjectURL as jest.Mock).mockReturnValueOnce(`blob:mock-url-${index}`);

        act(() => {
          result.current.handleFileInputChange(event);
        });
      });

      expect(result.current.selectedImage).toBe(file3);
      expect(mockToast.success).toHaveBeenCalledTimes(3);
    });

    it('should handle asset selection after file selection', () => {
      const { result } = renderHook(() => useImageInput());

      // Select file
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const event = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileInputChange(event);
      });

      // Select asset
      const asset = {
        id: 'asset-1',
        storage_url: 'https://example.com/image.png',
        metadata: { thumbnail: 'https://example.com/thumb.png' },
      };

      act(() => {
        result.current.handleAssetSelect(asset);
      });

      expect(result.current.selectedImage).toBeNull();
      expect(result.current.imageAssetId).toBe('asset-1');
      expect(result.current.imagePreviewUrl).toBe('https://example.com/thumb.png');
    });

    it('should handle different image types', () => {
      const { result } = renderHook(() => useImageInput());

      const imageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

      imageTypes.forEach((type, index) => {
        const file = new File([`test${index}`], `test${index}.png`, { type });
        const event = {
          target: { files: [file] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;

        act(() => {
          result.current.handleFileInputChange(event);
        });

        expect(result.current.selectedImage?.type).toBe(type);
      });
    });
  });
});
