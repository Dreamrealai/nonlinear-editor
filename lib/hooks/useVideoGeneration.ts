/**
 * useVideoGeneration Hook
 *
 * Handles video generation using Google Vertex AI Veo models.
 * Manages generation state and polling for completion.
 */
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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

  // Track polling state with refs to ensure proper cleanup
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef<number>(0);
  const MAX_RETRIES = 100; // Maximum 100 retries (~16 minutes at 10s intervals)

  const mapAssetRow = useCallback((row: Record<string, unknown>): AssetRow | null => {
    const id = typeof row.id === 'string' ? row.id : null;
    const storageUrl = typeof row.storage_url === 'string' ? row.storage_url : null;
    const type = row.type === 'video' || row.type === 'audio' || row.type === 'image' ? row.type : null;

    if (!id || !storageUrl || !type) {
      return null;
    }

    return row as AssetRow;
  }, []);

  // Cleanup function to stop polling and cancel requests
  const cleanupPolling = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    retryCountRef.current = 0;
  }, []);

  const handleGenerateVideo = useCallback(async (params: VideoGenerationParams) => {
    // Clean up any existing polling before starting new generation
    cleanupPolling();

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

      // Reset retry counter
      retryCountRef.current = 0;

      // Poll for video generation status
      const pollInterval = 10000; // 10 seconds
      const poll = async () => {
        // Check if we've exceeded max retries
        if (retryCountRef.current >= MAX_RETRIES) {
          cleanupPolling();
          toast.error(`Video generation timed out after ${MAX_RETRIES} attempts`, { id: 'generate-video' });
          setVideoGenPending(false);
          setVideoOperationName(null);
          return;
        }

        retryCountRef.current++;

        try {
          // Create new AbortController for this request
          abortControllerRef.current = new AbortController();

          const statusRes = await fetch(
            `/api/video/status?operationName=${encodeURIComponent(json.operationName)}&projectId=${projectId}`,
            { signal: abortControllerRef.current.signal }
          );
          const statusJson = await statusRes.json();

          if (statusJson.done) {
            cleanupPolling();

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
            pollingTimeoutRef.current = setTimeout(poll, pollInterval);
          }
        } catch (pollError) {
          // Ignore abort errors (they're intentional)
          if (pollError instanceof Error && pollError.name === 'AbortError') {
            return;
          }

          cleanupPolling();
          browserLogger.error({ error: pollError, projectId }, 'Video generation polling failed');
          toast.error(pollError instanceof Error ? pollError.message : 'Video generation failed', { id: 'generate-video' });
          setVideoGenPending(false);
          setVideoOperationName(null);
        }
      };

      pollingTimeoutRef.current = setTimeout(poll, pollInterval);
    } catch (error) {
      cleanupPolling();
      browserLogger.error({ error, projectId }, 'Video generation failed');
      toast.error(error instanceof Error ? error.message : 'Video generation failed', { id: 'generate-video' });
      setVideoGenPending(false);
    }
  }, [projectId, onVideoGenerated, mapAssetRow, cleanupPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPolling();
    };
  }, [cleanupPolling]);

  return {
    videoGenPending,
    videoOperationName,
    generateVideo: handleGenerateVideo,
  };
}
