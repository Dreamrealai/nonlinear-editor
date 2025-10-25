/**
 * Tests for ThumbnailService
 */

import { ThumbnailService } from '@/lib/services/thumbnailService';
import { describe, it, expect, beforeEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

describe('ThumbnailService', () => {
  let service: ThumbnailService;
  let testImageBuffer: Buffer;

  beforeEach(async () => {
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
  });

  describe('checkFFmpegAvailable', () => {
    it('should check if FFmpeg is available', async () => {
      const available = await service.checkFFmpegAvailable();
      // This will depend on the environment
      expect(typeof available).toBe('boolean');
    });
  });

  describe('generateImageThumbnail', () => {
    it('should generate thumbnail from image buffer', async () => {
      const result = await service.generateImageThumbnail(testImageBuffer, {
        width: 100,
        quality: 80,
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.metadata.width).toBeLessThanOrEqual(100);
      expect(result.metadata.format).toBe('jpeg');
      expect(result.metadata.size).toBeGreaterThan(0);
    });

    it('should handle custom dimensions', async () => {
      const result = await service.generateImageThumbnail(testImageBuffer, {
        width: 200,
        height: 150,
        quality: 90,
      });

      expect(result.metadata.width).toBeLessThanOrEqual(200);
      expect(result.metadata.height).toBeLessThanOrEqual(150);
    });
  });

  describe('generateImageThumbnailDataURL', () => {
    it('should generate base64 data URL', async () => {
      const dataURL = await service.generateImageThumbnailDataURL(testImageBuffer);

      expect(dataURL).toMatch(/^data:image\/jpeg;base64,/);
      expect(dataURL.length).toBeGreaterThan(50);
    });
  });

  // Video tests would require an actual video file or mock, skipping for now
  // as they depend on FFmpeg being available
});
