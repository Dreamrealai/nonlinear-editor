/**
 * Editor utility functions
 * Shared helpers for the editor components
 */

import type { Timeline as TimelineType, Clip } from '@/types/timeline';
import { safeArrayGet, safeArrayLast } from '@/lib/utils/arrayUtils';

/** Minimum duration for a clip in seconds (prevents zero-length clips) */
export const MIN_CLIP_DURATION = 0.1;

/** Maximum width for generated thumbnails in pixels */
export const THUMBNAIL_WIDTH = 320;

/**
 * Metadata associated with media assets.
 * Contains file information, codec details, and generated thumbnails.
 */
export type AssetMetadata = {
  filename?: string;
  mimeType?: string;
  /** Base64-encoded thumbnail image for preview */
  thumbnail?: string;
  /** Public URL for accessing the asset */
  sourceUrl?: string;
  /** Duration of the media in seconds */
  durationSeconds?: number | null;
  /** File format (e.g., mp4, webm) */
  format?: string;
  /** Video codec (e.g., h264, vp9) for playback diagnostics */
  videoCodec?: string;
  /** Audio codec (e.g., aac, opus) for playback diagnostics */
  audioCodec?: string;
  /** Bitrate in kbps */
  bitrate?: number;
};

/**
 * Represents a media asset stored in the database.
 * Assets can be videos, audio files, or images.
 */
export type AssetRow = {
  /** Unique identifier for the asset */
  id: string;
  /** Supabase storage URL (format: supabase://bucket/path) */
  storage_url: string;
  /** Duration in seconds (null for images) */
  duration_seconds: number | null;
  /** Parsed metadata from the database */
  metadata: AssetMetadata | null;
  /** Raw metadata object for debugging */
  rawMetadata: Record<string, unknown> | null;
  /** Timestamp when asset was created */
  created_at: string | null;
  /** Type of media asset */
  type: 'video' | 'audio' | 'image';
};

/**
 * Type guard to check if a value is a valid asset type.
 * @param value - Value to check
 * @returns True if value is 'video', 'audio', or 'image'
 */
export const isAssetType = (value: unknown): value is AssetRow['type'] =>
  value === 'video' || value === 'audio' || value === 'image';

/**
 * Safely converts unknown values to a number representing duration in seconds.
 * Handles both numeric and string inputs from different data sources.
 *
 * @param value - Value to coerce (can be number, string, or other)
 * @returns Duration in seconds, or null if conversion fails
 */
export const coerceDuration = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

/**
 * Enriches timeline clips with source duration metadata from assets.
 * This function ensures all clips have valid durations and trim points.
 *
 * Key responsibilities:
 * 1. Match clips to their source assets and extract duration
 * 2. Normalize clip start/end points within valid bounds
 * 3. Ensure all values are non-negative and respect MIN_CLIP_DURATION
 *
 * @param timeline - Timeline to enrich
 * @param assets - Array of assets containing duration metadata
 * @returns Timeline with enriched clip data
 */
export const enrichTimelineWithSourceDurations = (
  timeline: TimelineType,
  assets: AssetRow[]
): TimelineType => {
  if (!timeline?.clips?.length) {
    return timeline;
  }

  // Build a lookup map of asset IDs to durations
  // Tries multiple metadata fields to find duration (handles different data sources)
  const assetDurations = new Map<string, number | null>(
    assets.map((asset) => {
      const durationCandidates = [
        asset.duration_seconds,
        asset.metadata && (asset.metadata as Record<string, unknown>).durationSeconds,
        asset.metadata && (asset.metadata as Record<string, unknown>).duration_seconds,
        asset.metadata && (asset.metadata as Record<string, unknown>).duration,
      ];
      let duration: number | null = null;
      for (const candidate of durationCandidates) {
        const coerced = coerceDuration(candidate);
        if (coerced !== null) {
          duration = Math.max(coerced, MIN_CLIP_DURATION);
          break;
        }
      }
      return [asset.id, duration];
    })
  );

  // Update each clip with duration and normalize trim points
  const clips = timeline.clips.map((clip) => {
    const assetDuration = assetDurations.has(clip.assetId)
      ? (assetDurations.get(clip.assetId) ?? null)
      : (clip.sourceDuration ?? null);
    const normalizedDuration =
      typeof assetDuration === 'number' && Number.isFinite(assetDuration)
        ? Math.max(assetDuration, MIN_CLIP_DURATION)
        : null;

    const next: Clip = {
      ...clip,
      sourceDuration: normalizedDuration ?? clip.sourceDuration ?? null,
    };

    // Ensure trim points (start/end) are within valid bounds
    if (typeof next.sourceDuration === 'number') {
      const maxDuration = Math.max(next.sourceDuration, MIN_CLIP_DURATION);
      // Clamp start to [0, maxDuration - MIN_CLIP_DURATION]
      next.start = Math.min(Math.max(next.start, 0), Math.max(0, maxDuration - MIN_CLIP_DURATION));
      // Clamp end to [start + MIN_CLIP_DURATION, maxDuration]
      next.end = Math.min(Math.max(next.end, next.start + MIN_CLIP_DURATION), maxDuration);
    } else {
      // No known duration - still ensure valid positive values
      next.sourceDuration = null;
      next.start = Math.max(next.start, 0);
      next.end = Math.max(next.end, next.start + MIN_CLIP_DURATION);
    }

    // Ensure timeline position is non-negative
    next.timelinePosition = Math.max(next.timelinePosition, 0);

    return next;
  });

  return {
    ...timeline,
    clips,
  };
};

/**
 * Extracts bucket name and file path from a Supabase storage URL.
 * Format expected: supabase://bucket-name/path/to/file
 *
 * @param storageUrl - Supabase storage URL
 * @returns Object with bucket and path, or null if invalid
 */
export const extractStorageLocation = (storageUrl: string) => {
  const normalized = storageUrl.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const parts = normalized.split('/');
  const bucket = safeArrayGet(parts, 0);
  if (!bucket || parts.length <= 1) {
    return null;
  }
  return { bucket, path: parts.slice(1).join('/') };
};

/**
 * Extracts the file name from a storage URL.
 *
 * @param storageUrl - Full storage URL
 * @returns File name (last segment of the path)
 */
export const extractFileName = (storageUrl: string) => {
  const normalized = storageUrl.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const segments = normalized.split('/');
  return safeArrayLast(segments) ?? normalized;
};

/**
 * Creates an empty timeline with default output settings.
 * Used when initializing a new project or when timeline load fails.
 *
 * @param projectId - ID of the project this timeline belongs to
 * @returns New timeline with 1080p/30fps MP4 defaults
 */
export const createEmptyTimeline = (projectId: string): TimelineType => ({
  projectId,
  clips: [],
  output: {
    width: 1920,
    height: 1080,
    fps: 30,
    vBitrateK: 5000, // Video bitrate in kbps
    aBitrateK: 192, // Audio bitrate in kbps
    format: 'mp4',
  },
});

/**
 * Parses and normalizes asset metadata from database records.
 * Handles multiple field name variations (camelCase, snake_case).
 *
 * @param metadata - Raw metadata object from database
 * @returns Normalized AssetMetadata or null if empty
 */
export const parseAssetMetadata = (
  metadata: Record<string, unknown> | null
): AssetMetadata | null => {
  if (!metadata) {
    return null;
  }

  const typed = metadata as Partial<Record<string, unknown>>;
  const result: AssetMetadata = {};

  if (typeof typed.filename === 'string' && typed.filename.trim().length > 0) {
    result.filename = typed.filename.trim();
  }

  if (typeof typed.mimeType === 'string' && typed.mimeType.trim().length > 0) {
    result.mimeType = typed.mimeType.trim();
  }

  if (typeof typed.thumbnail === 'string' && typed.thumbnail.trim().length > 0) {
    result.thumbnail = typed.thumbnail.trim();
  }

  const sourceUrl =
    typeof typed.sourceUrl === 'string' && typed.sourceUrl.trim().length > 0
      ? typed.sourceUrl.trim()
      : typeof typed.source_url === 'string' && typed.source_url.trim().length > 0
        ? typed.source_url.trim()
        : undefined;

  if (sourceUrl) {
    result.sourceUrl = sourceUrl;
  }

  const durationCandidates = [
    typed.durationSeconds,
    typed.duration_seconds,
    typed.duration,
    typed.length,
  ];
  for (const candidate of durationCandidates) {
    const coerced = coerceDuration(candidate);
    if (coerced !== null) {
      result.durationSeconds = Math.max(coerced, MIN_CLIP_DURATION);
      break;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
};

/**
 * Maps a database row to an AssetRow object
 */
export const mapAssetRow = (row: Record<string, unknown>): AssetRow | null => {
  const id = typeof row.id === 'string' ? row.id : null;
  const storageUrl = typeof row.storage_url === 'string' ? row.storage_url : null;
  const duration =
    typeof row.duration_seconds === 'number' && Number.isFinite(row.duration_seconds)
      ? row.duration_seconds
      : null;
  const createdAt = typeof row.created_at === 'string' ? row.created_at : null;
  const type = isAssetType(row.type) ? row.type : null;

  if (!id || !storageUrl || !type) {
    return null;
  }

  const parsedMetadata = parseAssetMetadata(
    (row.metadata ?? null) as Record<string, unknown> | null
  );
  const rawMetadata = (row.rawMetadata ?? null) as Record<string, unknown> | null;
  const metadataDuration = parsedMetadata?.durationSeconds ?? null;
  return {
    id,
    storage_url: storageUrl,
    duration_seconds: duration ?? metadataDuration,
    metadata: parsedMetadata,
    rawMetadata,
    created_at: createdAt,
    type,
  };
};

/**
 * Creates a thumbnail from an image blob
 */
export const createImageThumbnail = (blob: Blob): Promise<string | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, THUMBNAIL_WIDTH / Math.max(1, img.width));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      } catch {
        resolve(null);
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });

/**
 * Creates a thumbnail from a video blob
 */
export const createVideoThumbnail = (blob: Blob): Promise<string | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    let resolved = false;

    const cleanup = (value: string | null) => {
      if (resolved) return;
      resolved = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };

    const captureFrame = () => {
      video.removeEventListener('seeked', captureFrame);
      try {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          cleanup(null);
          return;
        }
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, THUMBNAIL_WIDTH / Math.max(1, video.videoWidth));
        const width = Math.max(1, Math.round(video.videoWidth * scale));
        const height = Math.max(1, Math.round(video.videoHeight * scale));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup(null);
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        cleanup(dataUrl);
      } catch {
        cleanup(null);
      }
    };

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    video.addEventListener('error', () => cleanup(null));
    video.addEventListener('seeked', captureFrame);
    video.addEventListener('loadedmetadata', () => {
      try {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        if (duration > 1) {
          const target = Math.min(Math.max(duration / 2, 0.5), duration - 0.1);
          video.currentTime = target;
        } else {
          video.currentTime = 0.1;
        }
      } catch {
        cleanup(null);
      }
    });

    video.src = url;
  });

/**
 * Converts a Web Audio API AudioBuffer to a WAV file format ArrayBuffer.
 * Creates a standard RIFF WAV file with PCM 16-bit audio data.
 *
 * WAV file structure:
 * - RIFF header (12 bytes)
 * - fmt chunk (24 bytes) - audio format metadata
 * - data chunk (8 bytes + audio data) - actual audio samples
 *
 * @param buffer - AudioBuffer from Web Audio API
 * @returns ArrayBuffer containing complete WAV file data
 */
export const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44; // 44 = WAV header size
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  // Helper functions to write integers in little-endian format
  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // RIFF chunk descriptor (12 bytes)
  setUint32(0x46464952); // "RIFF" in ASCII
  setUint32(length - 8); // File length minus RIFF header
  setUint32(0x45564157); // "WAVE" in ASCII

  // fmt sub-chunk (24 bytes) - describes the audio format
  setUint32(0x20746d66); // "fmt " in ASCII
  setUint32(16); // Subchunk size (16 for PCM)
  setUint16(1); // Audio format (1 = PCM/uncompressed)
  setUint16(numOfChan); // Number of channels (mono/stereo)
  setUint32(buffer.sampleRate); // Sample rate (e.g., 44100 Hz)
  setUint32(buffer.sampleRate * 2 * numOfChan); // Byte rate
  setUint16(numOfChan * 2); // Block align (bytes per sample across all channels)
  setUint16(16); // Bits per sample

  // data sub-chunk - contains the actual audio samples
  setUint32(0x61746164); // "data" in ASCII
  setUint32(length - pos - 4); // Data chunk size

  // Extract channel data from AudioBuffer
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  // Write interleaved audio samples (converts float32 to int16)
  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      // Clamp sample to [-1, 1] range and convert to 16-bit integer
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return bufferArray;
};
