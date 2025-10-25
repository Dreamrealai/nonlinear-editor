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
import type { AssetRow } from '@/types/assets';
import { mapAssetRow } from '@/lib/utils/assetUtils';
import type { GenerateVideoResponse } from '@/types/api';

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

  // Define video status response type
  interface VideoStatusResponse {
    done: boolean;
    error?: string;
    asset?: Record<string, unknown>;
  }

  // Centralized polling hook for video status checks
  const { startPolling: startVideoPolling, stopPolling: stopVideoPolling } =
    usePolling<VideoStatusResponse>({
      interval: 10000, // 10 seconds
      maxRetries: 100, // ~16 minutes max
      pollFn: async (): Promise<VideoStatusResponse> => {
        if (!videoOperationName) {
          throw new Error('No operation name set');
        }
        const response = await fetch(
          `/api/video/status?operationName=${encodeURIComponent(videoOperationName)}&projectId=${projectId}`
        );
        return response.json();
      },
      shouldContinue: (result): boolean => !result.done,
      onComplete: (result): void => {
        if (result.error) {
          toast.error(result.error, { id: 'generate-video' });
          browserLogger.error({ error: result.error, projectId }, 'Video generation failed');
        } else {
          toast.success('Video generated successfully!', { id: 'generate-video' });
          // mapAssetRow already handles Record<string, unknown> | undefined safely
          if (result.asset) {
            const mappedAsset = mapAssetRow(result.asset);
            if (mappedAsset) {
              onVideoGenerated(mappedAsset);
            }
          }
        }
        setVideoGenPending(false);
        setVideoOperationName(null);
      },
      onError: (error): void => {
        browserLogger.error({ error, projectId }, 'Video generation polling failed');
        toast.error(error.message, { id: 'generate-video' });
        setVideoGenPending(false);
        setVideoOperationName(null);
      },
      enableLogging: true,
      logContext: { projectId, operation: 'video-generation' },
    });

  const handleGenerateVideo = useCallback(
    async (params: VideoGenerationParams): Promise<void> => {
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

        const json = (await res.json()) as GenerateVideoResponse | { error: string };

        if (!res.ok) {
          const errorMessage =
            'error' in json ? json.error : 'Video generation failed';
          throw new Error(errorMessage);
        }

        // Type guard: after checking res.ok, json must be GenerateVideoResponse
        if ('operationName' in json) {
          setVideoOperationName(json.operationName);
        } else {
          throw new Error('Invalid response from server');
        }
        toast.loading('Video generation in progress... This may take several minutes.', {
          id: 'generate-video',
        });

        // Start polling using centralized hook
        startVideoPolling();
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Video generation failed');
        toast.error(error instanceof Error ? error.message : 'Video generation failed', {
          id: 'generate-video',
        });
        setVideoGenPending(false);
      }
    },
    [projectId, startVideoPolling, stopVideoPolling]
  );

  return {
    videoGenPending,
    videoOperationName,
    generateVideo: handleGenerateVideo,
  };
}
