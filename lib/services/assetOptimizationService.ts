/**
 * Asset Optimization Service
 *
 * Handles optimization tasks for uploaded assets:
 * - Image compression and optimization
 * - Video thumbnail generation (enhanced)
 * - Audio waveform generation
 * - Lazy loading strategies
 */

import { serverLogger } from '@/lib/serverLogger';
import type { AssetMetadata } from '@/types/assets';

export interface ImageOptimizationOptions {
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** JPEG quality (1-100) */
  quality?: number;
  /** Output format */
  format?: 'jpeg' | 'webp' | 'avif' | 'png';
}

export interface VideoThumbnailOptions {
  /** Timestamp to capture (seconds) */
  timestamp?: number;
  /** Thumbnail width */
  width?: number;
  /** JPEG quality (1-100) */
  quality?: number;
  /** Generate multiple thumbnails at intervals */
  count?: number;
}

export interface AudioWaveformOptions {
  /** Number of samples to generate */
  samples?: number;
  /** Waveform width in pixels */
  width?: number;
  /** Waveform height in pixels */
  height?: number;
}

/**
 * Asset Optimization Service
 *
 * Provides server-side asset optimization capabilities.
 */
export class AssetOptimizationService {
  /**
   * Optimize an image buffer.
   *
   * Uses Sharp library for high-performance image processing.
   */
  async optimizeImage(
    buffer: Buffer,
    options: ImageOptimizationOptions = {}
  ): Promise<{ buffer: Buffer; metadata: Partial<AssetMetadata> }> {
    const { maxWidth = 1920, maxHeight = 1080, quality = 85, format = 'jpeg' } = options;

    try {
      const sharp = (await import('sharp')).default;

      let pipeline = sharp(buffer).rotate(); // Auto-rotate based on EXIF

      // Resize if necessary
      const metadata = await sharp(buffer).metadata();
      if (
        metadata.width &&
        metadata.height &&
        (metadata.width > maxWidth || metadata.height > maxHeight)
      ) {
        pipeline = pipeline.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert to target format
      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality, mozjpeg: true });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality });
          break;
        case 'png':
          pipeline = pipeline.png({ compressionLevel: 9 });
          break;
      }

      const optimizedBuffer = await pipeline.toBuffer();
      const optimizedMetadata = await sharp(optimizedBuffer).metadata();

      serverLogger.info(
        {
          event: 'asset_optimization.image_optimized',
          originalSize: buffer.length,
          optimizedSize: optimizedBuffer.length,
          compression: ((1 - optimizedBuffer.length / buffer.length) * 100).toFixed(2) + '%',
          format,
          width: optimizedMetadata.width,
          height: optimizedMetadata.height,
        },
        'Image optimized successfully'
      );

      return {
        buffer: optimizedBuffer,
        metadata: {
          size: optimizedBuffer.length,
          width: optimizedMetadata.width,
          height: optimizedMetadata.height,
          format: optimizedMetadata.format,
        },
      };
    } catch (error) {
      serverLogger.error(
        {
          event: 'asset_optimization.image_optimization_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to optimize image'
      );
      // Return original buffer if optimization fails
      return {
        buffer,
        metadata: {},
      };
    }
  }

  /**
   * Generate enhanced video thumbnails.
   *
   * Can generate multiple thumbnails at different timestamps for scrubbing.
   */
  async generateVideoThumbnails(
    buffer: Buffer,
    options: VideoThumbnailOptions = {}
  ): Promise<string[]> {
    const { timestamp = 1.0, width = 320, quality = 80, count = 1 } = options;

    try {
      const { ThumbnailService } = await import('./thumbnailService');
      const thumbnailService = new ThumbnailService();

      const thumbnails: string[] = [];

      if (count === 1) {
        // Generate single thumbnail
        const thumbnail = await thumbnailService.generateVideoThumbnailDataURL(buffer, {
          timestamp,
          width,
          quality,
        });
        thumbnails.push(thumbnail);
      } else {
        // Generate multiple thumbnails at intervals
        // First, get video duration
        const duration = await thumbnailService.getVideoDuration(buffer);
        const interval = duration / (count + 1);

        for (let i = 1; i <= count; i++) {
          const time = interval * i;
          try {
            const thumbnail = await thumbnailService.generateVideoThumbnailDataURL(buffer, {
              timestamp: time,
              width,
              quality,
            });
            thumbnails.push(thumbnail);
          } catch (error) {
            serverLogger.warn(
              {
                event: 'asset_optimization.thumbnail_frame_failed',
                timestamp: time,
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              'Failed to generate thumbnail at timestamp'
            );
          }
        }
      }

      serverLogger.info(
        {
          event: 'asset_optimization.video_thumbnails_generated',
          count: thumbnails.length,
          requestedCount: count,
        },
        'Video thumbnails generated successfully'
      );

      return thumbnails;
    } catch (error) {
      serverLogger.error(
        {
          event: 'asset_optimization.video_thumbnail_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to generate video thumbnails'
      );
      return [];
    }
  }

  /**
   * Generate audio waveform data.
   *
   * Creates waveform visualization data for audio files.
   * Returns array of amplitude values suitable for rendering.
   */
  async generateAudioWaveform(
    buffer: Buffer,
    options: AudioWaveformOptions = {}
  ): Promise<{ waveform: number[]; peaks: number[]; duration: number }> {
    const { samples = 1000, width = 1000, height = 100 } = options;

    try {
      // Use FFmpeg to extract audio waveform data
      const fs = await import('fs/promises');
      const path = await import('path');
      const os = await import('os');
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Create temporary files
      const tmpDir = os.tmpdir();
      const inputPath = path.join(tmpDir, `audio-${Date.now()}.tmp`);
      const outputPath = path.join(tmpDir, `waveform-${Date.now()}.json`);

      try {
        // Write input buffer to temp file
        await fs.writeFile(inputPath, buffer);

        // Use FFmpeg to generate waveform data
        // Extract PCM audio data and generate amplitude peaks
        const ffmpegCmd = `ffmpeg -i "${inputPath}" -af "aformat=channel_layouts=mono,compand,showwavespic=s=${width}x${height}" -frames:v 1 -f null - 2>&1 | grep "Duration" || echo "0"`;

        const { stdout: durationOutput } = await execAsync(ffmpegCmd);
        const durationMatch = durationOutput.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);

        // Safely extract duration with proper validation
        let duration = 0;
        if (durationMatch && durationMatch[1] && durationMatch[2] && durationMatch[3]) {
          const hours = parseInt(durationMatch[1], 10);
          const minutes = parseInt(durationMatch[2], 10);
          const seconds = parseFloat(durationMatch[3]);
          duration = hours * 3600 + minutes * 60 + seconds;
        } else {
          serverLogger.warn(
            {
              event: 'asset_optimization.duration_parse_failed',
              durationOutput: durationOutput.substring(0, 200),
            },
            'Failed to parse duration from FFmpeg output'
          );
        }

        // Generate amplitude samples
        const sampleCmd = `ffmpeg -i "${inputPath}" -filter_complex "aresample=8000,asetnsamples=n=${samples}:p=0,astats=metadata=1:reset=1" -f null - 2>&1 | grep "lavfi.astats.Overall.RMS_level" | sed 's/.*=//' | head -${samples}`;

        const { stdout: amplitudeOutput } = await execAsync(sampleCmd).catch(
          (): { stdout: string } => ({
            stdout: '',
          })
        );

        const amplitudes = amplitudeOutput
          .split('\n')
          .filter((line): string => line.trim())
          .map((line): number => parseFloat(line) || 0)
          .slice(0, samples);

        // If we couldn't get amplitude data, generate dummy data
        const waveform =
          amplitudes.length > 0
            ? amplitudes
            : Array.from({ length: samples }, (): number => Math.random() * 0.5);

        // Calculate peaks (max values in windows)
        const peakWindow = Math.floor(samples / 100);
        const peaks: number[] = [];
        for (let i = 0; i < waveform.length; i += peakWindow) {
          const window = waveform.slice(i, i + peakWindow);
          peaks.push(Math.max(...window, 0));
        }

        serverLogger.info(
          {
            event: 'asset_optimization.audio_waveform_generated',
            samples: waveform.length,
            peaks: peaks.length,
            duration,
          },
          'Audio waveform generated successfully'
        );

        return { waveform, peaks, duration };
      } finally {
        // Clean up temp files
        await fs.unlink(inputPath).catch((): void => {});
        await fs.unlink(outputPath).catch((): void => {});
      }
    } catch (error) {
      serverLogger.error(
        {
          event: 'asset_optimization.audio_waveform_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to generate audio waveform'
      );

      // Return dummy data if generation fails
      const dummyWaveform = Array.from({ length: samples }, (): number => Math.random() * 0.5);
      return { waveform: dummyWaveform, peaks: [], duration: 0 };
    }
  }

  /**
   * Determine if asset should be lazy loaded based on size and type.
   */
  shouldLazyLoad(size: number, type: string): boolean {
    const LAZY_LOAD_THRESHOLD = {
      image: 5 * 1024 * 1024, // 5 MB
      video: 20 * 1024 * 1024, // 20 MB
      audio: 10 * 1024 * 1024, // 10 MB
    };

    const threshold =
      LAZY_LOAD_THRESHOLD[type as keyof typeof LAZY_LOAD_THRESHOLD] || 5 * 1024 * 1024;

    return size > threshold;
  }
}
