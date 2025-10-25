/**
 * PreviewPlayer Component
 *
 * Multi-track video playback engine with support for:
 * - RAF-based synchronized playback across multiple video tracks
 * - Crossfade, fade-in, and fade-out transitions
 * - Per-clip opacity, volume, and playback speed
 * - Signed URL management with automatic caching and TTL handling
 * - Buffering state tracking to prevent playback issues
 *
 * Architecture:
 * - Uses RequestAnimationFrame (RAF) for smooth frame-by-frame sync
 * - Maintains one <video> element per clip for parallel loading
 * - Computes opacity dynamically for transitions and fades
 * - Prevents memory leaks with proper cleanup on unmount
 *
 * Refactored to use extracted hooks and components for maintainability.
 */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline, Clip } from '@/types/timeline';
import { TextOverlayRenderer } from './TextOverlayRenderer';
import { TextOverlayEditor } from './TextOverlayEditor';
import { PlaybackControls } from './preview/PlaybackControls';
import { browserLogger } from '@/lib/browserLogger';
import { computeClipMetas, type ClipMeta } from '@/lib/utils/videoUtils';
import { useVideoManager } from '@/lib/hooks/useVideoManager';
import { useVideoPlayback } from '@/lib/hooks/useVideoPlayback';

export function PreviewPlayer(): React.ReactElement | null {
  const timeline = useEditorStore((state): Timeline | null => state.timeline);
  const currentTime = useEditorStore((state): number => state.currentTime);
  const setCurrentTime = useEditorStore((state): ((time: number) => void) => state.setCurrentTime);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sort clips by timeline position
  const sortedClips = useMemo((): Clip[] => {
    if (!timeline) return [];
    return [...timeline.clips].sort((a, b): number => a.timelinePosition - b.timelinePosition);
  }, [timeline]);

  // Compute clip metadata (fades, crossfades, etc.)
  const clipMetas = useMemo(
    (): Map<string, ClipMeta> => computeClipMetas(sortedClips),
    [sortedClips]
  );

  // Calculate total duration
  const totalDuration = useMemo((): number => {
    let max = 0;
    sortedClips.forEach((clip): void => {
      const meta = clipMetas.get(clip.id);
      if (!meta) return;
      max = Math.max(max, meta.effectiveStart + meta.length);
    });
    return max;
  }, [sortedClips, clipMetas]);

  // Video element management (pooling, signed URLs, cleanup)
  const { videoMapRef, ensureClipElement, cleanupVideo } = useVideoManager({
    containerRef,
    timeline,
  });

  // Playback state management (RAF loop, sync, play/pause)
  const { isPlaying, stopPlayback, togglePlayPause, syncClipsAtTime } = useVideoPlayback({
    sortedClips,
    clipMetas,
    videoMapRef,
    currentTime,
    totalDuration,
    setCurrentTime,
    ensureClipElement,
  });

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async (): Promise<void> => {
    if (!playerContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await playerContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      browserLogger.error({ error }, 'Fullscreen error');
    }
  }, []);

  // Handle seeking from progress bar
  const handleSeek = useCallback(
    (newTime: number): void => {
      setCurrentTime(newTime);
      // Pause during seeking for smoother experience
      if (isPlaying) {
        stopPlayback({ finalTime: newTime });
      }
    },
    [setCurrentTime, isPlaying, stopPlayback]
  );

  // Handle fullscreen change events
  useEffect((): (() => void) => {
    const handleFullscreenChange = (): void => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return (): void => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle keyboard shortcuts (Space = play/pause)
  useEffect((): (() => void) => {
    const handleKeyPress = (event: KeyboardEvent): void => {
      if (event.code === 'Space' && event.target === document.body) {
        event.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return (): void => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [togglePlayPause]);

  // Warm up video elements when current time changes (not playing)
  useEffect((): (() => void) | undefined => {
    if (!timeline || timeline.clips.length === 0 || isPlaying) {
      return;
    }

    let cancelled = false;
    (async (): Promise<void> => {
      try {
        const targets = timeline.clips.filter((clip): boolean => {
          const meta = clipMetas.get(clip.id);
          if (!meta) return false;
          const localProgress = currentTime - meta.effectiveStart;
          return localProgress >= -2 && localProgress <= meta.length + 2;
        });

        // Warm clips near current time with detailed error tracking
        const warmResults = await Promise.allSettled(
          targets.map((clip): Promise<HTMLVideoElement> => ensureClipElement(clip))
        );

        // Track which clips failed to warm
        const failedWarmups: Array<{ clipId: string; assetId: string; error: unknown }> = [];
        warmResults.forEach((result, index): void => {
          const clip = targets[index];
          if (!clip) return;

          if (result.status === 'rejected') {
            const error = result.reason;
            const errorMessage = error instanceof Error ? error.message : String(error);

            failedWarmups.push({
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
                currentTime,
                totalTargets: targets.length,
                failedCount: failedWarmups.length,
              },
              `Failed to warm clip for preview: ${errorMessage}`
            );
          }
        });

        // Log summary if any clips failed to warm
        if (failedWarmups.length > 0) {
          browserLogger.warn(
            {
              totalTargets: targets.length,
              successfulWarmups: targets.length - failedWarmups.length,
              failedWarmups: failedWarmups.map((f): { clipId: string; assetId: string } => ({
                clipId: f.clipId,
                assetId: f.assetId,
              })),
              currentTime,
            },
            `${failedWarmups.length} of ${targets.length} clips failed to warm - they may not display correctly`
          );
        }

        if (cancelled) {
          return;
        }

        syncClipsAtTime(currentTime, false);
      } catch (error) {
        if (!cancelled) {
          browserLogger.error({ error, currentTime }, 'Failed to warm clips at current time');
        }
      }
    })();

    return (): void => {
      cancelled = true;
    };
  }, [timeline, currentTime, ensureClipElement, syncClipsAtTime, clipMetas, isPlaying]);

  // Clean up videos when timeline is removed
  useEffect((): void => {
    if (!timeline) {
      stopPlayback({ finalTime: 0 });
      videoMapRef.current.forEach((video, clipId): void => {
        cleanupVideo(clipId, video);
      });
      videoMapRef.current.clear();
    }
  }, [timeline, stopPlayback, cleanupVideo, videoMapRef]);

  if (!timeline) {
    return null;
  }

  return (
    <div ref={playerContainerRef} className="relative flex h-full flex-col">
      {/* Video Preview with overlay controls */}
      <div className="relative flex-1 overflow-hidden rounded-xl bg-black">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Text Overlays - Show editor when not playing, renderer when playing */}
        {timeline.textOverlays && timeline.textOverlays.length > 0 && (
          <>
            {isPlaying ? (
              <TextOverlayRenderer textOverlays={timeline.textOverlays} currentTime={currentTime} />
            ) : (
              <TextOverlayEditor
                textOverlays={timeline.textOverlays}
                currentTime={currentTime}
                containerRef={containerRef}
              />
            )}
          </>
        )}

        {/* Playback Controls */}
        <PlaybackControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          totalDuration={totalDuration}
          isFullscreen={isFullscreen}
          hasClips={timeline.clips.length > 0}
          onPlayPause={togglePlayPause}
          onSeek={handleSeek}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>
    </div>
  );
}
