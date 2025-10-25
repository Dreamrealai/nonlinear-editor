/**
 * Tests for ThumbnailService
 *
 * Tests all thumbnail generation functionality including:
 * - FFmpeg availability checking
 * - Video thumbnail generation
 * - Image thumbnail generation
 * - Data URL generation
 * - Error handling and cleanup
 * - Video duration extraction
 *
 * Follows AAA pattern (Arrange-Act-Assert)
 */

import { ThumbnailService } from '@/lib/services/thumbnailService';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';

// Mock dependencies
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn),
}));

jest.mock('../errorTracking', () => ({
  trackError: jest.fn(),
  ErrorCategory: {
    EXTERNAL_SERVICE: 'EXTERNAL_SERVICE',
  },
  ErrorSeverity: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
  },
}));

// Mock fs
const mockWriteFile = jest.fn();
const mockReadFile = jest.fn();
const mockUnlink = jest.fn();
const mockExistsSync = jest.fn();

jest.mock('fs', () => ({
  promises: {
    writeFile: mockWriteFile,
    readFile: mockReadFile,
    unlink: mockUnlink,
  },
  existsSync: mockExistsSync,
}));

const mockExec = exec as unknown as jest.Mock;

describe('ThumbnailService', () => {
  let service: ThumbnailService;
  let testImageBuffer: Buffer;

  beforeEach(async () => {
    jest.clearAllMocks();
    service = new ThumbnailService();

    // Create a valid test image using sharp
    testImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    // Mock fs defaults
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(testImageBuffer);
    mockUnlink.mockResolvedValue(undefined);
    mockExistsSync.mockReturnValue(true);
  });

  describe('checkFFmpegAvailable', () => {
    it('should return true if FFmpeg is available', async () => {
      // Arrange
      mockExec.mockImplementationOnce(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          callback(null, { stdout: 'ffmpeg version 4.4.0' });
        }
      );

      // Act
      const available = await service.checkFFmpegAvailable();

      // Assert
      expect(available).toBe(true);
      expect(mockExec).toHaveBeenCalledWith('ffmpeg -version', expect.any(Function));
    });

    it('should return false if FFmpeg is not available', async () => {
      // Arrange
      mockExec.mockImplementationOnce(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          callback(new Error('Command not found'), null);
        }
      );

      // Act
      const available = await service.checkFFmpegAvailable();

      // Assert
      expect(available).toBe(false);
    });
  });

  describe('generateVideoThumbnail', () => {
    it('should generate video thumbnail with default options', async () => {
      // Arrange
      mockExec.mockImplementation(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          if (cmd.includes('ffmpeg -version')) {
            callback(null, { stdout: 'ffmpeg version 4.4.0' });
          } else {
            callback(null, { stdout: '' });
          }
        }
      );

      // Act
      const result = await service.generateVideoThumbnail(testImageBuffer);

      // Assert
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.metadata.format).toBe('jpeg');
      expect(result.metadata.timestamp).toBe(1.0);
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockReadFile).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalledTimes(2); // video and thumbnail
    });

    it('should throw error if FFmpeg not available', async () => {
      // Arrange
      mockExec.mockImplementationOnce(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          callback(new Error('Command not found'), null);
        }
      );

      // Act & Assert
      await expect(service.generateVideoThumbnail(testImageBuffer)).rejects.toThrow(
        'FFmpeg is not available on this system'
      );
    });

    it('should use custom timestamp', async () => {
      // Arrange
      mockExec.mockImplementation(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          if (cmd.includes('ffmpeg -version')) {
            callback(null, { stdout: 'ffmpeg version 4.4.0' });
          } else {
            expect(cmd).toContain('-ss 5.5');
            callback(null, { stdout: '' });
          }
        }
      );

      // Act
      const result = await service.generateVideoThumbnail(testImageBuffer, {
        timestamp: 5.5,
      });

      // Assert
      expect(result.metadata.timestamp).toBe(5.5);
    });

    it('should use custom width', async () => {
      // Arrange
      mockExec.mockImplementation(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          if (cmd.includes('ffmpeg -version')) {
            callback(null, { stdout: 'ffmpeg version 4.4.0' });
          } else {
            expect(cmd).toContain('scale=640:-1');
            callback(null, { stdout: '' });
          }
        }
      );

      // Act
      await service.generateVideoThumbnail(testImageBuffer, {
        width: 640,
      });

      // Assert
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('scale=640:-1'),
        expect.any(Function)
      );
    });

    it('should use custom width and height', async () => {
      // Arrange
      mockExec.mockImplementation(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          if (cmd.includes('ffmpeg -version')) {
            callback(null, { stdout: 'ffmpeg version 4.4.0' });
          } else {
            expect(cmd).toContain('scale=800:600');
            callback(null, { stdout: '' });
          }
        }
      );

      // Act
      await service.generateVideoThumbnail(testImageBuffer, {
        width: 800,
        height: 600,
      });

      // Assert
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('scale=800:600'),
        expect.any(Function)
      );
    });

    it('should clean up temp files on success', async () => {
      // Arrange
      mockExec.mockImplementation(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          if (cmd.includes('ffmpeg -version')) {
            callback(null, { stdout: 'ffmpeg version 4.4.0' });
          } else {
            callback(null, { stdout: '' });
          }
        }
      );

      // Act
      await service.generateVideoThumbnail(testImageBuffer);

      // Assert
      expect(mockUnlink).toHaveBeenCalledTimes(2);
      expect(mockExistsSync).toHaveBeenCalledTimes(2);
    });

    it('should clean up temp files on error', async () => {
      // Arrange
      mockExec.mockImplementation(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          if (cmd.includes('ffmpeg -version')) {
            callback(null, { stdout: 'ffmpeg version 4.4.0' });
          } else {
            callback(new Error('FFmpeg failed'), null);
          }
        }
      );

      // Act & Assert
      await expect(service.generateVideoThumbnail(testImageBuffer)).rejects.toThrow(
        'Failed to generate video thumbnail'
      );
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      // Arrange
      mockExec.mockImplementation(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          if (cmd.includes('ffmpeg -version')) {
            callback(null, { stdout: 'ffmpeg version 4.4.0' });
          } else {
            callback(null, { stdout: '' });
          }
        }
      );
      mockUnlink.mockRejectedValueOnce(new Error('Cleanup failed'));

      // Act
      await service.generateVideoThumbnail(testImageBuffer);

      // Assert - should not throw
      expect(mockUnlink).toHaveBeenCalled();
    });
  });

  describe('generateVideoThumbnailSequence', () => {
    it('should generate multiple thumbnails at different timestamps', async () => {
      // Arrange
      mockExec.mockImplementation(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          if (cmd.includes('ffmpeg -version')) {
            callback(null, { stdout: 'ffmpeg version 4.4.0' });
          } else {
            callback(null, { stdout: '' });
          }
        }
      );

      // Act
      const results = await service.generateVideoThumbnailSequence(testImageBuffer, [1, 5, 10]);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].metadata.timestamp).toBe(1);
      expect(results[1].metadata.timestamp).toBe(5);
      expect(results[2].metadata.timestamp).toBe(10);
    });

    it('should continue on individual failures', async () => {
      // Arrange
      let callCount = 0;
      mockExec.mockImplementation(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          if (cmd.includes('ffmpeg -version')) {
            callback(null, { stdout: 'ffmpeg version 4.4.0' });
          } else {
            callCount++;
            if (callCount === 2) {
              // Fail the second timestamp
              callback(new Error('FFmpeg failed'), null);
            } else {
              callback(null, { stdout: '' });
            }
          }
        }
      );

      // Act
      const results = await service.generateVideoThumbnailSequence(testImageBuffer, [1, 5, 10]);

      // Assert
      expect(results).toHaveLength(2); // Only 2 successful
    });

    it('should return empty array if all fail', async () => {
      // Arrange
      mockExec.mockImplementation(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          if (cmd.includes('ffmpeg -version')) {
            callback(null, { stdout: 'ffmpeg version 4.4.0' });
          } else {
            callback(new Error('FFmpeg failed'), null);
          }
        }
      );

      // Act
      const results = await service.generateVideoThumbnailSequence(testImageBuffer, [1, 5]);

      // Assert
      expect(results).toHaveLength(0);
    });
  });

  describe('generateImageThumbnail', () => {
    it('should generate thumbnail from image buffer', async () => {
      // Act
      const result = await service.generateImageThumbnail(testImageBuffer, {
        width: 100,
        quality: 80,
      });

      // Assert
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.metadata.width).toBeLessThanOrEqual(100);
      expect(result.metadata.format).toBe('jpeg');
      expect(result.metadata.size).toBeGreaterThan(0);
    });

    it('should handle custom dimensions with cover fit', async () => {
      // Act
      const result = await service.generateImageThumbnail(testImageBuffer, {
        width: 200,
        height: 150,
        quality: 90,
      });

      // Assert
      expect(result.metadata.width).toBeLessThanOrEqual(200);
      expect(result.metadata.height).toBeLessThanOrEqual(150);
    });

    it('should use default width and quality', async () => {
      // Act
      const result = await service.generateImageThumbnail(testImageBuffer);

      // Assert
      expect(result.metadata.width).toBeLessThanOrEqual(320);
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should handle sharp errors gracefully', async () => {
      // Arrange
      const invalidBuffer = Buffer.from('not-an-image');

      // Act & Assert
      await expect(service.generateImageThumbnail(invalidBuffer)).rejects.toThrow(
        'Failed to generate image thumbnail'
      );
    });
  });

  describe('getVideoDuration', () => {
    it('should return video duration', async () => {
      // Arrange
      mockExec.mockImplementationOnce(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          callback(null, { stdout: '120.50\n' });
        }
      );

      // Act
      const duration = await service.getVideoDuration(testImageBuffer);

      // Assert
      expect(duration).toBe(120.5);
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('should return 0 on error', async () => {
      // Arrange
      mockExec.mockImplementationOnce(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          callback(new Error('FFprobe failed'), null);
        }
      );

      // Act
      const duration = await service.getVideoDuration(testImageBuffer);

      // Assert
      expect(duration).toBe(0);
    });

    it('should return 0 for invalid duration', async () => {
      // Arrange
      mockExec.mockImplementationOnce(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          callback(null, { stdout: 'invalid\n' });
        }
      );

      // Act
      const duration = await service.getVideoDuration(testImageBuffer);

      // Assert
      expect(duration).toBe(0);
    });

    it('should clean up temp file even on error', async () => {
      // Arrange
      mockExec.mockImplementationOnce(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          callback(new Error('FFprobe failed'), null);
        }
      );

      // Act
      await service.getVideoDuration(testImageBuffer);

      // Assert
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('should ignore cleanup errors', async () => {
      // Arrange
      mockExec.mockImplementationOnce(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          callback(null, { stdout: '60.0\n' });
        }
      );
      mockUnlink.mockRejectedValueOnce(new Error('Cleanup failed'));

      // Act
      const duration = await service.getVideoDuration(testImageBuffer);

      // Assert - should not throw
      expect(duration).toBe(60);
    });
  });

  describe('generateVideoThumbnailDataURL', () => {
    it('should generate base64 data URL from video', async () => {
      // Arrange
      mockExec.mockImplementation(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          if (cmd.includes('ffmpeg -version')) {
            callback(null, { stdout: 'ffmpeg version 4.4.0' });
          } else {
            callback(null, { stdout: '' });
          }
        }
      );

      // Act
      const dataURL = await service.generateVideoThumbnailDataURL(testImageBuffer);

      // Assert
      expect(dataURL).toMatch(/^data:image\/jpeg;base64,/);
      expect(dataURL.length).toBeGreaterThan(50);
    });

    it('should pass through options', async () => {
      // Arrange
      mockExec.mockImplementation(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          if (cmd.includes('ffmpeg -version')) {
            callback(null, { stdout: 'ffmpeg version 4.4.0' });
          } else {
            expect(cmd).toContain('-ss 3.5');
            callback(null, { stdout: '' });
          }
        }
      );

      // Act
      await service.generateVideoThumbnailDataURL(testImageBuffer, {
        timestamp: 3.5,
        width: 480,
      });

      // Assert
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('scale=480:-1'),
        expect.any(Function)
      );
    });
  });

  describe('generateImageThumbnailDataURL', () => {
    it('should generate base64 data URL from image', async () => {
      // Act
      const dataURL = await service.generateImageThumbnailDataURL(testImageBuffer);

      // Assert
      expect(dataURL).toMatch(/^data:image\/jpeg;base64,/);
      expect(dataURL.length).toBeGreaterThan(50);
    });

    it('should pass through options', async () => {
      // Act
      const dataURL = await service.generateImageThumbnailDataURL(testImageBuffer, {
        width: 160,
        quality: 60,
      });

      // Assert
      expect(dataURL).toMatch(/^data:image\/jpeg;base64,/);
      const buffer = Buffer.from(dataURL.split(',')[1], 'base64');
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle very small images', async () => {
      // Arrange
      const tinyImage = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 3,
          background: { r: 0, g: 0, b: 255 },
        },
      })
        .png()
        .toBuffer();

      // Act
      const result = await service.generateImageThumbnail(tinyImage, {
        width: 320,
      });

      // Assert
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should handle quality extremes', async () => {
      // Act
      const lowQuality = await service.generateImageThumbnail(testImageBuffer, {
        quality: 1,
      });
      const highQuality = await service.generateImageThumbnail(testImageBuffer, {
        quality: 100,
      });

      // Assert
      expect(lowQuality.buffer.length).toBeLessThan(highQuality.buffer.length);
    });

    it('should handle zero timestamp for video', async () => {
      // Arrange
      mockExec.mockImplementation(
        (cmd: string, callback: (error: Error | null, result?: { stdout: string }) => void) => {
          if (cmd.includes('ffmpeg -version')) {
            callback(null, { stdout: 'ffmpeg version 4.4.0' });
          } else {
            expect(cmd).toContain('-ss 0');
            callback(null, { stdout: '' });
          }
        }
      );

      // Act
      await service.generateVideoThumbnail(testImageBuffer, {
        timestamp: 0,
      });

      // Assert
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('-ss 0'), expect.any(Function));
    });
  });
});
