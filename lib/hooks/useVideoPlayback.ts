/**
 * useVideoPlayback Hook
 *
 * Manages RAF-based video playback state and synchronization.
 * Extracted from PreviewPlayer to promote code reuse and reduce duplication.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import type { Clip } from '@/types/timeline';
import { browserLogger } from '@/lib/browserLogger';
import { PERFORMANCE_CONSTANTS } from '@/lib/constants';
import {
  clamp,
  computeOpacity,
  generateCSSFilter,
  generateCSSTransform,
  type ClipMeta,
} from '@/lib/utils/videoUtils';
import { useAudioEffects } from './useAudioEffects';

export interface UseVideoPlaybackOptions {
  sortedClips: Clip[];
  clipMetas: Map<string, ClipMeta>;
  videoMapRef: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  currentTime: number;
  totalDuration: number;
  setCurrentTime: (time: number) => void;
  ensureClipElement: (clip: Clip) => Promise<HTMLVideoElement>;
}

export interface UseVideoPlaybackReturn {
  isPlaying: boolean;
  playAll: () => Promise<void>;
  stopPlayback: (options?: { finalTime?: number }) => void;
  togglePlayPause: () => void;
  syncClipsAtTime: (time: number, play: boolean) => void;
}

const getPerformance = (): Pick<Performance, 'now'> => {
  const perfCandidate =
    (typeof window !== 'undefined' && window.performance) ||
    (typeof globalThis !== 'undefined' &&
      (globalThis as unknown as { performance?: Performance }).performance);

  if (perfCandidate && typeof perfCandidate.now === 'function') {
    return perfCandidate;
  }

  return {
    now: (): number => Date.now(),
  };
};

/**
 * Custom hook for managing video playback state with RAF synchronization.
 *
 * This hook encapsulates:
 * - Play/pause state management
 * - RAF-based playback loop
 * - Video synchronization across multiple clips
 * - Adaptive frame rate based on device capabilities
 */
export function useVideoPlayback({
  sortedClips,
  clipMetas,
  videoMapRef,
  currentTime,
  totalDuration,
  setCurrentTime,
  ensureClipElement,
}: UseVideoPlaybackOptions): UseVideoPlaybackReturn {
  const playingRef = useRef(false);
  const playbackRafRef = useRef<number | null>(null);
  const playStartRef = useRef(0);
  const startTimeRef = useRef(0);
  const globalTimeRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);

  // Track last sync time to throttle updates during RAF loop
  const lastSyncTimeRef = useRef<number>(0);
  const frameTimeThresholdRef = useRef<number>(PERFORMANCE_CONSTANTS.FRAME_TIME_60FPS); // Adaptive frame rate
  const droppedFramesRef = useRef<number>(0);
  const performanceCheckCountRef = useRef<number>(0);

  // Audio effects processing
  const { connectAudio, applyEffects, disconnectAudio } = useAudioEffects();

  // Detect device capabilities and adjust frame rate adaptively
  useEffect((): void => {
    // Check CPU cores and memory as indicators of device capability
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    // Device Memory API - experimental but supported in Chromium
    // https://developer.mozilla.org/en-US/docs/Web/API/Device_Memory_API
    const navigatorWithMemory = navigator as typeof navigator & { deviceMemory?: number };
    const deviceMemory = navigatorWithMemory.deviceMemory || 4; // In GB

    // Lower-end devices: 2 cores or less, or 2GB RAM or less
    const isLowerEndDevice = hardwareConcurrency <= 2 || deviceMemory <= 2;

    if (isLowerEndDevice) {
      // Reduce to 30fps for lower-end devices
      frameTimeThresholdRef.current = PERFORMANCE_CONSTANTS.FRAME_TIME_30FPS;
      browserLogger.info(
        {
          cores: hardwareConcurrency,
          memory: deviceMemory,
          targetFps: PERFORMANCE_CONSTANTS.TARGET_FPS_LOW,
        },
        'useVideoPlayback: Adaptive frame rate - Lower-end device detected, using 30fps'
      );
    } else {
      // Use 60fps for capable devices
      frameTimeThresholdRef.current = PERFORMANCE_CONSTANTS.FRAME_TIME_60FPS;
      browserLogger.info(
        {
          cores: hardwareConcurrency,
          memory: deviceMemory,
          targetFps: PERFORMANCE_CONSTANTS.TARGET_FPS_HIGH,
        },
        'useVideoPlayback: Adaptive frame rate - High-end device detected, using 60fps'
      );
    }
  }, []);

  /**
   * Synchronizes all video clips to a specific timeline time.
   * Handles opacity, playback rate, video seeking, and play/pause.
   */
  const syncClipsAtTime = useCallback(
    (time: number, play: boolean): void => {
      // Throttle sync during playback based on adaptive frame rate
      const now = getPerformance().now();
      const threshold = frameTimeThresholdRef.current;

      if (play && now - lastSyncTimeRef.current < threshold) {
        return;
      }

      // Track frame timing for dynamic adjustment
      const timeSinceLastFrame = now - lastSyncTimeRef.current;
      if (play && timeSinceLastFrame > threshold * 2) {
        // Frame took more than 2x the threshold - likely a dropped frame
        droppedFramesRef.current += 1;
        performanceCheckCountRef.current += 1;

        // Every 60 frames, check if we should reduce frame rate further
        if (performanceCheckCountRef.current >= 60) {
          const dropRate = droppedFramesRef.current / performanceCheckCountRef.current;

          // If dropping more than 20% of frames, reduce target frame rate
          if (dropRate > 0.2 && frameTimeThresholdRef.current < 50) {
            frameTimeThresholdRef.current = Math.min(50, frameTimeThresholdRef.current + 8);
            browserLogger.warn(
              {
                dropRate: Math.round(dropRate * 100),
                newThreshold: frameTimeThresholdRef.current,
                newFps: Math.round(1000 / frameTimeThresholdRef.current),
              },
              'useVideoPlayback: High frame drop rate detected, reducing target frame rate'
            );
          }

          // Reset counters
          droppedFramesRef.current = 0;
          performanceCheckCountRef.current = 0;
        }
      }

      lastSyncTimeRef.current = now;

      sortedClips.forEach((clip): void => {
        const meta = clipMetas.get(clip.id);
        const video = videoMapRef.current.get(clip.id);
        if (!meta || !video) {
          return;
        }

        const localProgress = time - meta.effectiveStart;
        if (localProgress < 0 || localProgress > meta.length) {
          video.style.opacity = '0';
          if (!video.paused) {
            video.pause();
          }
          return;
        }

        // Connect audio effects on first playback (if clip has audio)
        if (clip.hasAudio) {
          try {
            connectAudio(clip.id, video);
          } catch (error) {
            browserLogger.warn({ clipId: clip.id, error }, 'Failed to connect audio effects');
          }
        }

        const clipEnd = clip.start + meta.length;
        const targetTime = clamp(
          clip.start + localProgress,
          clip.start,
          clipEnd > clip.start ? clipEnd - 0.001 : clip.start
        );

        // Increased threshold from 0.05s to 0.3s to reduce excessive seeking
        // Only seek if video is buffered and not currently seeking
        const drift = Math.abs(video.currentTime - targetTime);
        if (drift > 0.3 && video.readyState >= 2 && !video.seeking) {
          video.currentTime = targetTime;
        }

        // Sync playback rate if clip has custom speed
        const desiredSpeed = clip.speed ?? 1.0;
        if (Math.abs(video.playbackRate - desiredSpeed) > 0.01) {
          video.playbackRate = desiredSpeed;
        }

        const opacity = computeOpacity(meta, localProgress);
        video.style.opacity = opacity.toString();

        // Apply color correction and transforms
        video.style.filter = generateCSSFilter(clip.colorCorrection);
        video.style.transform = generateCSSTransform(clip.transform);

        // Apply audio effects (if clip has audio)
        if (clip.hasAudio && clip.audioEffects) {
          try {
            const clipDuration = meta.length;
            applyEffects(clip.id, clip.audioEffects, localProgress, clipDuration);
          } catch (error) {
            browserLogger.warn({ clipId: clip.id, error }, 'Failed to apply audio effects');
          }
        }

        if (play) {
          if (video.paused && video.readyState >= 3) {
            // Only play if video has buffered enough data
            video.play().catch((error): void => {
              browserLogger.warn(
                {
                  clipId: clip.id,
                  error: error.message,
                  readyState: video.readyState,
                  networkState: video.networkState,
                },
                `Video play failed for clip ${clip.id}`
              );
            });
          }
        } else if (!video.paused) {
          video.pause();
        }
      });
    },
    [sortedClips, clipMetas, videoMapRef, connectAudio, applyEffects]
  );

  /**
   * Stops playback and pauses all videos.
   */
  const stopPlayback = useCallback(
    (options?: { finalTime?: number }): void => {
      if (playbackRafRef.current !== null) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
      playingRef.current = false;
      setIsPlaying(false);

      const finalTime = options?.finalTime ?? globalTimeRef.current;
      sortedClips.forEach((clip): void => {
        const video = videoMapRef.current.get(clip.id);
        const meta = clipMetas.get(clip.id);
        if (!video || !meta) return;
        const localProgress = finalTime - meta.effectiveStart;
        if (localProgress < 0 || localProgress > meta.length) {
          video.pause();
          video.style.opacity = '0';
          return;
        }
        const clipEnd = clip.start + meta.length;
        const targetTime = clamp(
          clip.start + localProgress,
          clip.start,
          clipEnd > clip.start ? clipEnd - 0.001 : clip.start
        );
        if (Math.abs(video.currentTime - targetTime) > 0.05) {
          video.currentTime = targetTime;
        }
        video.pause();
        video.style.opacity = computeOpacity(meta, localProgress).toString();
        // Apply color correction and transforms
        video.style.filter = generateCSSFilter(clip.colorCorrection);
        video.style.transform = generateCSSTransform(clip.transform);
      });
    },
    [sortedClips, clipMetas, videoMapRef]
  );

  /**
   * Starts RAF-based playback for all clips.
   */
  const playAll = useCallback(async (): Promise<void> => {
    try {
      if (sortedClips.length === 0) {
        return;
      }

      // Prepare all clips for playback with detailed error tracking
      const prepareResults = await Promise.allSettled(
        sortedClips.map((clip): Promise<HTMLVideoElement> => ensureClipElement(clip))
      );

      // Track which clips failed to prepare
      const failedClips: Array<{ clipId: string; assetId: string; error: unknown }> = [];
      prepareResults.forEach((result, index): void => {
        const clip = sortedClips[index];
        if (!clip) return;

        if (result.status === 'rejected') {
          const error = result.reason;
          const errorMessage = error instanceof Error ? error.message : String(error);

          failedClips.push({
            clipId: clip.id,
            assetId: clip.assetId,
            error,
          });

          browserLogger.error(
            {
              clipId: clip.id,
              assetId: clip.assetId,
              trackIndex: clip.trackIndex,
              error,
              errorMessage,
              totalClips: sortedClips.length,
              failedCount: failedClips.length,
            },
            `Failed to prepare clip for preview: ${errorMessage}`
          );
        }
      });

      // If all clips failed, abort playback
      if (failedClips.length === sortedClips.length && sortedClips.length > 0) {
        browserLogger.error(
          {
            totalClips: sortedClips.length,
            failedClips: failedClips.map((f): { clipId: string; assetId: string } => ({
              clipId: f.clipId,
              assetId: f.assetId,
            })),
          },
          'All clips failed to prepare - aborting playback'
        );
        throw new Error('Unable to prepare any clips for playback. Please check your video files.');
      }

      // Log warning if some clips failed
      if (failedClips.length > 0) {
        browserLogger.warn(
          {
            totalClips: sortedClips.length,
            successfulClips: sortedClips.length - failedClips.length,
            failedClips: failedClips.map((f): { clipId: string; assetId: string } => ({
              clipId: f.clipId,
              assetId: f.assetId,
            })),
          },
          `${failedClips.length} of ${sortedClips.length} clips failed to prepare - continuing with available clips`
        );
      }

      const start = clamp(currentTime, 0, totalDuration);
      syncClipsAtTime(start, false);

      playingRef.current = true;
      setIsPlaying(true);
      startTimeRef.current = start;
      playStartRef.current = getPerformance().now();
      globalTimeRef.current = start;

      const loop = (): void => {
        if (!playingRef.current) {
          return;
        }

        const elapsedSeconds = (getPerformance().now() - playStartRef.current) / 1000;
        const timelineTime = startTimeRef.current + elapsedSeconds;
        globalTimeRef.current = timelineTime;

        if (timelineTime >= totalDuration) {
          setCurrentTime(totalDuration);
          stopPlayback({ finalTime: totalDuration });
          return;
        }

        syncClipsAtTime(timelineTime, true);
        setCurrentTime(timelineTime);
        playbackRafRef.current = requestAnimationFrame(loop);
      };

      playbackRafRef.current = requestAnimationFrame(loop);
    } catch (error) {
      browserLogger.error({ error }, 'Failed to start playback');
      // Stop playback on error
      stopPlayback({ finalTime: currentTime });
    }
  }, [
    sortedClips,
    ensureClipElement,
    currentTime,
    totalDuration,
    syncClipsAtTime,
    setCurrentTime,
    stopPlayback,
  ]);

  /**
   * Toggles between play and pause.
   */
  const togglePlayPause = useCallback((): void => {
    if (isPlaying) {
      stopPlayback({ finalTime: currentTime });
    } else {
      playAll().catch((error): void => {
        browserLogger.error({ error }, 'Playback failed in togglePlayPause');
      });
    }
  }, [isPlaying, currentTime, stopPlayback, playAll]);

  // Cleanup on unmount
  useEffect((): (() => void) => {
    return (): void => {
      if (playbackRafRef.current !== null) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
      playingRef.current = false;
      // Clean up all audio effects connections
      sortedClips.forEach((clip): void => {
        if (clip.hasAudio) {
          disconnectAudio(clip.id);
        }
      });
    };
  }, [sortedClips, disconnectAudio]);

  return {
    isPlaying,
    playAll,
    stopPlayback,
    togglePlayPause,
    syncClipsAtTime,
  };
}
