'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { v4 as uuid } from 'uuid';
import toast, { Toaster } from 'react-hot-toast';
import HorizontalTimeline from '@/components/HorizontalTimeline';
import PreviewPlayer from '@/components/PreviewPlayer';
import { useAutosave } from '@/lib/hooks/useAutosave';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { saveTimeline, loadTimeline } from '@/lib/saveLoad';
import type { Clip, Timeline as TimelineType } from '@/types/timeline';
import { useEditorStore } from '@/state/useEditorStore';
import { browserLogger } from '@/lib/browserLogger';

type AssetMetadata = {
  filename?: string;
  mimeType?: string;
  thumbnail?: string;
  sourceUrl?: string;
  durationSeconds?: number | null;
  // Codec and format information (for playback diagnostics)
  format?: string;
  videoCodec?: string;
  audioCodec?: string;
  bitrate?: number;
};

type AssetRow = {
  id: string;
  storage_url: string;
  duration_seconds: number | null;
  metadata: AssetMetadata | null;
  rawMetadata: Record<string, unknown> | null;
  created_at: string | null;
  type: 'video' | 'audio' | 'image';
};

const isAssetType = (value: unknown): value is AssetRow['type'] =>
  value === 'video' || value === 'audio' || value === 'image';

const THUMBNAIL_WIDTH = 320;
const MIN_CLIP_DURATION = 0.1;

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

const enrichTimelineWithSourceDurations = (
  timeline: TimelineType,
  assets: AssetRow[]
): TimelineType => {
  if (!timeline?.clips?.length) {
    return timeline;
  }

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

    if (typeof next.sourceDuration === 'number') {
      const maxDuration = Math.max(next.sourceDuration, MIN_CLIP_DURATION);
      next.start = Math.min(Math.max(next.start, 0), Math.max(0, maxDuration - MIN_CLIP_DURATION));
      next.end = Math.min(Math.max(next.end, next.start + MIN_CLIP_DURATION), maxDuration);
    } else {
      next.sourceDuration = null;
      next.start = Math.max(next.start, 0);
      next.end = Math.max(next.end, next.start + MIN_CLIP_DURATION);
    }

    next.timelinePosition = Math.max(next.timelinePosition, 0);

    return next;
  });

  return {
    ...timeline,
    clips,
  };
};

const sanitizeFileName = (fileName: string) => {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return 'asset';
  }
  // Replace characters that could break storage paths or enable traversal
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
};

const extractStorageLocation = (storageUrl: string) => {
  const normalized = storageUrl.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const [bucket, ...parts] = normalized.split('/');
  if (!bucket || parts.length === 0) {
    return null;
  }
  return { bucket, path: parts.join('/') };
};

const extractFileName = (storageUrl: string) => {
  const normalized = storageUrl.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const segments = normalized.split('/');
  return segments[segments.length - 1] ?? normalized;
};

const createEmptyTimeline = (projectId: string): TimelineType => ({
  projectId,
  clips: [],
  output: {
    width: 1920,
    height: 1080,
    fps: 30,
    vBitrateK: 5000,
    aBitrateK: 192,
    format: 'mp4',
  },
});

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

type UploadAssetArgs = {
  file: File;
  projectId: string;
  assetType: AssetRow['type'];
};

async function uploadAsset({ file, projectId, assetType }: UploadAssetArgs) {
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
  const defaultPath = `${user.id}/${projectId}/${uuid()}-${sanitizedFileName}`;
  const storageInfo = extractStorageLocation(file.name) ?? { bucket: 'assets', path: defaultPath };
  const { bucket, path } = storageInfo;

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

  const timeline = useEditorStore((state) => state.timeline);
  const setTimeline = useEditorStore((state) => state.setTimeline);
  const addClip = useEditorStore((state) => state.addClip);

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

  const handleClipAdd = async (asset: AssetRow) => {
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
      timelinePosition: timeline.clips.length > 0 ? Math.max(...timeline.clips.map((c) => c.timelinePosition + (c.end - c.start))) : 0,
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
  };

  const handleDetectScenes = useCallback(async () => {
    const latestVideo = assets.find((asset) => asset.type === 'video');
    if (!latestVideo) {
      toast.error('Upload a video before detecting scenes');
      return;
    }

    setSceneDetectPending(true);
    toast.loading('Detecting scenes...', { id: 'detect-scenes' });

    try {
      const res = await fetch('/api/scenes/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, assetId: latestVideo.id }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Scene detection failed');
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

  if (!timeline) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-sm text-neutral-500">Loading timeline…</span>
        <Toaster position="bottom-right" />
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-[280px_1fr] gap-6 p-6">
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
              accept="video/*,audio/*,image/*"
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
          {!loadingAssets && assets.length === 0 && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              No assets yet. Upload media to begin editing.
            </div>
          )}
          {assets.map((asset) => (
            <div key={asset.id} className="group relative">
              <button
                type="button"
                onClick={() => void handleClipAdd(asset)}
                className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-neutral-50 px-3 py-2 text-left transition hover:border-neutral-200 hover:bg-white"
              >
                {asset.metadata?.thumbnail ? (
                  <img src={asset.metadata.thumbnail} alt="" className="h-16 w-28 rounded-md object-cover" />
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
        <section className="flex-[3] overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <PreviewPlayer />
        </section>
        <section className="flex-1 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <HorizontalTimeline
            onDetectScenes={handleDetectScenes}
            sceneDetectPending={sceneDetectPending}
          />
        </section>
      </main>
    </div>
  );
}
