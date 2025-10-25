/**
 * Tests for AssetOptimizationService
 *
 * Tests all asset optimization functionality including:
 * - Image optimization (compression, format conversion)
 * - Video thumbnail generation
 * - Audio waveform generation
 * - Lazy loading determination
 * - Error handling and graceful degradation
 *
 * Follows AAA pattern (Arrange-Act-Assert)
 */

import { AssetOptimizationService } from '@/lib/services/assetOptimizationService';

// Mock serverLogger
jest.mock(
  '@/lib/serverLogger',
  () => ({
    serverLogger: {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    },
  })
);

// Mock Sharp
const mockSharp = jest.fn();
const mockRotate = jest.fn().mockReturnThis();
const mockResize = jest.fn().mockReturnThis();
const mockJpeg = jest.fn().mockReturnThis();
const mockWebp = jest.fn().mockReturnThis();
const mockAvif = jest.fn().mockReturnThis();
const mockPng = jest.fn().mockReturnThis();
const mockToBuffer = jest.fn();
const mockMetadata = jest.fn();

jest.mock('sharp', () => {
  return jest.fn(() => ({
    rotate: mockRotate,
    resize: mockResize,
    jpeg: mockJpeg,
    webp: mockWebp,
    avif: mockAvif,
    png: mockPng,
    toBuffer: mockToBuffer,
    metadata: mockMetadata,
  }));
});

// Mock ThumbnailService
const mockGenerateVideoThumbnailDataURL = jest.fn();
const mockGetVideoDuration = jest.fn();

jest.mock(
  '@/lib/services/thumbnailService',
  () => ({
    ThumbnailService: jest.fn().mockImplementation(() => ({
      generateVideoThumbnailDataURL: mockGenerateVideoThumbnailDataURL,
      getVideoDuration: mockGetVideoDuration,
    })),
  })
);

// Mock child_process
const mockExec = jest.fn();
jest.mock(
  'child_process',
  () => ({
    exec: mockExec,
  })
);

jest.mock(
  'util',
  () => ({
    promisify: (fn: any) => fn,
  })
);

// Mock fs/promises
const mockWriteFile = jest.fn();
const mockUnlink = jest.fn();
jest.mock(
  'fs/promises',
  () => ({
    writeFile: mockWriteFile,
    unlink: mockUnlink,
  })
);

describe('AssetOptimizationService', () => {
  let service: AssetOptimizationService;

  beforeEach((): void => {
    jest.clearAllMocks();
    service = new AssetOptimizationService();

    // Setup default Sharp mock behavior
    mockMetadata.mockResolvedValue({
      width: 1920,
      height: 1080,
      format: 'jpeg',
    });

    mockToBuffer.mockResolvedValue(Buffer.from('optimized-image'));
  });

  describe('optimizeImage', () => {
    it('should optimize image with default options', async () => {
      // Arrange
      const inputBuffer = Buffer.from('original-image');

      // Act
      const result = await service.optimizeImage(inputBuffer);

      // Assert
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.metadata.width).toBe(1920);
      expect(result.metadata.height).toBe(1080);
      expect(result.metadata.format).toBe('jpeg');
      expect(mockRotate).toHaveBeenCalled();
      expect(mockJpeg).toHaveBeenCalledWith({ quality: 85, mozjpeg: true });
    });

    it('should optimize image with custom options', async () => {
      // Arrange
      const inputBuffer = Buffer.from('original-image');
      const options = {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 90,
        format: 'webp' as const,
      };

      // Act
      const result = await service.optimizeImage(inputBuffer, options);

      // Assert
      expect(mockWebp).toHaveBeenCalledWith({ quality: 90 });
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should resize large images', async () => {
      // Arrange
      const inputBuffer = Buffer.from('large-image');
      mockMetadata.mockResolvedValueOnce({
        width: 4000,
        height: 3000,
        format: 'jpeg',
      });

      // Act
      await service.optimizeImage(inputBuffer, {
        maxWidth: 1920,
        maxHeight: 1080,
      });

      // Assert
      expect(mockResize).toHaveBeenCalledWith(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    });

    it('should not resize images within limits', async () => {
      // Arrange
      const inputBuffer = Buffer.from('small-image');
      mockMetadata.mockResolvedValueOnce({
        width: 800,
        height: 600,
        format: 'jpeg',
      });

      // Act
      await service.optimizeImage(inputBuffer, {
        maxWidth: 1920,
        maxHeight: 1080,
      });

      // Assert
      expect(mockResize).not.toHaveBeenCalled();
    });

    it('should convert to JPEG format', async () => {
      // Arrange
      const inputBuffer = Buffer.from('image');

      // Act
      await service.optimizeImage(inputBuffer, { format: 'jpeg', quality: 80 });

      // Assert
      expect(mockJpeg).toHaveBeenCalledWith({ quality: 80, mozjpeg: true });
    });

    it('should convert to WebP format', async () => {
      // Arrange
      const inputBuffer = Buffer.from('image');

      // Act
      await service.optimizeImage(inputBuffer, { format: 'webp', quality: 85 });

      // Assert
      expect(mockWebp).toHaveBeenCalledWith({ quality: 85 });
    });

    it('should convert to AVIF format', async () => {
      // Arrange
      const inputBuffer = Buffer.from('image');

      // Act
      await service.optimizeImage(inputBuffer, { format: 'avif', quality: 75 });

      // Assert
      expect(mockAvif).toHaveBeenCalledWith({ quality: 75 });
    });

    it('should convert to PNG format', async () => {
      // Arrange
      const inputBuffer = Buffer.from('image');

      // Act
      await service.optimizeImage(inputBuffer, { format: 'png' });

      // Assert
      expect(mockPng).toHaveBeenCalledWith({ compressionLevel: 9 });
    });

    it('should auto-rotate based on EXIF', async () => {
      // Arrange
      const inputBuffer = Buffer.from('image-with-exif');

      // Act
      await service.optimizeImage(inputBuffer);

      // Assert
      expect(mockRotate).toHaveBeenCalled();
    });

    it('should return original buffer on optimization failure', async () => {
      // Arrange
      const inputBuffer = Buffer.from('image');
      mockRotate.mockImplementationOnce(() => {
        throw new Error('Sharp error');
      });

      // Act
      const result = await service.optimizeImage(inputBuffer);

      // Assert
      expect(result.buffer).toBe(inputBuffer);
      expect(result.metadata).toEqual({});
    });

    it('should include size in metadata', async () => {
      // Arrange
      const inputBuffer = Buffer.from('image');
      const optimizedBuffer = Buffer.from('optimized-12345');
      mockToBuffer.mockResolvedValueOnce(optimizedBuffer);
      mockMetadata
        .mockResolvedValueOnce({ width: 1920, height: 1080, format: 'jpeg' })
        .mockResolvedValueOnce({ width: 1280, height: 720, format: 'jpeg' });

      // Act
      const result = await service.optimizeImage(inputBuffer);

      // Assert
      expect(result.metadata.size).toBe(optimizedBuffer.length);
    });
  });

  describe('generateVideoThumbnails', () => {
    it('should generate single thumbnail with default options', async () => {
      // Arrange
      const videoBuffer = Buffer.from('video-data');
      mockGenerateVideoThumbnailDataURL.mockResolvedValueOnce('data:image/jpeg;base64,abcd');

      // Act
      const result = await service.generateVideoThumbnails(videoBuffer);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('data:image/jpeg;base64,abcd');
      expect(mockGenerateVideoThumbnailDataURL).toHaveBeenCalledWith(videoBuffer, {
        timestamp: 1.0,
        width: 320,
        quality: 80,
      });
    });

    it('should generate single thumbnail with custom options', async () => {
      // Arrange
      const videoBuffer = Buffer.from('video-data');
      mockGenerateVideoThumbnailDataURL.mockResolvedValueOnce('data:image/jpeg;base64,efgh');

      // Act
      const result = await service.generateVideoThumbnails(videoBuffer, {
        timestamp: 2.5,
        width: 640,
        quality: 90,
        count: 1,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(mockGenerateVideoThumbnailDataURL).toHaveBeenCalledWith(videoBuffer, {
        timestamp: 2.5,
        width: 640,
        quality: 90,
      });
    });

    it('should generate multiple thumbnails at intervals', async () => {
      // Arrange
      const videoBuffer = Buffer.from('video-data');
      mockGetVideoDuration.mockResolvedValueOnce(10); // 10 second video
      mockGenerateVideoThumbnailDataURL
        .mockResolvedValueOnce('data:image/jpeg;base64,thumb1')
        .mockResolvedValueOnce('data:image/jpeg;base64,thumb2')
        .mockResolvedValueOnce('data:image/jpeg;base64,thumb3');

      // Act
      const result = await service.generateVideoThumbnails(videoBuffer, {
        count: 3,
      });

      // Assert
      expect(result).toHaveLength(3);
      expect(mockGetVideoDuration).toHaveBeenCalledWith(videoBuffer);
      expect(mockGenerateVideoThumbnailDataURL).toHaveBeenCalledTimes(3);
    });

    it('should skip failed thumbnail frames', async () => {
      // Arrange
      const videoBuffer = Buffer.from('video-data');
      mockGetVideoDuration.mockResolvedValueOnce(10);
      mockGenerateVideoThumbnailDataURL
        .mockResolvedValueOnce('data:image/jpeg;base64,thumb1')
        .mockRejectedValueOnce(new Error('Frame extraction failed'))
        .mockResolvedValueOnce('data:image/jpeg;base64,thumb3');

      // Act
      const result = await service.generateVideoThumbnails(videoBuffer, {
        count: 3,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('data:image/jpeg;base64,thumb1');
      expect(result[1]).toBe('data:image/jpeg;base64,thumb3');
    });

    it('should return empty array on complete failure', async () => {
      // Arrange
      const videoBuffer = Buffer.from('video-data');
      mockGenerateVideoThumbnailDataURL.mockRejectedValueOnce(new Error('Failed'));

      // Act
      const result = await service.generateVideoThumbnails(videoBuffer);

      // Assert
      expect(result).toEqual([]);
    });

    it('should calculate correct intervals for multiple thumbnails', async () => {
      // Arrange
      const videoBuffer = Buffer.from('video-data');
      mockGetVideoDuration.mockResolvedValueOnce(12); // 12 second video
      mockGenerateVideoThumbnailDataURL.mockResolvedValue('data:image/jpeg;base64,thumb');

      // Act
      await service.generateVideoThumbnails(videoBuffer, {
        count: 3,
        width: 320,
        quality: 80,
      });

      // Assert
      // Interval should be 12 / (3 + 1) = 3 seconds
      // Thumbnails at 3s, 6s, 9s
      expect(mockGenerateVideoThumbnailDataURL).toHaveBeenNthCalledWith(1, videoBuffer, {
        timestamp: 3,
        width: 320,
        quality: 80,
      });
      expect(mockGenerateVideoThumbnailDataURL).toHaveBeenNthCalledWith(2, videoBuffer, {
        timestamp: 6,
        width: 320,
        quality: 80,
      });
      expect(mockGenerateVideoThumbnailDataURL).toHaveBeenNthCalledWith(3, videoBuffer, {
        timestamp: 9,
        width: 320,
        quality: 80,
      });
    });
  });

  describe('generateAudioWaveform', () => {
    it('should generate waveform with default options', async () => {
      // Arrange
      const audioBuffer = Buffer.from('audio-data');
      mockExec
        .mockImplementationOnce(
          (
            cmd: string,
            callback: (err: Error | null, result?: { stdout: string; stderr?: string }) => void
          ) => {
            callback(null, { stdout: 'Duration: 00:02:30.50' });
          }
        )
        .mockImplementationOnce(
          (
            cmd: string,
            callback: (err: Error | null, result?: { stdout: string; stderr?: string }) => void
          ) => {
            const amplitudes = Array.from({ length: 1000 }, (_, i) => i % 10).join('\n');
            callback(null, { stdout: amplitudes });
          }
        );

      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);

      // Act
      const result = await service.generateAudioWaveform(audioBuffer);

      // Assert
      expect(result.waveform).toHaveLength(1000);
      expect(result.peaks.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should use custom options', async () => {
      // Arrange
      const audioBuffer = Buffer.from('audio-data');
      mockExec.mockImplementation(
        (
          cmd: string,
          callback: (err: Error | null, result?: { stdout: string; stderr?: string }) => void
        ) => {
          if (cmd.includes('Duration')) {
            callback(null, { stdout: 'Duration: 00:01:00.00' });
          } else {
            const amplitudes = Array.from({ length: 500 }, () => '0.5').join('\n');
            callback(null, { stdout: amplitudes });
          }
        }
      );

      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);

      // Act
      const result = await service.generateAudioWaveform(audioBuffer, {
        samples: 500,
        width: 500,
        height: 50,
      });

      // Assert
      expect(result.waveform.length).toBeLessThanOrEqual(500);
    });

    it('should generate dummy waveform on failure', async () => {
      // Arrange
      const audioBuffer = Buffer.from('audio-data');
      mockExec.mockImplementation(
        (
          cmd: string,
          callback: (err: Error | null, result?: { stdout: string; stderr?: string }) => void
        ) => {
          callback(new Error('FFmpeg failed'), { stdout: '' });
        }
      );

      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);

      // Act
      const result = await service.generateAudioWaveform(audioBuffer);

      // Assert
      expect(result.waveform).toHaveLength(1000);
      expect(result.peaks).toEqual([]);
      expect(result.duration).toBe(0);
    });

    it('should clean up temp files', async () => {
      // Arrange
      const audioBuffer = Buffer.from('audio-data');
      mockExec.mockImplementation(
        (
          cmd: string,
          callback: (err: Error | null, result?: { stdout: string; stderr?: string }) => void
        ) => {
          callback(null, { stdout: 'Duration: 00:01:00.00' });
        }
      );

      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);

      // Act
      await service.generateAudioWaveform(audioBuffer);

      // Assert
      expect(mockUnlink).toHaveBeenCalledTimes(2); // input and output files
    });

    it('should handle temp file cleanup errors gracefully', async () => {
      // Arrange
      const audioBuffer = Buffer.from('audio-data');
      mockExec.mockImplementation(
        (
          cmd: string,
          callback: (err: Error | null, result?: { stdout: string; stderr?: string }) => void
        ) => {
          callback(null, { stdout: 'Duration: 00:01:00.00' });
        }
      );

      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockRejectedValue(new Error('File not found'));

      // Act & Assert
      await expect(service.generateAudioWaveform(audioBuffer)).resolves.toBeDefined();
    });

    it('should parse duration correctly', async () => {
      // Arrange
      const audioBuffer = Buffer.from('audio-data');
      mockExec
        .mockImplementationOnce(
          (
            cmd: string,
            callback: (err: Error | null, result?: { stdout: string; stderr?: string }) => void
          ) => {
            callback(null, { stdout: 'Duration: 00:05:45.30' });
          }
        )
        .mockImplementationOnce(
          (
            cmd: string,
            callback: (err: Error | null, result?: { stdout: string; stderr?: string }) => void
          ) => {
            callback(null, { stdout: '' });
          }
        );

      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);

      // Act
      const result = await service.generateAudioWaveform(audioBuffer);

      // Assert
      // 5 minutes + 45 seconds + 0.30 seconds = 345.30 seconds
      expect(result.duration).toBeGreaterThan(345);
      expect(result.duration).toBeLessThan(346);
    });

    it('should calculate peaks from waveform', async () => {
      // Arrange
      const audioBuffer = Buffer.from('audio-data');
      mockExec
        .mockImplementationOnce(
          (
            cmd: string,
            callback: (err: Error | null, result?: { stdout: string; stderr?: string }) => void
          ) => {
            callback(null, { stdout: 'Duration: 00:01:00.00' });
          }
        )
        .mockImplementationOnce(
          (
            cmd: string,
            callback: (err: Error | null, result?: { stdout: string; stderr?: string }) => void
          ) => {
            // Generate 1000 samples with known pattern
            const amplitudes = Array.from({ length: 1000 }, (_, i) =>
              (Math.sin(i / 10) * 0.5 + 0.5).toFixed(2)
            ).join('\n');
            callback(null, { stdout: amplitudes });
          }
        );

      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);

      // Act
      const result = await service.generateAudioWaveform(audioBuffer);

      // Assert
      expect(result.peaks.length).toBeGreaterThan(0);
      expect(Math.max(...result.peaks)).toBeLessThanOrEqual(1);
      expect(Math.min(...result.peaks)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('shouldLazyLoad', () => {
    it('should lazy load large images', () => {
      // Arrange
      const size = 6 * 1024 * 1024; // 6 MB

      // Act
      const result = service.shouldLazyLoad(size, 'image');

      // Assert
      expect(result).toBe(true);
    });

    it('should not lazy load small images', () => {
      // Arrange
      const size = 3 * 1024 * 1024; // 3 MB

      // Act
      const result = service.shouldLazyLoad(size, 'image');

      // Assert
      expect(result).toBe(false);
    });

    it('should lazy load large videos', () => {
      // Arrange
      const size = 25 * 1024 * 1024; // 25 MB

      // Act
      const result = service.shouldLazyLoad(size, 'video');

      // Assert
      expect(result).toBe(true);
    });

    it('should not lazy load small videos', () => {
      // Arrange
      const size = 15 * 1024 * 1024; // 15 MB

      // Act
      const result = service.shouldLazyLoad(size, 'video');

      // Assert
      expect(result).toBe(false);
    });

    it('should lazy load large audio files', () => {
      // Arrange
      const size = 12 * 1024 * 1024; // 12 MB

      // Act
      const result = service.shouldLazyLoad(size, 'audio');

      // Assert
      expect(result).toBe(true);
    });

    it('should not lazy load small audio files', () => {
      // Arrange
      const size = 8 * 1024 * 1024; // 8 MB

      // Act
      const result = service.shouldLazyLoad(size, 'audio');

      // Assert
      expect(result).toBe(false);
    });

    it('should use default threshold for unknown types', () => {
      // Arrange
      const size = 6 * 1024 * 1024; // 6 MB

      // Act
      const result = service.shouldLazyLoad(size, 'unknown');

      // Assert
      expect(result).toBe(true); // Uses default 5 MB threshold
    });

    it('should handle edge case at threshold boundary', () => {
      // Arrange
      const exactThreshold = 5 * 1024 * 1024; // Exactly 5 MB

      // Act
      const result = service.shouldLazyLoad(exactThreshold, 'image');

      // Assert
      expect(result).toBe(false); // Not greater than threshold
    });
  });

  describe('Edge cases', () => {
    it('should handle zero-size files', () => {
      // Arrange & Act
      const result = service.shouldLazyLoad(0, 'image');

      // Assert
      expect(result).toBe(false);
    });

    it('should handle extremely large files', () => {
      // Arrange
      const size = 1024 * 1024 * 1024; // 1 GB

      // Act
      const result = service.shouldLazyLoad(size, 'video');

      // Assert
      expect(result).toBe(true);
    });

    it('should handle empty buffer for image optimization', async () => {
      // Arrange
      const emptyBuffer = Buffer.from('');
      mockRotate.mockImplementationOnce(() => {
        throw new Error('Invalid buffer');
      });

      // Act
      const result = await service.optimizeImage(emptyBuffer);

      // Assert
      expect(result.buffer).toBe(emptyBuffer);
      expect(result.metadata).toEqual({});
    });
  });
});
