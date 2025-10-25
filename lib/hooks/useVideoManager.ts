/**
 * useVideoManager Hook
 *
 * Manages video element lifecycle, pooling, signed URLs, and cleanup.
 * Extracted from PreviewPlayer to promote code reuse and reduce duplication.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Clip, Timeline } from '@/types/timeline';
import { browserLogger } from '@/lib/browserLogger';
import { signedUrlCache } from '@/lib/signedUrlCache';
import { isSupabasePublicAssetUrl } from '@/lib/utils/assetUtils';
import {
  ensureBuffered,
  generateCSSFilter,
  generateCSSTransform,
  SIGNED_URL_TTL_DEFAULT,
  SIGNED_URL_BUFFER_MS,
} from '@/lib/utils/videoUtils';

export interface UseVideoManagerOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  timeline: Timeline | null;
}

export interface UseVideoManagerReturn {
  videoMapRef: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  ensureClipElement: (clip: Clip) => Promise<HTMLVideoElement>;
  cleanupVideo: (clipId: string, video: HTMLVideoElement) => void;
  /** Error message if video operations failed */
  videoError: string | null;
  /** Clear video error state */
  clearVideoError: () => void;
}

/**
 * Maximum number of video elements to keep in the pool.
 * Prevents memory leaks while allowing reuse.
 */
const VIDEO_POOL_MAX_SIZE = 10;

/**
 * Custom hook for managing video elements, pooling, and signed URLs.
 *
 * This hook encapsulates:
 * - Video element creation and pooling for memory efficiency
 * - Signed URL caching and management
 * - Video element cleanup and lifecycle
 */
export function useVideoManager({
  containerRef,
  timeline,
}: UseVideoManagerOptions): UseVideoManagerReturn {
  const videoMapRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const videoPromisesRef = useRef<Map<string, Promise<HTMLVideoElement>>>(new Map());
  const videoErrorHandlersRef = useRef<Map<string, (e: Event) => void>>(new Map());
  const videoPoolRef = useRef<HTMLVideoElement[]>([]);
  const [videoError, setVideoError] = useState<string | null>(null);

  const clearVideoError = useCallback((): void => {
    setVideoError(null);
  }, []);

  /**
   * Properly cleanup a video element before pooling or destroying.
   */
  const cleanupVideo = useCallback((clipId: string, video: HTMLVideoElement): void => {
    // Remove event listeners
    const errorHandler = videoErrorHandlersRef.current.get(clipId);
    if (errorHandler) {
      video.removeEventListener('error', errorHandler);
      videoErrorHandlersRef.current.delete(clipId);
    }

    // Aggressive cleanup before pooling/destroying
    video.pause();
    video.removeAttribute('src');
    video.load(); // Critical: forces browser to release media resources
    video.style.opacity = '0';

    // Return to pool or destroy based on pool size
    if (videoPoolRef.current.length < VIDEO_POOL_MAX_SIZE) {
      videoPoolRef.current.push(video);
    } else {
      video.remove(); // Destroy if pool is full
    }
  }, []) satisfies UseVideoManagerReturn['cleanupVideo'];

  /**
   * Locates the video source URL for a clip.
   * Handles signed URLs, caching, and direct URLs.
   * Uses centralized signed URL cache with request deduplication.
   */
  const locateClipSrc = useCallback(async (clip: Clip): Promise<string> => {
    try {
      if (!clip.filePath) {
        throw new Error('Clip is missing file path information.');
      }

      const previewUrl = typeof clip.previewUrl === 'string' ? clip.previewUrl.trim() : '';
      const previewRequiresSigning = previewUrl ? isSupabasePublicAssetUrl(previewUrl) : false;

      if (
        previewUrl &&
        !previewRequiresSigning &&
        (previewUrl.startsWith('http') || previewUrl.startsWith('blob:'))
      ) {
        return previewUrl;
      }

      if (
        !clip.filePath.startsWith('supabase://') &&
        (clip.filePath.startsWith('http') || clip.filePath.startsWith('blob:')) &&
        !previewRequiresSigning
      ) {
        return clip.filePath;
      }

      const ttlSeconds = Math.max(5, SIGNED_URL_TTL_DEFAULT - SIGNED_URL_BUFFER_MS / 1000);
      const storageTarget = clip.filePath.startsWith('supabase://') ? clip.filePath : undefined;

      const signedUrl = await signedUrlCache.get(clip.assetId, storageTarget, ttlSeconds);
      return signedUrl;
    } catch (error) {
      const errorMessage = `Failed to locate clip source for ${clip.id}`;
      setVideoError(errorMessage);
      browserLogger.error(
        {
          clipId: clip.id,
          assetId: clip.assetId,
          filePath: clip.filePath,
          error,
        },
        errorMessage
      );
      throw error;
    }
  }, []);

  /**
   * Ensures a video element exists for a clip, creating it if needed.
   * Uses object pooling to reduce memory allocation.
   */
  const ensureClipElement = useCallback(
    async (clip: Clip): Promise<HTMLVideoElement> => {
      try {
        const existing = videoMapRef.current.get(clip.id);
        if (existing) {
          return existing;
        }

        let pending = videoPromisesRef.current.get(clip.id);
        if (!pending) {
          pending = (async (): Promise<HTMLVideoElement> => {
            try {
              const container = containerRef.current;
              if (!container) {
                throw new Error('Preview container not mounted');
              }

              // Get video from pool or create new one
              const video = videoPoolRef.current.pop() ?? document.createElement('video');
              video.playsInline = true;
              video.preload = 'auto';
              video.controls = false;
              video.disablePictureInPicture = true;
              video.style.position = 'absolute';
              video.style.inset = '0';
              video.style.width = '100%';
              video.style.height = '100%';
              video.style.objectFit = 'contain';
              video.style.pointerEvents = 'none';
              video.style.opacity = '0';
              // Remove CSS transition - RAF will handle opacity smoothly
              video.style.transition = 'none';
              video.style.zIndex = String(1000 - clip.trackIndex);
              video.style.willChange = 'opacity, transform, filter';
              video.style.transform = generateCSSTransform(clip.transform);
              video.style.filter = generateCSSFilter(clip.colorCorrection);
              video.style.backfaceVisibility = 'hidden';
              // Mute non-primary tracks to prevent browser audio throttling
              video.muted = clip.trackIndex !== 0;

              const source = await locateClipSrc(clip);
              // Set crossOrigin BEFORE src to avoid CORS issues
              video.crossOrigin = 'anonymous';
              video.src = source;

              // Store error handler for cleanup
              const errorHandler = (error: Event): void => {
                const videoErrorDetails = video.error;
                let errorCategory = 'unknown';
                let errorMessage = 'Unknown video error';
                let userFriendlyMessage = 'Unable to play video. Please try again.';

                // Categorize error based on video.error.code
                // https://developer.mozilla.org/en-US/docs/Web/API/MediaError
                if (videoErrorDetails) {
                  switch (videoErrorDetails.code) {
                    case 1: // MEDIA_ERR_ABORTED
                      errorCategory = 'aborted';
                      errorMessage = 'Video loading was aborted';
                      userFriendlyMessage = 'Video loading was cancelled. Please try again.';
                      break;
                    case 2: // MEDIA_ERR_NETWORK
                      errorCategory = 'network';
                      errorMessage = 'Network error while loading video';
                      userFriendlyMessage =
                        'Network error. Please check your connection and try again.';
                      break;
                    case 3: // MEDIA_ERR_DECODE
                      errorCategory = 'decode';
                      errorMessage = 'Video decoding failed (unsupported format or corrupted file)';
                      userFriendlyMessage =
                        'Unable to play this video format. Please try a different file.';
                      break;
                    case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                      errorCategory = 'unsupported';
                      errorMessage = 'Video source not supported or not found';
                      userFriendlyMessage =
                        'This video format is not supported or the file was not found.';
                      break;
                  }
                }

                // Log detailed error information
                browserLogger.error(
                  {
                    clipId: clip.id,
                    assetId: clip.assetId,
                    src: source,
                    error,
                    errorCategory,
                    errorCode: videoErrorDetails?.code,
                    errorMessage: videoErrorDetails?.message,
                    readyState: video.readyState,
                    networkState: video.networkState,
                    currentSrc: video.currentSrc,
                  },
                  `Video playback error: ${errorMessage}`
                );

                // Set user-friendly error message
                setVideoError(userFriendlyMessage);
              };
              video.addEventListener('error', errorHandler);
              videoErrorHandlersRef.current.set(clip.id, errorHandler);

              // Wait for video to buffer enough data for smooth playback
              await ensureBuffered(video).catch((bufferError): never => {
                const errorMessage =
                  bufferError instanceof Error ? bufferError.message : String(bufferError);
                const isTimeout = errorMessage.includes('timeout');
                const isLoadError = errorMessage.includes('loading error');

                browserLogger.error(
                  {
                    clipId: clip.id,
                    assetId: clip.assetId,
                    src: source,
                    error: bufferError,
                    errorType: isTimeout
                      ? 'buffering_timeout'
                      : isLoadError
                        ? 'loading_error'
                        : 'buffering_error',
                    readyState: video.readyState,
                    networkState: video.networkState,
                    videoError: video.error?.code,
                    currentSrc: video.currentSrc,
                  },
                  `Video buffering failed: ${errorMessage}`
                );

                // Set user-friendly error message
                if (isTimeout) {
                  setVideoError('Video is taking too long to load. Please check your connection.');
                } else if (isLoadError) {
                  setVideoError('Failed to load video. The file may be corrupted or inaccessible.');
                } else {
                  setVideoError('Unable to prepare video for playback. Please try again.');
                }

                throw bufferError;
              });

              videoMapRef.current.set(clip.id, video);
              container.appendChild(video);
              return video;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              const isContainerError = errorMessage.includes('container not mounted');
              const isSourceError = errorMessage.includes('locate clip source');

              browserLogger.error(
                {
                  clipId: clip.id,
                  assetId: clip.assetId,
                  error,
                  errorType: isContainerError
                    ? 'container_not_mounted'
                    : isSourceError
                      ? 'source_location_failed'
                      : 'element_creation_failed',
                  containerMounted: !!containerRef.current,
                },
                `Failed to create video element for clip: ${errorMessage}`
              );

              // Set user-friendly error message
              if (isContainerError) {
                setVideoError('Video player not ready. Please refresh the page.');
              } else if (isSourceError) {
                setVideoError(
                  'Failed to access video file. It may have been deleted or is inaccessible.'
                );
              } else {
                setVideoError('Failed to initialize video player. Please try again.');
              }

              throw error;
            }
          })();

          videoPromisesRef.current.set(clip.id, pending);
        }

        return pending;
      } catch (error) {
        const errorMessage = `Failed to ensure clip element for ${clip.id}`;
        setVideoError(errorMessage);
        browserLogger.error(
          {
            clipId: clip.id,
            error,
          },
          errorMessage
        );
        throw error;
      }
    },
    [containerRef, locateClipSrc]
  );

  // Cleanup signed URL cache when timeline changes
  useEffect((): void => {
    if (!timeline) {
      // Clear cache for this timeline when unmounting
      signedUrlCache.prune();
    }
  }, [timeline]);

  // Cleanup video elements when timeline changes
  useEffect((): void => {
    if (!timeline) {
      videoMapRef.current.forEach((video, clipId): void => {
        cleanupVideo(clipId, video);
      });
      videoMapRef.current.clear();
      videoPromisesRef.current.clear();
      videoErrorHandlersRef.current.clear();
      return;
    }

    const clipIds = new Set(timeline.clips.map((clip): string => clip.id));
    videoMapRef.current.forEach((video, id): void => {
      if (!clipIds.has(id)) {
        cleanupVideo(id, video);
        videoMapRef.current.delete(id);
        videoPromisesRef.current.delete(id);
      }
    });
  }, [timeline, cleanupVideo]);

  // Component unmount cleanup
  useEffect((): (() => void) => {
    const videoMap = videoMapRef.current;
    const videoPromises = videoPromisesRef.current;
    const errorHandlers = videoErrorHandlersRef.current;
    const videoPool = videoPoolRef.current;

    return (): void => {
      // Clean up all active video elements (will return to pool or destroy)
      videoMap.forEach((video, clipId): void => {
        cleanupVideo(clipId, video);
      });
      videoMap.clear();
      videoPromises.clear();
      errorHandlers.clear();

      // Destroy all pooled video elements on unmount
      videoPool.forEach((video): void => {
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.remove();
      });
      videoPool.length = 0;

      // Prune expired signed URLs
      signedUrlCache.prune();
    };
  }, [cleanupVideo]);

  return {
    videoMapRef,
    ensureClipElement,
    cleanupVideo,
    videoError,
    clearVideoError,
  };
}
