/**
 * useVideoManager Hook
 *
 * Manages video element lifecycle, pooling, signed URLs, and cleanup.
 * Extracted from PreviewPlayer to promote code reuse and reduce duplication.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { Clip, Timeline } from '@/types/timeline';
import { browserLogger } from '@/lib/browserLogger';
import {
  ensureBuffered,
  generateCSSFilter,
  generateCSSTransform,
  SIGNED_URL_TTL_DEFAULT,
  SIGNED_URL_BUFFER_MS,
} from '@/lib/utils/videoUtils';

export interface UseVideoManagerOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  timeline: Timeline | null;
}

export interface UseVideoManagerReturn {
  videoMapRef: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  ensureClipElement: (clip: Clip) => Promise<HTMLVideoElement>;
  cleanupVideo: (clipId: string, video: HTMLVideoElement) => void;
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
  const signedUrlCacheRef = useRef<Map<string, { url: string; expiresAt: number }>>(new Map());
  const signedUrlRequestRef = useRef<Map<string, Promise<string | null>>>(new Map());
  const videoErrorHandlersRef = useRef<Map<string, (e: Event) => void>>(new Map());
  const videoPoolRef = useRef<HTMLVideoElement[]>([]);

  /**
   * Properly cleanup a video element before pooling or destroying.
   */
  const cleanupVideo = useCallback((clipId: string, video: HTMLVideoElement) => {
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
  }, []);

  /**
   * Locates the video source URL for a clip.
   * Handles signed URLs, caching, and direct URLs.
   */
  const locateClipSrc = useCallback(async (clip: Clip): Promise<string> => {
    try {
      if (!clip.filePath) {
        throw new Error('Clip is missing file path information.');
      }

      const directUrl = typeof clip.previewUrl === 'string' ? clip.previewUrl.trim() : '';
      if (directUrl && (directUrl.startsWith('http') || directUrl.startsWith('blob:'))) {
        return directUrl;
      }

      if (clip.filePath.startsWith('http') || clip.filePath.startsWith('blob:')) {
        return clip.filePath;
      }

      const cacheKey = clip.assetId ?? clip.filePath;
      const cached = signedUrlCacheRef.current.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.url;
      }

      const pending = signedUrlRequestRef.current.get(cacheKey);
      if (pending) {
        const result = await pending;
        if (!result) {
          throw new Error('Unable to resolve signed URL');
        }
        return result;
      }

      const params = new URLSearchParams(
        clip.assetId ? { assetId: clip.assetId } : { storageUrl: clip.filePath }
      );

      const request = (async () => {
        try {
          const response = await fetch(`/api/assets/sign?${params.toString()}`);
          if (!response.ok) {
            const detail = await response.text().catch(() => '');
            throw new Error(`Sign request failed (${response.status}) ${detail}`.trim());
          }

          const payload = (await response.json()) as { signedUrl?: string; expiresIn?: number };
          if (typeof payload.signedUrl !== 'string' || payload.signedUrl.length === 0) {
            throw new Error('Sign response missing signedUrl');
          }
          const expiresInSeconds =
            typeof payload.expiresIn === 'number' && Number.isFinite(payload.expiresIn)
              ? payload.expiresIn
              : SIGNED_URL_TTL_DEFAULT;
          const expiresAt =
            Date.now() + Math.max(0, expiresInSeconds * 1000 - SIGNED_URL_BUFFER_MS);
          signedUrlCacheRef.current.set(cacheKey, { url: payload.signedUrl, expiresAt });
          return payload.signedUrl;
        } catch (error) {
          browserLogger.error(
            { assetId: clip.assetId, error },
            'Failed to fetch signed URL for clip'
          );
          return null;
        } finally {
          signedUrlRequestRef.current.delete(cacheKey);
        }
      })();

      signedUrlRequestRef.current.set(cacheKey, request);
      const resolved = await request;
      if (!resolved) {
        throw new Error('Unable to resolve signed URL');
      }
      return resolved;
    } catch (error) {
      browserLogger.error(
        {
          clipId: clip.id,
          assetId: clip.assetId,
          filePath: clip.filePath,
          error,
        },
        'Failed to locate clip source'
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
          pending = (async () => {
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
              const errorHandler = (error: Event) => {
                browserLogger.error(
                  {
                    clipId: clip.id,
                    src: source,
                    error,
                    videoError: video.error,
                    readyState: video.readyState,
                    networkState: video.networkState,
                  },
                  'Video playback error'
                );
              };
              video.addEventListener('error', errorHandler);
              videoErrorHandlersRef.current.set(clip.id, errorHandler);

              // Wait for video to buffer enough data for smooth playback
              await ensureBuffered(video).catch((bufferError) => {
                browserLogger.error(
                  {
                    clipId: clip.id,
                    src: source,
                    error: bufferError,
                    readyState: video.readyState,
                    networkState: video.networkState,
                  },
                  'Video buffering failed'
                );
                throw bufferError;
              });

              videoMapRef.current.set(clip.id, video);
              container.appendChild(video);
              return video;
            } catch (error) {
              browserLogger.error(
                {
                  clipId: clip.id,
                  error,
                },
                'Failed to create video element for clip'
              );
              throw error;
            }
          })();

          videoPromisesRef.current.set(clip.id, pending);
        }

        return pending;
      } catch (error) {
        browserLogger.error(
          {
            clipId: clip.id,
            error,
          },
          'Failed to ensure clip element'
        );
        throw error;
      }
    },
    [containerRef, locateClipSrc]
  );

  // Cleanup signed URL cache when timeline changes
  useEffect(() => {
    const clips = timeline?.clips ?? [];
    const validKeys = new Set(
      clips
        .map((clip) => clip.assetId ?? clip.filePath)
        .filter((key): key is string => typeof key === 'string' && key.length > 0)
    );

    signedUrlCacheRef.current.forEach((_, key) => {
      if (!validKeys.has(key)) {
        signedUrlCacheRef.current.delete(key);
      }
    });
    signedUrlRequestRef.current.forEach((_, key) => {
      if (!validKeys.has(key)) {
        signedUrlRequestRef.current.delete(key);
      }
    });

    if (!timeline) {
      signedUrlCacheRef.current.clear();
      signedUrlRequestRef.current.clear();
    }
  }, [timeline]);

  // Cleanup video elements when timeline changes
  useEffect(() => {
    if (!timeline) {
      videoMapRef.current.forEach((video, clipId) => {
        cleanupVideo(clipId, video);
      });
      videoMapRef.current.clear();
      videoPromisesRef.current.clear();
      videoErrorHandlersRef.current.clear();
      return;
    }

    const clipIds = new Set(timeline.clips.map((clip) => clip.id));
    videoMapRef.current.forEach((video, id) => {
      if (!clipIds.has(id)) {
        cleanupVideo(id, video);
        videoMapRef.current.delete(id);
        videoPromisesRef.current.delete(id);
      }
    });
  }, [timeline, cleanupVideo]);

  // Component unmount cleanup
  useEffect(() => {
    const videoMap = videoMapRef.current;
    const videoPromises = videoPromisesRef.current;
    const errorHandlers = videoErrorHandlersRef.current;
    const signedUrlCache = signedUrlCacheRef.current;
    const signedUrlRequests = signedUrlRequestRef.current;
    const videoPool = videoPoolRef.current;

    return () => {
      // Clean up all active video elements (will return to pool or destroy)
      videoMap.forEach((video, clipId) => {
        cleanupVideo(clipId, video);
      });
      videoMap.clear();
      videoPromises.clear();
      errorHandlers.clear();
      signedUrlCache.clear();
      signedUrlRequests.clear();

      // Destroy all pooled video elements on unmount
      videoPool.forEach((video) => {
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.remove();
      });
      videoPool.length = 0;
    };
  }, [cleanupVideo]);

  return {
    videoMapRef,
    ensureClipElement,
    cleanupVideo,
  };
}
