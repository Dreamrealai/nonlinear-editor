/**
 * useVideoGeneration Hook
 *
 * Handles video generation using Google Vertex AI Veo models.
 * Manages generation state and polling for completion.
 */
'use client';

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';
import type { AssetRow } from '@/components/editor/AssetPanel';

interface VideoGenerationParams {
  prompt: string;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  duration?: number;
}

export interface UseVideoGenerationReturn {
  /** Whether video generation is in progress */
  videoGenPending: boolean;
  /** Current operation name (for polling) */
  videoOperationName: string | null;
  /** Generate a video */
  generateVideo: (params: VideoGenerationParams) => Promise<void>;
}

/**
 * Hook to manage video generation.
 */
export function useVideoGeneration(
  projectId: string,
  onVideoGenerated: (asset: AssetRow) => void
): UseVideoGenerationReturn {
  const [videoGenPending, setVideoGenPending] = useState(false);
  const [videoOperationName, setVideoOperationName] = useState<string | null>(null);

  const mapAssetRow = useCallback((row: Record<string, unknown>): AssetRow | null => {
    const id = typeof row.id === 'string' ? row.id : null;
    const storageUrl = typeof row.storage_url === 'string' ? row.storage_url : null;
    const type = row.type === 'video' || row.type === 'audio' || row.type === 'image' ? row.type : null;

    if (!id || !storageUrl || !type) {
      return null;
    }

    return row as AssetRow;
  }, []);

  const handleGenerateVideo = useCallback(async (params: VideoGenerationParams) => {
    setVideoGenPending(true);
    toast.loading('Generating video with Veo 3.1...', { id: 'generate-video' });

    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          projectId,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Video generation failed');
      }

      setVideoOperationName(json.operationName);
      toast.loading('Video generation in progress... This may take several minutes.', { id: 'generate-video' });

      // Poll for video generation status
      const pollInterval = 10000; // 10 seconds
      const poll = async () => {
        try {
          const statusRes = await fetch(`/api/video/status?operationName=${encodeURIComponent(json.operationName)}&projectId=${projectId}`);
          const statusJson = await statusRes.json();

          if (statusJson.done) {
            if (statusJson.error) {
              throw new Error(statusJson.error);
            }

            toast.success('Video generated successfully!', { id: 'generate-video' });

            const mappedAsset = mapAssetRow(statusJson.asset as Record<string, unknown>);
            if (mappedAsset) {
              onVideoGenerated(mappedAsset);
            }

            setVideoGenPending(false);
            setVideoOperationName(null);
          } else {
            // Continue polling
            setTimeout(poll, pollInterval);
          }
        } catch (pollError) {
          browserLogger.error({ error: pollError, projectId }, 'Video generation polling failed');
          toast.error(pollError instanceof Error ? pollError.message : 'Video generation failed', { id: 'generate-video' });
          setVideoGenPending(false);
          setVideoOperationName(null);
        }
      };

      setTimeout(poll, pollInterval);
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Video generation failed');
      toast.error(error instanceof Error ? error.message : 'Video generation failed', { id: 'generate-video' });
      setVideoGenPending(false);
    }
  }, [projectId, onVideoGenerated, mapAssetRow]);

  return {
    videoGenPending,
    videoOperationName,
    generateVideo: handleGenerateVideo,
  };
}
