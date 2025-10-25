/**
 * Tests for Asset Utility Functions
 */

import {
  MIN_CLIP_DURATION,
  THUMBNAIL_WIDTH,
  coerceDuration,
  sanitizeFileName,
  extractFileName,
  isAssetType,
  getAssetTypeFromMimeType,
  parseAssetMetadata,
  mapAssetRow,
} from '@/lib/utils/assetUtils';

// Mock the supabase module
jest.mock(
  '@/lib/supabase',
  (): Record<string, unknown> => ({
    ensureHttpsProtocol: jest.fn((url: string) => {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
      }
      return url;
    }),
  })
);

describe('assetUtils', () => {
  describe('Constants', () => {
    it('should export MIN_CLIP_DURATION', () => {
      expect(MIN_CLIP_DURATION).toBeDefined();
      expect(typeof MIN_CLIP_DURATION).toBe('number');
      expect(MIN_CLIP_DURATION).toBeGreaterThan(0);
    });

    it('should export THUMBNAIL_WIDTH', () => {
      expect(THUMBNAIL_WIDTH).toBeDefined();
      expect(typeof THUMBNAIL_WIDTH).toBe('number');
      expect(THUMBNAIL_WIDTH).toBeGreaterThan(0);
    });
  });

  describe('coerceDuration', () => {
    it('should return number as-is when finite', () => {
      expect(coerceDuration(10.5)).toBe(10.5);
      expect(coerceDuration(0)).toBe(0);
      expect(coerceDuration(100)).toBe(100);
    });

    it('should parse valid string numbers', () => {
      expect(coerceDuration('10.5')).toBe(10.5);
      expect(coerceDuration('0')).toBe(0);
      expect(coerceDuration('100')).toBe(100);
    });

    it('should return null for non-finite numbers', () => {
      expect(coerceDuration(Infinity)).toBeNull();
      expect(coerceDuration(NaN)).toBeNull();
      expect(coerceDuration(-Infinity)).toBeNull();
    });

    it('should return null for invalid strings', () => {
      expect(coerceDuration('not a number')).toBeNull();
      expect(coerceDuration('abc123')).toBeNull();
      expect(coerceDuration('')).toBeNull();
    });

    it('should return null for other types', () => {
      expect(coerceDuration(null)).toBeNull();
      expect(coerceDuration(undefined)).toBeNull();
      expect(coerceDuration({})).toBeNull();
      expect(coerceDuration([])).toBeNull();
      expect(coerceDuration(true)).toBeNull();
    });

    it('should handle string with extra whitespace', () => {
      expect(coerceDuration('  10.5  ')).toBe(10.5);
    });

    it('should handle scientific notation', () => {
      expect(coerceDuration('1e2')).toBe(100);
      expect(coerceDuration('1.5e1')).toBe(15);
    });
  });

  describe('sanitizeFileName', () => {
    it('should preserve safe characters', () => {
      expect(sanitizeFileName('test.mp4')).toBe('test.mp4');
      expect(sanitizeFileName('video-file_123.mov')).toBe('video-file_123.mov');
    });

    it('should replace unsafe characters with underscores', () => {
      expect(sanitizeFileName('test file.mp4')).toBe('test_file.mp4');
      expect(sanitizeFileName('test/file.mp4')).toBe('test_file.mp4');
      expect(sanitizeFileName('test\\file.mp4')).toBe('test_file.mp4');
    });

    it('should handle multiple unsafe characters', () => {
      expect(sanitizeFileName('test@#$%^&*()file.mp4')).toBe('test_________file.mp4');
    });

    it('should trim whitespace', () => {
      expect(sanitizeFileName('  test.mp4  ')).toBe('test.mp4');
    });

    it('should return "asset" for empty or whitespace-only strings', () => {
      expect(sanitizeFileName('')).toBe('asset');
      expect(sanitizeFileName('   ')).toBe('asset');
    });

    it('should handle special characters', () => {
      expect(sanitizeFileName('test!@#$%^&*()file.mp4')).toBe('test__________file.mp4');
    });

    it('should preserve dots, hyphens, and underscores', () => {
      expect(sanitizeFileName('test-file_123.mp4')).toBe('test-file_123.mp4');
    });

    it('should handle unicode characters', () => {
      expect(sanitizeFileName('test\u00e9file.mp4')).toBe('test_file.mp4');
    });
  });

  describe('extractFileName', () => {
    it('should extract filename from standard path', () => {
      expect(extractFileName('/path/to/file.mp4')).toBe('file.mp4');
      expect(extractFileName('folder/subfolder/video.mov')).toBe('video.mov');
    });

    it('should extract filename from supabase:// protocol', () => {
      expect(extractFileName('supabase://bucket/user/project/video.mp4')).toBe('video.mp4');
    });

    it('should handle paths with leading slashes', () => {
      expect(extractFileName('///path/to/file.mp4')).toBe('file.mp4');
    });

    it('should return path as-is when no slashes', () => {
      expect(extractFileName('file.mp4')).toBe('file.mp4');
    });

    it('should handle empty path', () => {
      expect(extractFileName('')).toBe('');
    });

    it('should handle single filename', () => {
      expect(extractFileName('video.mp4')).toBe('video.mp4');
    });

    it('should handle complex storage URL', () => {
      expect(extractFileName('supabase://assets/user-123/project-456/image/test.jpg')).toBe(
        'test.jpg'
      );
    });
  });

  describe('isAssetType', () => {
    it('should return true for valid asset types', () => {
      expect(isAssetType('video')).toBe(true);
      expect(isAssetType('audio')).toBe(true);
      expect(isAssetType('image')).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(isAssetType('text')).toBe(false);
      expect(isAssetType('document')).toBe(false);
      expect(isAssetType('')).toBe(false);
      expect(isAssetType(null)).toBe(false);
      expect(isAssetType(undefined)).toBe(false);
      expect(isAssetType(123)).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isAssetType('Video')).toBe(false);
      expect(isAssetType('VIDEO')).toBe(false);
    });
  });

  describe('getAssetTypeFromMimeType', () => {
    it('should return "audio" for audio MIME types', () => {
      expect(getAssetTypeFromMimeType('audio/mp3')).toBe('audio');
      expect(getAssetTypeFromMimeType('audio/wav')).toBe('audio');
      expect(getAssetTypeFromMimeType('audio/ogg')).toBe('audio');
    });

    it('should return "image" for image MIME types', () => {
      expect(getAssetTypeFromMimeType('image/jpeg')).toBe('image');
      expect(getAssetTypeFromMimeType('image/png')).toBe('image');
      expect(getAssetTypeFromMimeType('image/gif')).toBe('image');
    });

    it('should return "video" for video MIME types', () => {
      expect(getAssetTypeFromMimeType('video/mp4')).toBe('video');
      expect(getAssetTypeFromMimeType('video/webm')).toBe('video');
      expect(getAssetTypeFromMimeType('video/quicktime')).toBe('video');
    });

    it('should return "video" for unknown MIME types', () => {
      expect(getAssetTypeFromMimeType('application/octet-stream')).toBe('video');
      expect(getAssetTypeFromMimeType('text/plain')).toBe('video');
      expect(getAssetTypeFromMimeType('')).toBe('video');
    });

    it('should handle case sensitivity', () => {
      expect(getAssetTypeFromMimeType('Audio/mp3')).toBe('video');
      expect(getAssetTypeFromMimeType('IMAGE/jpeg')).toBe('video');
    });
  });

  describe('parseAssetMetadata', () => {
    it('should return null for null metadata', () => {
      expect(parseAssetMetadata(null)).toBeNull();
    });

    it('should return null for empty metadata', () => {
      expect(parseAssetMetadata({})).toBeNull();
    });

    it('should parse filename', () => {
      const result = parseAssetMetadata({ filename: 'test.mp4' });
      expect(result).toEqual({ filename: 'test.mp4' });
    });

    it('should parse mimeType', () => {
      const result = parseAssetMetadata({ mimeType: 'video/mp4' });
      expect(result).toEqual({ mimeType: 'video/mp4' });
    });

    it('should parse thumbnail', () => {
      const result = parseAssetMetadata({ thumbnail: 'thumb.jpg' });
      expect(result).toEqual({ thumbnail: 'thumb.jpg' });
    });

    it('should parse sourceUrl and ensure HTTPS protocol', () => {
      const result = parseAssetMetadata({ sourceUrl: 'example.com/video.mp4' });
      expect(result).toEqual({ sourceUrl: 'https://example.com/video.mp4' });
    });

    it('should use source_url as fallback for sourceUrl', () => {
      const result = parseAssetMetadata({ source_url: 'example.com/video.mp4' });
      expect(result).toEqual({ sourceUrl: 'https://example.com/video.mp4' });
    });

    it('should parse durationSeconds from various field names', () => {
      expect(parseAssetMetadata({ durationSeconds: 10.5 })).toEqual({ durationSeconds: 10.5 });
      expect(parseAssetMetadata({ duration_seconds: 10.5 })).toEqual({ durationSeconds: 10.5 });
      expect(parseAssetMetadata({ duration: 10.5 })).toEqual({ durationSeconds: 10.5 });
      expect(parseAssetMetadata({ length: 10.5 })).toEqual({ durationSeconds: 10.5 });
    });

    it('should enforce minimum clip duration', () => {
      const result = parseAssetMetadata({ duration: 0.001 });
      expect(result?.durationSeconds).toBeGreaterThanOrEqual(MIN_CLIP_DURATION);
    });

    it('should trim string values', () => {
      const result = parseAssetMetadata({
        filename: '  test.mp4  ',
        mimeType: '  video/mp4  ',
        thumbnail: '  thumb.jpg  ',
      });
      expect(result).toEqual({
        filename: 'test.mp4',
        mimeType: 'video/mp4',
        thumbnail: 'thumb.jpg',
      });
    });

    it('should skip empty string values', () => {
      const result = parseAssetMetadata({
        filename: '',
        mimeType: '   ',
        thumbnail: 'thumb.jpg',
      });
      expect(result).toEqual({ thumbnail: 'thumb.jpg' });
    });

    it('should parse all fields together', () => {
      const result = parseAssetMetadata({
        filename: 'test.mp4',
        mimeType: 'video/mp4',
        thumbnail: 'thumb.jpg',
        sourceUrl: 'https://example.com/video.mp4',
        durationSeconds: 120.5,
      });
      expect(result).toEqual({
        filename: 'test.mp4',
        mimeType: 'video/mp4',
        thumbnail: 'thumb.jpg',
        sourceUrl: 'https://example.com/video.mp4',
        durationSeconds: 120.5,
      });
    });

    it('should prioritize durationSeconds over other duration fields', () => {
      const result = parseAssetMetadata({
        durationSeconds: 10,
        duration_seconds: 20,
        duration: 30,
        length: 40,
      });
      expect(result?.durationSeconds).toBe(10);
    });

    it('should handle non-string types gracefully', () => {
      const result = parseAssetMetadata({
        filename: 123,
        mimeType: null,
        thumbnail: undefined,
      });
      expect(result).toBeNull();
    });
  });

  describe('mapAssetRow', () => {
    it('should map valid asset row', () => {
      const row = {
        id: 'asset-123',
        storage_url: 'supabase://bucket/file.mp4',
        type: 'video',
        duration_seconds: 120.5,
        created_at: '2025-01-01T00:00:00Z',
        metadata: {
          filename: 'test.mp4',
          mimeType: 'video/mp4',
        },
      };

      const result = mapAssetRow(row);
      expect(result).toEqual({
        id: 'asset-123',
        storage_url: 'supabase://bucket/file.mp4',
        type: 'video',
        duration_seconds: 120.5,
        created_at: '2025-01-01T00:00:00Z',
        metadata: {
          filename: 'test.mp4',
          mimeType: 'video/mp4',
        },
        rawMetadata: null,
      });
    });

    it('should return null for missing required fields', () => {
      expect(mapAssetRow({})).toBeNull();
      expect(mapAssetRow({ id: 'asset-123' })).toBeNull();
      expect(mapAssetRow({ id: 'asset-123', storage_url: 'test.mp4' })).toBeNull();
    });

    it('should return null for invalid type', () => {
      const row = {
        id: 'asset-123',
        storage_url: 'test.mp4',
        type: 'invalid',
      };
      expect(mapAssetRow(row)).toBeNull();
    });

    it('should use metadata duration if duration_seconds is missing', () => {
      const row = {
        id: 'asset-123',
        storage_url: 'test.mp4',
        type: 'video',
        metadata: {
          durationSeconds: 60,
        },
      };

      const result = mapAssetRow(row);
      expect(result?.duration_seconds).toBe(60);
    });

    it('should prioritize duration_seconds over metadata duration', () => {
      const row = {
        id: 'asset-123',
        storage_url: 'test.mp4',
        type: 'video',
        duration_seconds: 120,
        metadata: {
          durationSeconds: 60,
        },
      };

      const result = mapAssetRow(row);
      expect(result?.duration_seconds).toBe(120);
    });

    it('should handle missing metadata', () => {
      const row = {
        id: 'asset-123',
        storage_url: 'test.mp4',
        type: 'video',
      };

      const result = mapAssetRow(row);
      expect(result?.metadata).toBeNull();
    });

    it('should handle different asset types', () => {
      const types = ['video', 'audio', 'image'] as const;
      types.forEach((type) => {
        const row = {
          id: `asset-${type}`,
          storage_url: `test.${type}`,
          type,
        };
        const result = mapAssetRow(row);
        expect(result?.type).toBe(type);
      });
    });

    it('should handle non-finite duration_seconds', () => {
      const row = {
        id: 'asset-123',
        storage_url: 'test.mp4',
        type: 'video',
        duration_seconds: Infinity,
      };

      const result = mapAssetRow(row);
      expect(result?.duration_seconds).toBeNull();
    });

    it('should include rawMetadata if present', () => {
      const row = {
        id: 'asset-123',
        storage_url: 'test.mp4',
        type: 'video',
        rawMetadata: { custom: 'data' },
      };

      const result = mapAssetRow(row);
      expect(result?.rawMetadata).toEqual({ custom: 'data' });
    });

    it('should handle invalid field types gracefully', () => {
      const row = {
        id: 123,
        storage_url: null,
        type: 'video',
      };

      expect(mapAssetRow(row)).toBeNull();
    });
  });
});
