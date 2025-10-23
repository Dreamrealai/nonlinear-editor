/**
 * useSceneDetection Hook
 *
 * Handles scene detection for video assets.
 * Automatically adds detected scenes to the timeline.
 */
'use client';

import { useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';
import type { AssetRow } from '@/components/editor/AssetPanel';
import type { Clip, Timeline } from '@/types/timeline';

export interface UseSceneDetectionReturn {
  /** Whether scene detection is in progress */
  sceneDetectPending: boolean;
  /** Detect scenes in the latest video */
  detectScenes: () => Promise<void>;
}

/**
 * Hook to manage scene detection.
 */
export function useSceneDetection(
  projectId: string,
  assets: AssetRow[],
  timeline: Timeline | null,
  setTimeline: (timeline: Timeline) => void
): UseSceneDetectionReturn {
  const [sceneDetectPending, setSceneDetectPending] = useState(false);

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

      // Add scenes as clips to timeline
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

  return {
    sceneDetectPending,
    detectScenes: handleDetectScenes,
  };
}
