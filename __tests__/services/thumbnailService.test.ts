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
      const redPixel = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xdd,
        0x8d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
        0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      const result = await service.generateImageThumbnail(redPixel, {
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
      const redPixel = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xdd,
        0x8d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
        0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      const dataURL = await service.generateImageThumbnailDataURL(redPixel);

      expect(dataURL).toMatch(/^data:image\/jpeg;base64,/);
      expect(dataURL.length).toBeGreaterThan(50);
    });
  });

  // Video tests would require an actual video file or mock, skipping for now
  // as they depend on FFmpeg being available
});
