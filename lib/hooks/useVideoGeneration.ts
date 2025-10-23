/**
 * useVideoGeneration Hook
 *
 * Handles video generation using Google Vertex AI Veo models.
 * Manages generation state and polling for completion using the centralized usePolling hook.
 */
'use client';

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';
import { usePolling } from '@/lib/hooks/usePolling';
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
 * Hook to manage video generation using centralized polling infrastructure.
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

  // Centralized polling hook for video status checks
  const { startPolling: startVideoPolling, stopPolling: stopVideoPolling } = usePolling<{ done: boolean; error?: string; asset?: Record<string, unknown> }>({
    interval: 10000, // 10 seconds
    maxRetries: 100, // ~16 minutes max
    pollFn: async () => {
      if (!videoOperationName) {
        throw new Error('No operation name set');
      }
      const response = await fetch(
        `/api/video/status?operationName=${encodeURIComponent(videoOperationName)}&projectId=${projectId}`
      );
      return response.json();
    },
    shouldContinue: (result) => !result.done,
    onComplete: (result) => {
      if (result.error) {
        toast.error(result.error, { id: 'generate-video' });
        browserLogger.error({ error: result.error, projectId }, 'Video generation failed');
      } else {
        toast.success('Video generated successfully!', { id: 'generate-video' });
        const mappedAsset = mapAssetRow(result.asset as Record<string, unknown>);
        if (mappedAsset) {
          onVideoGenerated(mappedAsset);
        }
      }
      setVideoGenPending(false);
      setVideoOperationName(null);
    },
    onError: (error) => {
      browserLogger.error({ error, projectId }, 'Video generation polling failed');
      toast.error(error.message, { id: 'generate-video' });
      setVideoGenPending(false);
      setVideoOperationName(null);
    },
    enableLogging: true,
    logContext: { projectId, operation: 'video-generation' },
  });

  const handleGenerateVideo = useCallback(async (params: VideoGenerationParams) => {
    // Stop any existing polling
    stopVideoPolling();

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

      // Start polling using centralized hook
      startVideoPolling();
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Video generation failed');
      toast.error(error instanceof Error ? error.message : 'Video generation failed', { id: 'generate-video' });
      setVideoGenPending(false);
    }
  }, [projectId, startVideoPolling, stopVideoPolling]);

  return {
    videoGenPending,
    videoOperationName,
    generateVideo: handleGenerateVideo,
  };
}
