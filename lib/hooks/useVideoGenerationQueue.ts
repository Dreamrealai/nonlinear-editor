/**
 * useVideoGenerationQueue Hook
 *
 * Manages a queue of video generation operations.
 * Handles multiple concurrent video generations with polling and state management.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';
import { POLLING_CONFIG } from '@/lib/config';
import { signedUrlCache } from '@/lib/signedUrlCache';
import { ensureHttpsProtocol } from '@/lib/supabase';
import { isSupabasePublicAssetUrl } from '@/lib/utils/assetUtils';
import { SIGNED_URL_TTL_DEFAULT } from '@/lib/utils/videoUtils';
import type {
  VideoQueueItemData,
  VideoGenerationFormState,
} from '@/lib/utils/videoGenerationUtils';
import {
  createVideoQueueItem,
  updateQueueItemStatus,
  removeFromQueue,
  filterCompletedItems,
  validateVideoGenerationForm,
  buildVideoGenerationRequest,
} from '@/lib/utils/videoGenerationUtils';

export interface UseVideoGenerationQueueReturn {
  /** Current video queue */
  videoQueue: VideoQueueItemData[];
  /** Whether a generation is in progress */
  generating: boolean;
  /** Generate a new video and add to queue */
  generateVideo: (formState: VideoGenerationFormState, imageAssetId?: string) => Promise<void>;
  /** Remove a video from the queue */
  removeVideo: (videoId: string) => void;
  /** Clear all completed/failed videos */
  clearCompleted: () => void;
}

/**
 * Hook to manage video generation queue with polling
 */
export function useVideoGenerationQueue(projectId: string): UseVideoGenerationQueueReturn {
  const [videoQueue, setVideoQueue] = useState<VideoQueueItemData[]>([]);
  const [generating, setGenerating] = useState(false);
  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup polling intervals on unmount
  useEffect((): (() => void) => {
    const intervals = pollingIntervalsRef.current;
    return (): void => {
      intervals.forEach((interval): void => clearInterval(interval));
      intervals.clear();
    };
  }, []);

  // Start polling for a specific video
  const startPolling = useCallback(
    (videoId: string, operationName: string): void => {
      const pollInterval = POLLING_CONFIG.INTERVALS.VIDEO_STATUS;

      const poll = async (): Promise<void> => {
        try {
          const statusRes = await fetch(
            `/api/video/status?operationName=${encodeURIComponent(operationName)}&projectId=${projectId}`
          );
          const statusJson = await statusRes.json();

          if (statusJson.done) {
            // Clear polling interval
            const interval = pollingIntervalsRef.current.get(videoId);
            if (interval) {
              clearInterval(interval);
              pollingIntervalsRef.current.delete(videoId);
            }

            if (statusJson.error) {
              setVideoQueue((prev): VideoQueueItemData[] =>
                updateQueueItemStatus(prev, videoId, {
                  status: 'failed',
                  error: statusJson.error,
                })
              );
              toast.error(`Video generation failed: ${statusJson.error}`);
            } else if (statusJson.asset) {
              const asset = statusJson.asset as {
                id?: string;
                storage_url?: string;
                metadata?: {
                  sourceUrl?: string;
                  thumbnail?: string | null;
                } | null;
              };

              const assetId = typeof asset?.id === 'string' ? asset.id : undefined;
              const storageUrl =
                typeof asset?.storage_url === 'string' ? asset.storage_url : undefined;

              let playbackUrl =
                typeof asset?.metadata?.sourceUrl === 'string'
                  ? ensureHttpsProtocol(asset.metadata.sourceUrl)
                  : undefined;

              if (playbackUrl && isSupabasePublicAssetUrl(playbackUrl)) {
                playbackUrl = undefined;
              }

              if (!playbackUrl && storageUrl) {
                try {
                  const signedUrl = await signedUrlCache.get(
                    assetId,
                    storageUrl,
                    SIGNED_URL_TTL_DEFAULT
                  );

                  // Handle 404 (asset not found) gracefully
                  if (signedUrl) {
                    playbackUrl = signedUrl;
                  } else {
                    browserLogger.warn(
                      { assetId, storageUrl, videoId, operationName },
                      'Asset not found (404) - video may have been deleted'
                    );
                  }
                } catch (error) {
                  browserLogger.error(
                    { error, assetId, storageUrl, videoId, operationName },
                    'Failed to resolve signed URL for generated video'
                  );
                }
              }

              if (
                !playbackUrl &&
                typeof statusJson.storageUrl === 'string' &&
                !isSupabasePublicAssetUrl(statusJson.storageUrl)
              ) {
                playbackUrl = ensureHttpsProtocol(statusJson.storageUrl);
              }

              const thumbnailUrl =
                typeof asset?.metadata?.thumbnail === 'string' ? asset.metadata.thumbnail : '';

              if (!playbackUrl) {
                toast.error(
                  'Video generated, but playback link could not be created. Refresh the page to retry.'
                );
                setVideoQueue((prev): VideoQueueItemData[] =>
                  updateQueueItemStatus(prev, videoId, {
                    status: 'failed',
                    error: 'Playback link unavailable. Please refresh and try again.',
                  })
                );
                return;
              }

              setVideoQueue((prev): VideoQueueItemData[] =>
                updateQueueItemStatus(prev, videoId, {
                  status: 'completed',
                  videoUrl: playbackUrl,
                  thumbnailUrl,
                })
              );
              toast.success('Video generated successfully!');
            }
          }
        } catch (pollError) {
          browserLogger.error(
            { pollError, videoId, operationName },
            'Video generation polling failed'
          );
          const interval = pollingIntervalsRef.current.get(videoId);
          if (interval) {
            clearInterval(interval);
            pollingIntervalsRef.current.delete(videoId);
          }
          setVideoQueue((prev): VideoQueueItemData[] =>
            updateQueueItemStatus(prev, videoId, {
              status: 'failed',
              error: 'Polling failed',
            })
          );
        }
      };

      const interval = setInterval(poll, pollInterval);
      pollingIntervalsRef.current.set(videoId, interval);

      // Poll immediately
      poll();
    },
    [projectId]
  );

  // Generate a new video
  const generateVideo = useCallback(
    async (formState: VideoGenerationFormState, imageAssetId?: string): Promise<void> => {
      // Validate form
      const validation = validateVideoGenerationForm(formState.prompt, videoQueue.length);
      if (!validation.valid) {
        toast.error(validation.error || 'Validation failed');
        return;
      }

      const queueItem = createVideoQueueItem(formState.prompt);

      // Add to queue immediately
      setVideoQueue((prev): VideoQueueItemData[] => [...prev, queueItem]);
      setGenerating(true);

      try {
        // Build request body
        const requestBody = buildVideoGenerationRequest(projectId, formState, imageAssetId);

        const res = await fetch('/api/video/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Video generation failed');
        }

        // Update queue item with operation name and start polling
        setVideoQueue((prev): VideoQueueItemData[] =>
          updateQueueItemStatus(prev, queueItem.id, {
            operationName: json.operationName,
            status: 'generating',
          })
        );

        toast.success('Video generation started!');
        startPolling(queueItem.id, json.operationName);
      } catch (error) {
        browserLogger.error(
          { error, projectId, prompt: formState.prompt, model: formState.model },
          'Video generation failed'
        );
        toast.error(error instanceof Error ? error.message : 'Video generation failed');

        // Update queue item to failed
        setVideoQueue((prev): VideoQueueItemData[] =>
          updateQueueItemStatus(prev, queueItem.id, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      } finally {
        setGenerating(false);
      }
    },
    [projectId, videoQueue.length, startPolling]
  );

  // Remove a video from queue
  const removeVideo = useCallback((videoId: string): void => {
    // Clear polling interval if exists
    const interval = pollingIntervalsRef.current.get(videoId);
    if (interval) {
      clearInterval(interval);
      pollingIntervalsRef.current.delete(videoId);
    }

    setVideoQueue((prev): VideoQueueItemData[] => removeFromQueue(prev, videoId));
  }, []);

  // Clear completed videos
  const clearCompleted = useCallback((): void => {
    setVideoQueue((prev): VideoQueueItemData[] => filterCompletedItems(prev));
  }, []);

  return {
    videoQueue,
    generating,
    generateVideo,
    removeVideo,
    clearCompleted,
  };
}
