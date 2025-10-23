/**
 * BrowserEditorClient Component
 *
 * Main client-side video editor interface that handles:
 * - Asset management (upload, delete, organize)
 * - Timeline editing and playback
 * - AI-powered video/audio generation
 * - Video processing (scene detection, audio extraction)
 * - Export functionality
 *
 * This component runs entirely in the browser and integrates with Supabase
 * for storage and database operations.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { v4 as uuid } from 'uuid';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import NextImage from 'next/image';
import HorizontalTimeline from '@/components/HorizontalTimeline';
import PreviewPlayer from '@/components/PreviewPlayer';
import ExportModal from '@/components/ExportModal';
import EditorHeader from '@/components/EditorHeader';
import ClipPropertiesPanel from '@/components/editor/ClipPropertiesPanel';
import { useAutosave } from '@/lib/hooks/useAutosave';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { createBrowserSupabaseClient, ensureHttpsProtocol } from '@/lib/supabase';
import { saveTimeline, loadTimeline } from '@/lib/saveLoad';
import type { Clip, Timeline as TimelineType } from '@/types/timeline';
import { useEditorStore } from '@/state/useEditorStore';
import { browserLogger } from '@/lib/browserLogger';
import { safeArrayMax, safeArrayGet, safeArrayLast } from '@/lib/utils/arrayUtils';

/**
 * Metadata associated with media assets.
 * Contains file information, codec details, and generated thumbnails.
 */
type AssetMetadata = {
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
type AssetRow = {
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
const isAssetType = (value: unknown): value is AssetRow['type'] =>
  value === 'video' || value === 'audio' || value === 'image';

/** Maximum width for generated thumbnails in pixels */
const THUMBNAIL_WIDTH = 320;

/** Minimum duration for a clip in seconds (prevents zero-length clips) */
const MIN_CLIP_DURATION = 0.1;

/**
 * Safely converts unknown values to a number representing duration in seconds.
 * Handles both numeric and string inputs from different data sources.
 *
 * @param value - Value to coerce (can be number, string, or other)
 * @returns Duration in seconds, or null if conversion fails
 */
const coerceDuration = (value: unknown): number | null => {
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
const enrichTimelineWithSourceDurations = (
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
    }),
  );

  // Update each clip with duration and normalize trim points
  const clips = timeline.clips.map((clip) => {
    const assetDuration = assetDurations.has(clip.assetId) ? assetDurations.get(clip.assetId) ?? null : clip.sourceDuration ?? null;
    const normalizedDuration =
      typeof assetDuration === 'number' && Number.isFinite(assetDuration)
        ? Math.max(assetDuration, MIN_CLIP_DURATION)
        : null;

    const next: Clip = {
      ...clip,
      sourceDuration: normalizedDuration ?? (clip.sourceDuration ?? null),
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
 * Sanitizes file names to prevent path traversal attacks and storage errors.
 * Removes special characters that could break storage paths.
 *
 * @param fileName - Original file name from user upload
 * @returns Safe file name with only alphanumeric, dots, underscores, and hyphens
 */
const sanitizeFileName = (fileName: string) => {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return 'asset';
  }
  // Replace characters that could break storage paths or enable traversal
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * Extracts bucket name and file path from a Supabase storage URL.
 * Format expected: supabase://bucket-name/path/to/file
 *
 * @param storageUrl - Supabase storage URL
 * @returns Object with bucket and path, or null if invalid
 */
const extractStorageLocation = (storageUrl: string) => {
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
const extractFileName = (storageUrl: string) => {
  const normalized = storageUrl.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const segments = normalized.split('/');
  return safeArrayLast(segments) ?? normalized;
};

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
const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
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

/**
 * Creates an empty timeline with default output settings.
 * Used when initializing a new project or when timeline load fails.
 *
 * @param projectId - ID of the project this timeline belongs to
 * @returns New timeline with 1080p/30fps MP4 defaults
 */
const createEmptyTimeline = (projectId: string): TimelineType => ({
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
const parseAssetMetadata = (metadata: Record<string, unknown> | null): AssetMetadata | null => {
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

const createImageThumbnail = (blob: Blob): Promise<string | null> =>
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
      } catch (error) {
        browserLogger.error({ error }, 'Failed to create image thumbnail');
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

const createVideoThumbnail = (blob: Blob): Promise<string | null> =>
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
      } catch (error) {
        browserLogger.error({ error }, 'Failed to capture video thumbnail');
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
      } catch (error) {
        browserLogger.error({ error }, 'Failed to seek video for thumbnail');
        cleanup(null);
      }
    });

    video.src = url;
  });

/**
 * Arguments for uploading an asset to storage and database.
 */
type UploadAssetArgs = {
  /** File object from user's file input */
  file: File;
  /** Project ID to associate this asset with */
  projectId: string;
  /** Type of media asset (video/audio/image) */
  assetType: AssetRow['type'];
};

/**
 * Uploads a media file using the centralized API endpoint.
 *
 * REFACTORED: This function now delegates to the /api/assets/upload endpoint
 * instead of duplicating upload logic on the client side.
 *
 * Benefits:
 * - Single source of truth for upload logic
 * - Consistent validation and error handling
 * - Easier to maintain and update
 * - Better security (server-side validation)
 *
 * @param args - Upload parameters
 * @returns Newly created asset record
 * @throws Error if upload fails
 */
async function uploadAsset({ file, projectId, assetType }: UploadAssetArgs) {
  // Create FormData for multipart upload
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectId', projectId);
  formData.append('type', assetType);

  // Call the centralized upload API endpoint
  const response = await fetch('/api/assets/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(errorData.error || `Upload failed with status ${response.status}`);
  }

  const result = await response.json();

  // Fetch the created asset from database to get complete record
  const supabase = createBrowserSupabaseClient();
  const { data: assetData, error: assetError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', result.assetId)
    .single();

  if (assetError || !assetData) {
    throw new Error('Failed to fetch uploaded asset');
  }

  return assetData as AssetRow;
}

const mapAssetRow = (row: Record<string, unknown>): AssetRow | null => {
  const id = typeof row.id === 'string' ? row.id : null;
  const storageUrl = typeof row.storage_url === 'string' ? row.storage_url : null;
  const duration = typeof row.duration_seconds === 'number' && Number.isFinite(row.duration_seconds)
    ? row.duration_seconds
    : null;
  const createdAt = typeof row.created_at === 'string' ? row.created_at : null;
  const type = isAssetType(row.type) ? row.type : null;

  if (!id || !storageUrl || !type) {
    return null;
  }

  const parsedMetadata = parseAssetMetadata((row.metadata ?? null) as Record<string, unknown> | null);
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

type BrowserEditorClientProps = {
  projectId: string;
};

export function BrowserEditorClient({ projectId }: BrowserEditorClientProps) {
  const supabase = createBrowserSupabaseClient();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [timelineBootstrapped, setTimelineBootstrapped] = useState(false);
  const processedThumbnailIdsRef = useRef<Set<string>>(new Set());
  const [uploadPending, setUploadPending] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [sceneDetectPending, setSceneDetectPending] = useState(false);

  // Audio generation state
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'image'>('video');
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [audioGenMode, setAudioGenMode] = useState<'suno' | 'elevenlabs' | null>(null);
  const [audioGenPending, setAudioGenPending] = useState(false);

  // Video generation state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoGenPending, setVideoGenPending] = useState(false);
  const [videoOperationName, setVideoOperationName] = useState<string | null>(null);

  // Video processing state
  const [splitAudioPending, setSplitAudioPending] = useState(false);
  const [splitScenesPending, setSplitScenesPending] = useState(false);
  const [upscaleVideoPending, setUpscaleVideoPending] = useState(false);

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);

  // Centralized polling cleanup tracking
  const pollingTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const abortControllersRef = useRef<Set<AbortController>>(new Set());

  // Cleanup all polling on unmount
  useEffect(() => {
    const pollingTimeouts = pollingTimeoutsRef.current;
    const abortControllers = abortControllersRef.current;

    return () => {
      // Clear all timeouts
      pollingTimeouts.forEach((timeout) => {
        clearTimeout(timeout);
      });
      pollingTimeouts.clear();

      // Abort all ongoing requests
      abortControllers.forEach((controller) => {
        controller.abort();
      });
      abortControllers.clear();
    };
  }, []);

  const timeline = useEditorStore((state) => state.timeline);
  const setTimeline = useEditorStore((state) => state.setTimeline);
  const addClip = useEditorStore((state) => state.addClip);

  // Enable keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    onPlayPause: () => {
      // TODO: Implement play/pause for preview player
      console.log('Play/pause triggered');
    },
  });

  // Load timeline from database
  useEffect(() => {
    if (timelineBootstrapped || !assetsLoaded) {
      return;
    }

    let cancelled = false;

    const loadTimelineData = async () => {
      try {
        const timelineData = await loadTimeline(projectId);

        if (cancelled) return;

        if (timelineData) {
          const enriched = enrichTimelineWithSourceDurations(timelineData, assets);
          setTimeline(enriched);
        } else {
          // Create empty timeline if none exists
          const emptyTimeline = createEmptyTimeline(projectId);
          setTimeline(emptyTimeline);
          await saveTimeline(projectId, emptyTimeline);
        }

        setTimelineBootstrapped(true);
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Failed to load timeline');
        // Create empty timeline on error
        const emptyTimeline = createEmptyTimeline(projectId);
        setTimeline(emptyTimeline);
        setTimelineBootstrapped(true);
      }
    };

    void loadTimelineData();

    return () => {
      cancelled = true;
    };
  }, [projectId, assets, assetsLoaded, timelineBootstrapped, setTimeline]);

  // Load assets from database
  useEffect(() => {
    let cancelled = false;

    const loadAssets = async () => {
      setLoadingAssets(true);
      setAssetError(null);
      try {
        const { data, error } = await supabase
          .from('assets')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (cancelled) return;

        const mapped = (data ?? [])
          .map((row) => mapAssetRow(row as Record<string, unknown>))
          .filter((asset): asset is AssetRow => Boolean(asset));

        setAssets(mapped);
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Failed to load assets');
        if (cancelled) return;
        setAssetError('Failed to load assets. Please try again later.');
      } finally {
        if (!cancelled) {
          setLoadingAssets(false);
          setAssetsLoaded(true);
        }
      }
    };

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, [projectId, supabase]);

  // Generate thumbnails for assets that don't have them
  useEffect(() => {
    if (!assetsLoaded || !timeline) {
      return;
    }

    const missingThumbnails = assets.filter((asset) => {
      if (processedThumbnailIdsRef.current.has(asset.id)) {
        return false;
      }
      processedThumbnailIdsRef.current.add(asset.id);
      return !asset.metadata?.thumbnail && asset.type !== 'audio';
    });

    if (!missingThumbnails.length) {
      return;
    }

    void (async () => {
      for (const asset of missingThumbnails) {
        try {
          const bucketName = safeArrayGet(asset.storage_url.replace('supabase://', '').split('/'), 0);
          if (!bucketName) continue;

          const signedUrlResponse = await supabase.storage
            .from(bucketName)
            .createSignedUrl(asset.storage_url.replace(/^supabase:\/\//, '').split('/').slice(1).join('/'), 600);

          if (!signedUrlResponse.data?.signedUrl) {
            continue;
          }

          const response = await fetch(signedUrlResponse.data.signedUrl);
          const blob = await response.blob();

          let thumbnail: string | null = null;
          if (asset.type === 'image') {
            thumbnail = await createImageThumbnail(blob);
          } else if (asset.type === 'video') {
            thumbnail = await createVideoThumbnail(blob);
          }

          if (!thumbnail) continue;

          await supabase
            .from('assets')
            .update({
              metadata: {
                ...(asset.metadata ?? {}),
                thumbnail,
              },
            })
            .eq('id', asset.id);

          setAssets((prev) =>
            prev.map((entry) =>
              entry.id === asset.id
                ? {
                    ...entry,
                    metadata: {
                      ...(entry.metadata ?? {}),
                      thumbnail,
                    },
                  }
                : entry,
            ),
          );
        } catch (error) {
          browserLogger.error({ error, assetId: asset.id }, 'Failed to generate thumbnail');
        }
      }
    })();
  }, [assets, assetsLoaded, timeline, supabase]);

  // Autosave timeline
  useAutosave(
    projectId,
    2000,
    async (projectIdParam, timelineToSave) => {
      if (!timelineToSave) {
        return;
      }
      try {
        await saveTimeline(projectIdParam, timelineToSave);
        toast.success('Timeline saved');
      } catch (error) {
        browserLogger.error({ error, projectId: projectIdParam }, 'Failed to autosave timeline');
        toast.error('Failed to autosave timeline');
      }
    },
  );

  const handleAssetUpload = useCallback(
    async (file: File) => {
      const type: AssetRow['type'] = file.type.startsWith('audio')
        ? 'audio'
        : file.type.startsWith('image')
          ? 'image'
          : 'video';
      try {
        const result = await uploadAsset({ file, projectId, assetType: type });
        setAssets((prev) => [result, ...prev]);
        toast.success('Asset uploaded');
      } catch (error) {
        browserLogger.error({ error, projectId, fileName: file.name }, 'Failed to upload asset');
        toast.error('Failed to upload asset');
      }
    },
    [projectId],
  );

  const handleFileSelect = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) {
        return;
      }
      setUploadPending(true);
      try {
        for (const file of files) {
          await handleAssetUpload(file);
        }
      } finally {
        setUploadPending(false);
        if (uploadInputRef.current) {
          uploadInputRef.current.value = '';
        }
      }
    },
    [handleAssetUpload],
  );

  const handleAssetDelete = useCallback(
    async (asset: AssetRow) => {
      if (!confirm(`Delete "${asset.metadata?.filename ?? asset.id}"?`)) {
        return;
      }

      try {
        const { error } = await supabase.from('assets').delete().eq('id', asset.id).eq('project_id', projectId);

        if (error) {
          browserLogger.error({ error, assetId: asset.id }, 'Failed to delete asset');
          toast.error('Failed to delete asset');
          return;
        }

        // Remove asset from local state
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));

        // Remove clips using this asset from timeline
        if (timeline) {
          const updatedClips = timeline.clips.filter((clip) => clip.assetId !== asset.id);
          if (updatedClips.length !== timeline.clips.length) {
            setTimeline({ ...timeline, clips: updatedClips });
            toast.success('Asset deleted from library and timeline');
          } else {
            toast.success('Asset deleted');
          }
        } else {
          toast.success('Asset deleted');
        }
      } catch (error) {
        browserLogger.error({ error, assetId: asset.id }, 'Error deleting asset');
        toast.error('Failed to delete asset');
      }
    },
    [projectId, timeline, setTimeline, supabase],
  );

  const handleClipAdd = useCallback(async (asset: AssetRow) => {
    if (!timeline) {
      toast.error('Timeline not ready');
      return;
    }

    const assetDuration =
      typeof asset.duration_seconds === 'number' && Number.isFinite(asset.duration_seconds)
        ? asset.duration_seconds
        : typeof asset.metadata?.durationSeconds === 'number' && Number.isFinite(asset.metadata.durationSeconds)
          ? asset.metadata.durationSeconds
          : null;
    const clip: Clip = {
      id: uuid(),
      assetId: asset.id,
      filePath: asset.storage_url,
      mime: asset.metadata?.mimeType ?? 'video/mp4',
      start: 0,
      end: assetDuration ?? 5,
      sourceDuration: assetDuration,
      timelinePosition: timeline.clips.length > 0 ? safeArrayMax(timeline.clips.map((c) => c.timelinePosition + (c.end - c.start)), 0) : 0,
      trackIndex: 0,
      crop: null,
      transitionToNext: { type: 'none', duration: 0.5 },
      previewUrl: asset.metadata?.sourceUrl ?? null,
      thumbnailUrl: asset.metadata?.thumbnail ?? null,
      hasAudio: asset.type !== 'image',
    };

    addClip(clip);
    setTimeline({
      ...timeline,
      clips: [...timeline.clips, clip],
    });
    toast.success('Clip added to timeline');
  }, [timeline, addClip, setTimeline]);

  const handleDetectScenes = useCallback(async () => {
    const latestVideo = assets.find((asset) => asset.type === 'video');
    if (!latestVideo) {
      toast.error('Upload a video before detecting scenes');
      return;
    }

    setSceneDetectPending(true);
    toast.loading('Detecting scenes...', { id: 'detect-scenes' });

    try {
      const res = await fetch('/api/video/split-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, assetId: latestVideo.id }),
      });

      const json = await res.json();

      if (!res.ok) {
        const errorMsg = json.details
          ? `${json.error || 'Scene detection failed'}: ${json.details}`
          : (json.error || 'Scene detection failed');
        throw new Error(errorMsg);
      }

      browserLogger.info({ projectId, assetId: latestVideo.id, sceneCount: json.scenes?.length }, 'Scenes detected successfully');
      toast.success(`Detected ${json.scenes?.length ?? 0} scenes`, { id: 'detect-scenes' });

      // Optionally: add scenes as clips to timeline
      if (json.scenes && Array.isArray(json.scenes) && timeline) {
        const newClips: Clip[] = json.scenes.map((scene: { startTime: number; endTime: number }, index: number) => ({
          id: uuid(),
          assetId: latestVideo.id,
          filePath: latestVideo.storage_url,
          mime: latestVideo.metadata?.mimeType ?? 'video/mp4',
          start: scene.startTime,
          end: scene.endTime,
          sourceDuration: latestVideo.duration_seconds,
          timelinePosition: index > 0 ? json.scenes.slice(0, index).reduce((acc: number, s: { startTime: number; endTime: number }) => acc + (s.endTime - s.startTime), 0) : 0,
          trackIndex: 0,
          crop: null,
          transitionToNext: { type: 'none', duration: 0.5 },
          previewUrl: latestVideo.metadata?.sourceUrl ?? null,
          thumbnailUrl: latestVideo.metadata?.thumbnail ?? null,
          hasAudio: latestVideo.type !== 'image',
        }));

        setTimeline({
          ...timeline,
          clips: newClips,
        });
        toast.success('Scenes added to timeline');
      }
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Scene detection failed');
      toast.error(error instanceof Error ? error.message : 'Scene detection failed', { id: 'detect-scenes' });
    } finally {
      setSceneDetectPending(false);
    }
  }, [assets, projectId, timeline, setTimeline]);

  const handleExportClick = useCallback(() => {
    if (!timeline || timeline.clips.length === 0) {
      toast.error('Add clips to timeline before exporting');
      return;
    }
    setShowExportModal(true);
  }, [timeline]);

  const handleAddText = useCallback(() => {
    const addTextOverlay = useEditorStore.getState().addTextOverlay;
    const currentTime = useEditorStore.getState().currentTime;
    addTextOverlay({
      id: `text-${Date.now()}`,
      text: 'New Text',
      timelinePosition: currentTime,
      duration: 5,
      x: 50,
      y: 50,
      fontSize: 32,
      color: '#ffffff',
      backgroundColor: 'transparent',
      fontFamily: 'sans-serif',
      align: 'center',
      opacity: 1,
    });
    toast.success('Text overlay added at playhead');
  }, []);

  const handleAddTransition = useCallback(() => {
    const addTransitionToSelectedClips = useEditorStore.getState().addTransitionToSelectedClips;
    const selectedClipIds = useEditorStore.getState().selectedClipIds;
    if (selectedClipIds.size === 0) {
      toast.error('Select clips to add transition');
      return;
    }
    addTransitionToSelectedClips('crossfade', 0.5);
    toast.success('Transition added to selected clips');
  }, []);


  // Audio generation handlers
  const handleGenerateSuno = useCallback(async (formData: { prompt: string; style?: string; title?: string; customMode?: boolean; instrumental?: boolean }) => {
    setAudioGenPending(true);
    toast.loading('Generating audio with Suno V5...', { id: 'generate-suno' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const res = await fetch('/api/audio/suno/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Audio generation failed');
      }

      const taskId = json.taskId;
      toast.success('Audio generation started', { id: 'generate-suno' });

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max
      const pollInterval = 5000; // 5 seconds

      const poll = async (): Promise<void> => {
        attempts++;
        if (attempts > maxAttempts) {
          throw new Error('Audio generation timed out');
        }

          const statusRes = await fetch(`/api/audio/suno/status?taskId=${taskId}&projectId=${projectId}`);
        const statusJson = await statusRes.json();

        if (!statusRes.ok) {
          throw new Error(statusJson.error || 'Status check failed');
        }

        const task = statusJson.tasks?.[0];
        if (!task) {
          throw new Error('Task not found');
        }

        if (task.status === 'complete' && task.audioUrl) {
          toast.success('Audio generated successfully!', { id: 'generate-suno' });

          // Upload to Supabase and create asset
          const audioRes = await fetch(task.audioUrl);
          const audioBlob = await audioRes.blob();
          const fileName = `suno_${Date.now()}.mp3`;
          const filePath = `${user.id}/${projectId}/audio/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('assets')
            .upload(filePath, audioBlob, { contentType: 'audio/mpeg' });

          if (uploadError) throw uploadError;

          const storageUrl = `supabase://assets/${filePath}`;
          const { data: newAsset, error: assetError } = await supabase
            .from('assets')
            .insert({
              project_id: projectId,
              user_id: user.id,
              storage_url: storageUrl,
              type: 'audio',
              source: 'genai',
              mime_type: 'audio/mpeg',
              duration_sec: task.duration ?? null,
              metadata: {
                filename: fileName,
                provider: 'suno',
                prompt: task.prompt,
                title: task.title,
                tags: task.tags,
              },
            })
            .select()
            .single();

          if (assetError) throw assetError;

          const mappedAsset = mapAssetRow(newAsset as Record<string, unknown>);
          if (mappedAsset) {
            setAssets((prev) => [mappedAsset, ...prev]);
          }

          setShowAudioModal(false);
          setActiveTab('audio');
        } else if (task.status === 'failed') {
          throw new Error('Audio generation failed');
        } else {
          // Still processing, poll again - track timeout for cleanup
          const timeout = setTimeout(poll, pollInterval);
          pollingTimeoutsRef.current.add(timeout);
        }
      };

      // Start polling - track timeout for cleanup
      const initialTimeout = setTimeout(poll, pollInterval);
      pollingTimeoutsRef.current.add(initialTimeout);
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Suno audio generation failed');
      toast.error(error instanceof Error ? error.message : 'Audio generation failed', { id: 'generate-suno' });
      setAudioGenPending(false);
    }
  }, [supabase, projectId]);

  const handleGenerateElevenLabs = useCallback(async (formData: { text: string; voiceId?: string; modelId?: string }) => {
    setAudioGenPending(true);
    toast.loading('Generating audio with ElevenLabs...', { id: 'generate-elevenlabs' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const res = await fetch('/api/audio/elevenlabs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId,
          userId: user.id,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Audio generation failed');
      }

      toast.success('Audio generated successfully!', { id: 'generate-elevenlabs' });

      const mappedAsset = mapAssetRow(json.asset as Record<string, unknown>);
      if (mappedAsset) {
        setAssets((prev) => [mappedAsset, ...prev]);
      }

      setShowAudioModal(false);
      setActiveTab('audio');
    } catch (error) {
      browserLogger.error({ error, projectId }, 'ElevenLabs audio generation failed');
      toast.error(error instanceof Error ? error.message : 'Audio generation failed', { id: 'generate-elevenlabs' });
    } finally {
      setAudioGenPending(false);
    }
  }, [supabase, projectId]);

  const handleGenerateVideo = useCallback(async (formData: { prompt: string; aspectRatio?: '9:16' | '16:9' | '1:1'; duration?: number }) => {
    setVideoGenPending(true);
    toast.loading('Generating video with Veo 3.1...', { id: 'generate-video' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Video generation failed');
      }

      setVideoOperationName(json.operationName);
      toast.loading('Video generation in progress... This may take several minutes.', { id: 'generate-video' });

      // Poll for video generation status with cleanup tracking
      const pollInterval = 10000; // 10 seconds
      const poll = async () => {
        try {
          // Create AbortController and track it
          const controller = new AbortController();
          abortControllersRef.current.add(controller);

          const statusRes = await fetch(
            `/api/video/status?operationName=${encodeURIComponent(json.operationName)}&projectId=${projectId}`,
            { signal: controller.signal }
          );
          const statusJson = await statusRes.json();

          // Remove controller after successful fetch
          abortControllersRef.current.delete(controller);

          if (statusJson.done) {
            if (statusJson.error) {
              throw new Error(statusJson.error);
            }

            toast.success('Video generated successfully!', { id: 'generate-video' });

            const mappedAsset = mapAssetRow(statusJson.asset as Record<string, unknown>);
            if (mappedAsset) {
              setAssets((prev) => [mappedAsset, ...prev]);
            }

            setShowVideoModal(false);
            setVideoGenPending(false);
            setVideoOperationName(null);
            setActiveTab('video');
          } else {
            // Continue polling with tracked timeout
            const timeout = setTimeout(poll, pollInterval);
            pollingTimeoutsRef.current.add(timeout);
          }
        } catch (pollError) {
          // Ignore abort errors
          if (pollError instanceof Error && pollError.name === 'AbortError') {
            return;
          }

          browserLogger.error({ error: pollError, projectId }, 'Video generation polling failed');
          toast.error(pollError instanceof Error ? pollError.message : 'Video generation failed', { id: 'generate-video' });
          setVideoGenPending(false);
          setVideoOperationName(null);
        }
      };

      const initialTimeout = setTimeout(poll, pollInterval);
      pollingTimeoutsRef.current.add(initialTimeout);
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Video generation failed');
      toast.error(error instanceof Error ? error.message : 'Video generation failed', { id: 'generate-video' });
      setVideoGenPending(false);
    }
  }, [supabase, projectId]);

  const handleSplitAudio = useCallback(async (asset: AssetRow) => {
    setSplitAudioPending(true);
    toast.loading('Extracting audio from video...', { id: 'split-audio' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get signed URL for the video
      const { data: signData } = await supabase
        .from('assets')
        .select('storage_url, metadata')
        .eq('id', asset.id)
        .single();

      if (!signData) throw new Error('Asset not found');

      // Resolve a fetchable URL for the video asset
      let videoUrl = asset.metadata?.sourceUrl;
      if (!videoUrl) {
        const location = typeof signData.storage_url === 'string' ? extractStorageLocation(signData.storage_url) : null;
        if (!location) {
          throw new Error('Invalid storage location for asset');
        }
        const { data: signed, error: signError } = await supabase.storage
          .from(location.bucket)
          .createSignedUrl(location.path, 600);

        if (signError || !signed?.signedUrl) {
          throw new Error('Failed to create signed URL for asset');
        }

        videoUrl = signed.signedUrl;
      }

      // Fetch the video
      const videoResponse = await fetch(videoUrl);
      const videoBlob = await videoResponse.blob();

      // Create audio context
      const audioContext = new (window.AudioContext || (window as never)['webkitAudioContext'])();
      const arrayBuffer = await videoBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Convert to WAV
      const wav = audioBufferToWav(audioBuffer);
      const audioBlob = new Blob([wav], { type: 'audio/wav' });

      // Upload to Supabase
      const fileName = `${uuid()}.wav`;
      const storagePath = `${user.id}/${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(storagePath, audioBlob, {
          contentType: 'audio/wav',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl: rawPublicUrl } } = supabase.storage.from('assets').getPublicUrl(storagePath);
      const publicUrl = ensureHttpsProtocol(rawPublicUrl);

      // Create asset record
      const { data: newAsset, error: assetError } = await supabase
        .from('assets')
        .insert({
          user_id: user.id,
          project_id: projectId,
          type: 'audio',
          source: 'upload',
          storage_url: `supabase://assets/${storagePath}`,
          metadata: {
            filename: fileName,
            mimeType: 'audio/wav',
            sourceUrl: publicUrl,
            extractedFrom: asset.id,
          },
        })
        .select()
        .single();

      if (assetError) {
        throw new Error(`Asset creation failed: ${assetError.message}`);
      }

      toast.success('Audio extracted successfully!', { id: 'split-audio' });

      const mappedAsset = mapAssetRow(newAsset as Record<string, unknown>);
      if (mappedAsset) {
        setAssets((prev) => [mappedAsset, ...prev]);
      }

      setActiveTab('audio');
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Audio extraction failed');
      toast.error(error instanceof Error ? error.message : 'Failed to extract audio', { id: 'split-audio' });
    } finally {
      setSplitAudioPending(false);
    }
  }, [supabase, projectId]);

  const handleSplitScenes = useCallback(async (asset: AssetRow) => {
    setSplitScenesPending(true);
    toast.loading('Splitting video into scenes...', { id: 'split-scenes' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const res = await fetch('/api/video/split-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
          projectId,
          threshold: 0.5,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const errorMsg = json.details
          ? `${json.error || 'Scene splitting failed'}: ${json.details}`
          : (json.error || 'Scene splitting failed');
        throw new Error(errorMsg);
      }

      toast.success(json.message || 'Scene splitting initiated', { id: 'split-scenes' });
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Scene splitting failed');
      toast.error(error instanceof Error ? error.message : 'Failed to split scenes', { id: 'split-scenes' });
    } finally {
      setSplitScenesPending(false);
    }
  }, [supabase, projectId]);

  const handleUpscaleVideo = useCallback(async (asset: AssetRow) => {
    setUpscaleVideoPending(true);
    toast.loading('Upscaling video with Topaz AI...', { id: 'upscale-video' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Submit upscale request
      const res = await fetch('/api/video/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
          projectId,
          upscaleFactor: 2,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Video upscale failed');
      }

      const requestId = json.requestId;
      toast.loading('Video upscaling in progress... This may take several minutes.', { id: 'upscale-video' });

      // Poll for completion
      const pollInterval = 10000; // 10 seconds
      const poll = async () => {
        try {
          const statusRes = await fetch(
            `/api/video/upscale-status?requestId=${encodeURIComponent(requestId)}&projectId=${projectId}`
          );
          const statusJson = await statusRes.json();

          if (statusJson.done) {
            if (statusJson.error) {
              throw new Error(statusJson.error);
            }

            toast.success('Video upscaled successfully!', { id: 'upscale-video' });

            const mappedAsset = mapAssetRow(statusJson.asset as Record<string, unknown>);
            if (mappedAsset) {
              setAssets((prev) => [mappedAsset, ...prev]);
            }

            setUpscaleVideoPending(false);
            setActiveTab('video');
          } else {
            // Continue polling - track timeout for cleanup
            const timeout = setTimeout(poll, pollInterval);
            pollingTimeoutsRef.current.add(timeout);
          }
        } catch (pollError) {
          browserLogger.error({ error: pollError, projectId }, 'Video upscale polling failed');
          toast.error(pollError instanceof Error ? pollError.message : 'Video upscale failed', { id: 'upscale-video' });
          setUpscaleVideoPending(false);
        }
      };

      // Start polling - track timeout for cleanup
      const initialTimeout = setTimeout(poll, pollInterval);
      pollingTimeoutsRef.current.add(initialTimeout);
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Video upscale failed');
      toast.error(error instanceof Error ? error.message : 'Video upscale failed', { id: 'upscale-video' });
      setUpscaleVideoPending(false);
    }
  }, [supabase, projectId]);

  const handleGenerateAudioFromVideo = useCallback(async (asset: AssetRow, model: 'minimax' | 'mureka-1.5' | 'kling-turbo-2.5') => {
    const modelNames = {
      'minimax': 'MiniMax',
      'mureka-1.5': 'Mureka 1.5',
      'kling-turbo-2.5': 'Kling Turbo 2.5',
    };

    toast.loading(`Generating audio with ${modelNames[model]}...`, { id: 'generate-audio' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Submit audio generation request
      const res = await fetch('/api/video/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
          projectId,
          model,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Audio generation failed');
      }

      const requestId = json.requestId;
      toast.loading('Audio generation in progress... This may take a few minutes.', { id: 'generate-audio' });

      // Poll for completion
      const pollInterval = 5000; // 5 seconds
      const poll = async () => {
        try {
          const statusRes = await fetch(
            `/api/video/generate-audio-status?requestId=${encodeURIComponent(requestId)}&projectId=${projectId}&assetId=${asset.id}`
          );
          const statusJson = await statusRes.json();

          if (statusJson.status === 'completed') {
            toast.success('Audio generated successfully!', { id: 'generate-audio' });

            const mappedAsset = mapAssetRow(statusJson.asset as Record<string, unknown>);
            if (mappedAsset) {
              setAssets((prev) => [mappedAsset, ...prev]);
            }

            setActiveTab('audio');
          } else if (statusJson.status === 'failed') {
            throw new Error(statusJson.error || 'Audio generation failed');
          } else {
            // Continue polling - track timeout for cleanup
            const timeout = setTimeout(poll, pollInterval);
            pollingTimeoutsRef.current.add(timeout);
          }
        } catch (pollError) {
          browserLogger.error({ error: pollError, projectId }, 'Audio generation polling failed');
          toast.error(pollError instanceof Error ? pollError.message : 'Audio generation failed', { id: 'generate-audio' });
        }
      };

      // Start polling - track timeout for cleanup
      const initialTimeout = setTimeout(poll, pollInterval);
      pollingTimeoutsRef.current.add(initialTimeout);
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Audio generation failed');
      toast.error(error instanceof Error ? error.message : 'Audio generation failed', { id: 'generate-audio' });
    }
  }, [supabase, projectId]);

  const handleGenerateAudioFromClip = useCallback(async (clipId: string) => {
    if (!timeline) return;
    const clip = timeline.clips.find((c) => c.id === clipId);
    if (!clip) return;

    const asset = assets.find((a) => a.id === clip.assetId);
    if (!asset) {
      toast.error('Asset not found for clip');
      return;
    }

    // Default to minimax
    const model = 'minimax';
    await handleGenerateAudioFromVideo(asset, model);
  }, [timeline, assets, handleGenerateAudioFromVideo]);

  const handleSplitAudioFromClip = useCallback(async (clipId: string) => {
    if (!timeline) return;
    const clip = timeline.clips.find((c) => c.id === clipId);
    if (!clip) return;

    const asset = assets.find((a) => a.id === clip.assetId);
    if (!asset) {
      toast.error('Asset not found for clip');
      return;
    }

    if (asset.type !== 'video') {
      toast.error('Split audio only works with video clips');
      return;
    }

    await handleSplitAudio(asset);
  }, [timeline, assets, handleSplitAudio]);

  const handleSplitScenesFromClip = useCallback(async (clipId: string) => {
    if (!timeline) return;
    const clip = timeline.clips.find((c) => c.id === clipId);
    if (!clip) return;

    const asset = assets.find((a) => a.id === clip.assetId);
    if (!asset) {
      toast.error('Asset not found for clip');
      return;
    }

    if (asset.type !== 'video') {
      toast.error('Split scenes only works with video clips');
      return;
    }

    await handleSplitScenes(asset);
  }, [timeline, assets, handleSplitScenes]);

  const handleUpscaleVideoFromTimeline = useCallback(async () => {
    if (!timeline) return;

    // Get the first selected clip or error if no selection
    const selectedClipId = Array.from(timeline.clips).find(c =>
      useEditorStore.getState().selectedClipIds.has(c.id)
    )?.id;

    if (!selectedClipId) {
      toast.error('Please select a video clip to upscale');
      return;
    }

    const clip = timeline.clips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    const asset = assets.find((a) => a.id === clip.assetId);
    if (!asset) {
      toast.error('Asset not found for clip');
      return;
    }

    if (asset.type !== 'video') {
      toast.error('Upscale only works with video clips');
      return;
    }

    await handleUpscaleVideo(asset);
  }, [timeline, assets, handleUpscaleVideo]);

  // Memoize filtered assets for each tab to avoid filtering on every render
  const filteredAssets = useMemo(() => {
    return assets.filter((a) =>
      activeTab === 'video' ? a.type === 'video' :
      activeTab === 'image' ? a.type === 'image' :
      a.type === 'audio'
    );
  }, [assets, activeTab]);

  if (!timeline) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-sm text-neutral-500">Loading timeline…</span>
        <Toaster position="bottom-right" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <EditorHeader projectId={projectId} currentTab="video-editor" onExport={handleExportClick} />
      <div className="grid h-full grid-cols-[280px_1fr_320px] gap-6 p-6">
        <Toaster position="bottom-right" />
      {/* Assets Panel */}
      <aside className="flex flex-col gap-4 overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-neutral-900">Assets</h2>
          <div className="flex items-center gap-2">
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              accept={activeTab === 'video' ? 'video/*' : activeTab === 'image' ? 'image/*' : 'audio/*'}
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploadPending}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-75"
            >
              {uploadPending ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`px-3 py-2 text-xs font-medium transition ${
              activeTab === 'video'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Video
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`px-3 py-2 text-xs font-medium transition ${
              activeTab === 'image'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Images
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`px-3 py-2 text-xs font-medium transition ${
              activeTab === 'audio'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Audio
          </button>
        </div>

        {/* Video Tab Buttons */}
        {activeTab === 'video' && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploadPending}
              className="group w-full rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-75"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {uploadPending ? 'Uploading…' : 'Upload Video/Image'}
              </div>
            </button>
            <Link
              href={`/video-gen?projectId=${projectId}`}
              className="group w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-xs font-semibold text-white text-center shadow-md transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Generate Video with AI
              </div>
            </Link>
          </div>
        )}

        {/* Images Tab Buttons */}
        {activeTab === 'image' && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploadPending}
              className="group w-full rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-75"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {uploadPending ? 'Uploading…' : 'Upload Images'}
              </div>
            </button>
            <Link
              href={`/image-gen?projectId=${projectId}`}
              className="group w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-xs font-semibold text-white text-center shadow-md transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Generate Images with AI
              </div>
            </Link>
          </div>
        )}

        {/* Audio Tab Buttons */}
        {activeTab === 'audio' && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploadPending}
              className="group w-full rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-75"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {uploadPending ? 'Uploading…' : 'Upload Audio'}
              </div>
            </button>
            <Link
              href={`/audio-gen?projectId=${projectId}`}
              className="group w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-xs font-semibold text-white text-center shadow-md transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Generate Audio with AI
              </div>
            </Link>
          </div>
        )}
        {assetError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {assetError}
          </div>
        )}
        <div className="flex-1 overflow-y-auto space-y-3">
          {loadingAssets && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              Loading assets…
            </div>
          )}
          {!loadingAssets && filteredAssets.length === 0 && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              {activeTab === 'video' ? 'No video assets yet. Upload video to begin editing.' : activeTab === 'image' ? 'No image assets yet. Upload images.' : 'No audio assets yet. Upload or generate audio.'}
            </div>
          )}
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="group relative flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void handleClipAdd(asset)}
                className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-neutral-50 px-3 py-2 text-left transition hover:border-neutral-200 hover:bg-white"
              >
                {asset.metadata?.thumbnail ? (
                  <NextImage
                    src={asset.metadata.thumbnail}
                    alt=""
                    width={112}
                    height={64}
                    className="h-16 w-28 rounded-md object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-16 w-28 items-center justify-center rounded-md bg-neutral-200 text-xs text-neutral-600">
                    {asset.type.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 text-xs">
                  <p className="font-medium text-neutral-900">
                    {asset.metadata?.filename ?? extractFileName(asset.storage_url)}
                  </p>
                  <p className="text-neutral-500">
                    {asset.metadata?.mimeType ??
                     asset.metadata?.format ??
                     (asset.metadata?.videoCodec ? `${asset.metadata.videoCodec}/${asset.metadata.audioCodec ?? 'no audio'}` : null) ??
                     `${asset.type} file`}
                  </p>
                </div>
              </button>

              {/* Delete button - always visible */}
              <button
                onClick={() => void handleAssetDelete(asset)}
                className="absolute right-2 top-2 z-10 rounded-md bg-red-500 p-1.5 text-white shadow-lg transition-all hover:bg-red-600"
                title="Delete asset"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Editor */}
      <main className="flex h-full flex-col gap-4 overflow-hidden">
        <section className="flex-[18] overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <PreviewPlayer />
        </section>
        <section className="flex-[5] rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <HorizontalTimeline
            onDetectScenes={handleDetectScenes}
            sceneDetectPending={sceneDetectPending}
            onAddText={handleAddText}
            onAddTransition={handleAddTransition}
            onGenerateAudioFromClip={handleGenerateAudioFromClip}
            onUpscaleVideo={handleUpscaleVideoFromTimeline}
            upscaleVideoPending={upscaleVideoPending}
            onSplitAudioFromClip={handleSplitAudioFromClip}
            onSplitScenesFromClip={handleSplitScenesFromClip}
            splitAudioPending={splitAudioPending}
            splitScenesPending={splitScenesPending}
          />
        </section>
      </main>

      {/* Clip Properties Panel */}
      <ClipPropertiesPanel />

      {/* Audio Generation Modal */}
      {showAudioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Generate Audio</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAudioModal(false);
                  setAudioGenMode(null);
                }}
                disabled={audioGenPending}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!audioGenMode ? (
              <div className="space-y-3">
                <p className="text-sm text-neutral-600">Choose an AI provider to generate audio:</p>
                <button
                  type="button"
                  onClick={() => setAudioGenMode('suno')}
                  className="w-full rounded-lg border-2 border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <h4 className="font-semibold text-neutral-900">Suno V5</h4>
                  <p className="mt-1 text-xs text-neutral-600">Generate music and songs with AI</p>
                </button>
                <button
                  type="button"
                  onClick={() => setAudioGenMode('elevenlabs')}
                  className="w-full rounded-lg border-2 border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <h4 className="font-semibold text-neutral-900">ElevenLabs</h4>
                  <p className="mt-1 text-xs text-neutral-600">Generate speech from text with realistic voices</p>
                </button>
              </div>
            ) : audioGenMode === 'suno' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  void handleGenerateSuno({
                    prompt: formData.get('prompt') as string,
                    style: formData.get('style') as string,
                    title: formData.get('title') as string,
                    customMode: formData.get('customMode') === 'on',
                    instrumental: formData.get('instrumental') === 'on',
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="prompt" className="block text-sm font-medium text-neutral-700">
                    Prompt *
                  </label>
                  <textarea
                    id="prompt"
                    name="prompt"
                    required
                    rows={3}
                    placeholder="Describe the music you want to generate..."
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="style" className="block text-sm font-medium text-neutral-700">
                    Style/Genre
                  </label>
                  <input
                    id="style"
                    name="style"
                    type="text"
                    placeholder="e.g., Jazz, Classical, Electronic"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-neutral-700">
                    Title
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="Optional title for the track"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="customMode" className="rounded" />
                    <span className="text-sm text-neutral-700">Custom Mode</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="instrumental" className="rounded" />
                    <span className="text-sm text-neutral-700">Instrumental</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAudioGenMode(null)}
                    disabled={audioGenPending}
                    className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={audioGenPending}
                    className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {audioGenPending ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  void handleGenerateElevenLabs({
                    text: formData.get('text') as string,
                    voiceId: formData.get('voiceId') as string || undefined,
                    modelId: formData.get('modelId') as string || undefined,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="text" className="block text-sm font-medium text-neutral-700">
                    Text *
                  </label>
                  <textarea
                    id="text"
                    name="text"
                    required
                    rows={4}
                    placeholder="Enter the text you want to convert to speech..."
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="voiceId" className="block text-sm font-medium text-neutral-700">
                    Voice
                  </label>
                  <select
                    id="voiceId"
                    name="voiceId"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                  >
                    <option value="">Default (Sarah)</option>
                    <option value="EXAVITQu4vr4xnSDxMaL">Sarah</option>
                    <option value="pNInz6obpgDQGcFmaJgB">Adam</option>
                    <option value="21m00Tcm4TlvDq8ikWAM">Rachel</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="modelId" className="block text-sm font-medium text-neutral-700">
                    Model
                  </label>
                  <select
                    id="modelId"
                    name="modelId"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                  >
                    <option value="eleven_multilingual_v2">Multilingual v2 (High Quality)</option>
                    <option value="eleven_flash_v2_5">Flash v2.5 (Fast, Low Latency)</option>
                    <option value="eleven_turbo_v2_5">Turbo v2.5 (Balanced)</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAudioGenMode(null)}
                    disabled={audioGenPending}
                    className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={audioGenPending}
                    className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {audioGenPending ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Video Generation Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Generate Video with Veo 3.1</h3>
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                disabled={videoGenPending}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                void handleGenerateVideo({
                  prompt: formData.get('prompt') as string,
                  aspectRatio: (formData.get('aspectRatio') as '9:16' | '16:9' | '1:1') || '16:9',
                  duration: parseInt(formData.get('duration') as string) || 8,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="video-prompt" className="block text-xs font-medium text-neutral-700 mb-1">
                  Video Description
                </label>
                <textarea
                  id="video-prompt"
                  name="prompt"
                  required
                  disabled={videoGenPending}
                  placeholder="Describe the video you want to generate..."
                  rows={4}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="video-aspect-ratio" className="block text-xs font-medium text-neutral-700 mb-1">
                  Aspect Ratio
                </label>
                <select
                  id="video-aspect-ratio"
                  name="aspectRatio"
                  disabled={videoGenPending}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="9:16">9:16 (Portrait)</option>
                  <option value="1:1">1:1 (Square)</option>
                </select>
              </div>

              <div>
                <label htmlFor="video-duration" className="block text-xs font-medium text-neutral-700 mb-1">
                  Duration (seconds)
                </label>
                <select
                  id="video-duration"
                  name="duration"
                  disabled={videoGenPending}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="5">5 seconds</option>
                  <option value="8" selected>8 seconds</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  disabled={videoGenPending}
                  className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={videoGenPending}
                  className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {videoGenPending ? 'Generating...' : 'Generate Video'}
                </button>
              </div>

              {videoGenPending && videoOperationName && (
                <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-600">
                  Video generation in progress. This may take several minutes. You can close this modal and continue working.
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        projectId={projectId}
        timeline={timeline}
      />
      </div>
    </div>
  );
}
