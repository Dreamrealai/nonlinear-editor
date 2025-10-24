/**
 * Thumbnail Generation Service
 *
 * Handles server-side thumbnail generation for video and image assets.
 * Uses FFmpeg for video frame extraction.
 *
 * Usage:
 * ```typescript
 * import { ThumbnailService } from '@/lib/services/thumbnailService';
 *
 * const service = new ThumbnailService();
 * const thumbnailBuffer = await service.generateVideoThumbnail(videoBuffer, {
 *   timestamp: 1.0,
 *   width: 320
 * });
 * ```
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { trackError, ErrorCategory, ErrorSeverity } from '../errorTracking';

const execAsync = promisify(exec);

export interface VideoThumbnailOptions {
  /** Timestamp in seconds to extract frame (default: 1.0) */
  timestamp?: number;
  /** Width of thumbnail (default: 320) */
  width?: number;
  /** Height of thumbnail (optional, maintains aspect ratio if not set) */
  height?: number;
  /** JPEG quality 1-100 (default: 80) */
  quality?: number;
}

export interface ImageThumbnailOptions {
  /** Width of thumbnail (default: 320) */
  width?: number;
  /** Height of thumbnail (optional, maintains aspect ratio if not set) */
  height?: number;
  /** JPEG quality 1-100 (default: 80) */
  quality?: number;
}

export interface ThumbnailMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  timestamp?: number;
}

/**
 * Service for generating thumbnails from video and image files
 */
export class ThumbnailService {
  private readonly defaultWidth = 320;
  private readonly defaultQuality = 80;
  private readonly defaultTimestamp = 1.0;

  /**
   * Check if FFmpeg is available on the system
   */
  async checkFFmpegAvailable(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version');
      return true;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        context: { message: 'FFmpeg not available on system' },
      });
      return false;
    }
  }

  /**
   * Generate thumbnail from video buffer using FFmpeg
   */
  async generateVideoThumbnail(
    videoBuffer: Buffer,
    options: VideoThumbnailOptions = {}
  ): Promise<{ buffer: Buffer; metadata: ThumbnailMetadata }> {
    const {
      timestamp = this.defaultTimestamp,
      width = this.defaultWidth,
      height,
      quality = this.defaultQuality,
    } = options;

    // Check FFmpeg availability
    const ffmpegAvailable = await this.checkFFmpegAvailable();
    if (!ffmpegAvailable) {
      throw new Error('FFmpeg is not available on this system');
    }

    // Create temporary files
    const tempDir = os.tmpdir();
    const videoPath = path.join(
      tempDir,
      `video-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`
    );
    const thumbnailPath = path.join(
      tempDir,
      `thumbnail-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    );

    try {
      // Write video buffer to temp file
      await fs.promises.writeFile(videoPath, videoBuffer);

      // Extract frame using FFmpeg
      // -ss: seek to timestamp
      // -i: input file
      // -vframes 1: extract 1 frame
      // -q:v: quality (2-31, lower is better, 2 is near lossless)
      const qualityScale = Math.max(2, Math.min(31, Math.round(31 - (quality / 100) * 29)));

      let ffmpegCmd = `ffmpeg -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v ${qualityScale}`;

      if (width && height) {
        ffmpegCmd += ` -vf "scale=${width}:${height}"`;
      } else if (width) {
        ffmpegCmd += ` -vf "scale=${width}:-1"`;
      }

      ffmpegCmd += ` "${thumbnailPath}"`;

      await execAsync(ffmpegCmd);

      // Read generated thumbnail
      const thumbnailBuffer = await fs.promises.readFile(thumbnailPath);

      // Get metadata using sharp
      const imageMetadata = await sharp(thumbnailBuffer).metadata();

      const metadata: ThumbnailMetadata = {
        width: imageMetadata.width || width,
        height: imageMetadata.height || 0,
        format: 'jpeg',
        size: thumbnailBuffer.length,
        timestamp,
      };

      return { buffer: thumbnailBuffer, metadata };
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        context: { timestamp, width, height, quality },
      });
      throw new Error(
        `Failed to generate video thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      // Clean up temporary files
      try {
        if (fs.existsSync(videoPath)) {
          await fs.promises.unlink(videoPath);
        }
        if (fs.existsSync(thumbnailPath)) {
          await fs.promises.unlink(thumbnailPath);
        }
      } catch (cleanupError) {
        trackError(cleanupError, {
          category: ErrorCategory.EXTERNAL_SERVICE,
          severity: ErrorSeverity.LOW,
          context: { message: 'Failed to clean up temporary files' },
        });
      }
    }
  }

  /**
   * Generate multiple thumbnails from video at different timestamps
   */
  async generateVideoThumbnailSequence(
    videoBuffer: Buffer,
    timestamps: number[],
    options: Omit<VideoThumbnailOptions, 'timestamp'> = {}
  ): Promise<Array<{ buffer: Buffer; metadata: ThumbnailMetadata }>> {
    const results = [];

    for (const timestamp of timestamps) {
      try {
        const result = await this.generateVideoThumbnail(videoBuffer, {
          ...options,
          timestamp,
        });
        results.push(result);
      } catch (error) {
        trackError(error, {
          category: ErrorCategory.EXTERNAL_SERVICE,
          severity: ErrorSeverity.MEDIUM,
          context: { timestamp },
        });
        // Continue with other timestamps even if one fails
      }
    }

    return results;
  }

  /**
   * Generate thumbnail from image buffer using Sharp
   */
  async generateImageThumbnail(
    imageBuffer: Buffer,
    options: ImageThumbnailOptions = {}
  ): Promise<{ buffer: Buffer; metadata: ThumbnailMetadata }> {
    const { width = this.defaultWidth, height, quality = this.defaultQuality } = options;

    try {
      let pipeline = sharp(imageBuffer);

      // Resize image
      if (width && height) {
        pipeline = pipeline.resize(width, height, {
          fit: 'cover',
          position: 'center',
        });
      } else if (width) {
        pipeline = pipeline.resize(width, undefined, {
          fit: 'inside',
        });
      }

      // Convert to JPEG with specified quality
      pipeline = pipeline.jpeg({ quality });

      const thumbnailBuffer = await pipeline.toBuffer();
      const imageMetadata = await sharp(thumbnailBuffer).metadata();

      const metadata: ThumbnailMetadata = {
        width: imageMetadata.width || width,
        height: imageMetadata.height || 0,
        format: 'jpeg',
        size: thumbnailBuffer.length,
      };

      return { buffer: thumbnailBuffer, metadata };
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        context: { width, height, quality },
      });
      throw new Error(
        `Failed to generate image thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get video duration using FFprobe
   */
  async getVideoDuration(videoBuffer: Buffer): Promise<number> {
    const tempDir = os.tmpdir();
    const videoPath = path.join(
      tempDir,
      `video-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`
    );

    try {
      await fs.promises.writeFile(videoPath, videoBuffer);

      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      );

      const duration = parseFloat(stdout.trim());
      return isNaN(duration) ? 0 : duration;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.MEDIUM,
        context: { message: 'Failed to get video duration' },
      });
      return 0;
    } finally {
      try {
        if (fs.existsSync(videoPath)) {
          await fs.promises.unlink(videoPath);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Generate thumbnail as base64 data URL (for backward compatibility with client-side approach)
   */
  async generateVideoThumbnailDataURL(
    videoBuffer: Buffer,
    options: VideoThumbnailOptions = {}
  ): Promise<string> {
    const { buffer } = await this.generateVideoThumbnail(videoBuffer, options);
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  }

  /**
   * Generate thumbnail as base64 data URL for images
   */
  async generateImageThumbnailDataURL(
    imageBuffer: Buffer,
    options: ImageThumbnailOptions = {}
  ): Promise<string> {
    const { buffer } = await this.generateImageThumbnail(imageBuffer, options);
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  }
}
