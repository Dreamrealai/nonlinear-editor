/**
 * useAssetManager Hook
 *
 * Manages asset loading, uploading, and deletion for a project.
 * Handles asset thumbnail generation and metadata parsing.
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient, ensureHttpsProtocol } from '@/lib/supabase';
import { browserLogger } from '@/lib/browserLogger';
import type { AssetMetadata, AssetRow } from '@/components/editor/AssetPanel';

/** Maximum width for generated thumbnails in pixels */
const THUMBNAIL_WIDTH = 320;

/** Minimum duration for a clip in seconds */
const MIN_CLIP_DURATION = 0.1;

/**
 * Safely converts unknown values to a number representing duration in seconds.
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
 * Sanitizes file names to prevent path traversal attacks.
 */
const sanitizeFileName = (fileName: string) => {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return 'asset';
  }
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * Creates a thumbnail from an image blob.
 */
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

/**
 * Creates a thumbnail from a video blob.
 */
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
 * Parses and normalizes asset metadata from database records.
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
    // Ensure the URL has the https:// protocol (fixes old records missing protocol)
    result.sourceUrl = ensureHttpsProtocol(sourceUrl);
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
 * Type guard to check if a value is a valid asset type.
 */
const isAssetType = (value: unknown): value is AssetRow['type'] =>
  value === 'video' || value === 'audio' || value === 'image';

/**
 * Maps database row to AssetRow type.
 */
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

/**
 * Uploads a media file to Supabase storage and creates a database record.
 */
async function uploadAsset(
  file: File,
  projectId: string,
  assetType: AssetRow['type']
): Promise<AssetRow> {
  const supabase = createBrowserSupabaseClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user = userResult?.user;

  if (!user) {
    throw new Error('User session is required to upload assets');
  }

  const sanitizedFileName = sanitizeFileName(file.name);
  const folder = file.type.startsWith('audio') ? 'audio' : file.type.startsWith('image') ? 'image' : 'video';
  const defaultPath = `${user.id}/${projectId}/${folder}/${uuid()}-${sanitizedFileName}`;
  const bucket = 'assets';
  const path = defaultPath;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const extractFileName = (storageUrl: string) => {
    const normalized = storageUrl.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
    const segments = normalized.split('/');
    return segments[segments.length - 1] ?? normalized;
  };

  const displayFileName = file.name.trim() || extractFileName(path);

  const metadata: AssetMetadata = {
    filename: displayFileName,
    mimeType: file.type,
  };

  const mimeLower = file.type.toLowerCase();
  if (mimeLower.startsWith('image/')) {
    const thumb = await createImageThumbnail(new Blob([arrayBuffer], { type: file.type }));
    if (thumb) {
      metadata.thumbnail = thumb;
    }
  } else if (mimeLower.startsWith('video/')) {
    const thumb = await createVideoThumbnail(new Blob([arrayBuffer], { type: file.type }));
    if (thumb) {
      metadata.thumbnail = thumb;
    }
  }

  const { data: assetData, error: assetError } = await supabase
    .from('assets')
    .insert({
      id: uuid(),
      project_id: projectId,
      user_id: user.id,
      storage_url: `supabase://${bucket}/${path}`,
      type: assetType,
      metadata,
    })
    .select()
    .single();

  if (assetError) {
    throw assetError;
  }

  return assetData as AssetRow;
}

export interface UseAssetManagerReturn {
  /** List of all assets */
  assets: AssetRow[];
  /** Whether assets are currently loading */
  loadingAssets: boolean;
  /** Error message if loading failed */
  assetError: string | null;
  /** Whether assets have been loaded at least once */
  assetsLoaded: boolean;
  /** Upload a new asset */
  uploadAsset: (file: File) => Promise<void>;
  /** Delete an asset */
  deleteAsset: (asset: AssetRow, timeline: { clips: Array<{ assetId: string }> } | null, setTimeline: (timeline: { clips: Array<{ assetId: string }> }) => void) => Promise<void>;
  /** Reload assets from database */
  reloadAssets: () => Promise<void>;
}

/**
 * Hook to manage assets for a project.
 */
export function useAssetManager(projectId: string): UseAssetManagerReturn {
  const supabase = createBrowserSupabaseClient();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const processedThumbnailIdsRef = useRef<Set<string>>(new Set());

  const loadAssets = useCallback(async () => {
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

      const mapped = (data ?? [])
        .map((row) => mapAssetRow(row as Record<string, unknown>))
        .filter((asset): asset is AssetRow => Boolean(asset));

      setAssets(mapped);
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Failed to load assets');
      setAssetError('Failed to load assets. Please try again later.');
    } finally {
      setLoadingAssets(false);
      setAssetsLoaded(true);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  // Generate thumbnails for assets that don't have them
  useEffect(() => {
    if (!assetsLoaded) {
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
          const signedUrlResponse = await supabase.storage
            .from(asset.storage_url.replace('supabase://', '').split('/')[0] ?? '')
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
  }, [assets, assetsLoaded, supabase]);

  const handleAssetUpload = useCallback(
    async (file: File) => {
      const type: AssetRow['type'] = file.type.startsWith('audio')
        ? 'audio'
        : file.type.startsWith('image')
          ? 'image'
          : 'video';
      try {
        const result = await uploadAsset(file, projectId, type);
        setAssets((prev) => [result, ...prev]);
        toast.success('Asset uploaded');
      } catch (error) {
        browserLogger.error({ error, projectId, fileName: file.name }, 'Failed to upload asset');
        toast.error('Failed to upload asset');
      }
    },
    [projectId],
  );

  const handleAssetDelete = useCallback(
    async (asset: AssetRow, timeline: { clips: Array<{ assetId: string }> } | null, setTimeline: (timeline: { clips: Array<{ assetId: string }> }) => void) => {
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

        setAssets((prev) => prev.filter((a) => a.id !== asset.id));

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
    [projectId, supabase],
  );

  return {
    assets,
    loadingAssets,
    assetError,
    assetsLoaded,
    uploadAsset: handleAssetUpload,
    deleteAsset: handleAssetDelete,
    reloadAssets: loadAssets,
  };
}
