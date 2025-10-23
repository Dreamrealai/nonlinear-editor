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
 */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Clip, TextOverlay } from '@/types/timeline';
import TextOverlayRenderer from './TextOverlayRenderer';
import TextOverlayEditor from './TextOverlayEditor';
import VideoPlayerHoverMenu from './VideoPlayerHoverMenu';

/** Default TTL for signed URLs in seconds (10 minutes) */
const SIGNED_URL_TTL_DEFAULT = 600;

/** Buffer time before URL expiration to refresh (5 seconds) */
const SIGNED_URL_BUFFER_MS = 5_000;

/**
 * Computed metadata for a clip on the timeline.
 * Includes fade/crossfade information for rendering.
 */
type ClipMeta = {
  /** Duration of the clip in seconds (end - start) */
  length: number;
  /** Original timeline position before crossfades */
  timelineStart: number;
  /** Effective start position accounting for crossfades */
  effectiveStart: number;
  /** Fade-in duration in seconds */
  fadeIn: number;
  /** Fade-out duration in seconds */
  fadeOut: number;
};

/**
 * Clamps a value between min and max.
 * @param value - Value to clamp
 * @param min - Minimum bound (default 0)
 * @param max - Maximum bound (default 1)
 * @returns Clamped value
 */
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/**
 * Computes playback metadata for all clips including transition effects.
 *
 * This function processes crossfade transitions between clips on the same track.
 * When clip A has a crossfade-out transition, it overlaps with clip B, and
 * clip B's effective start is adjusted backwards to create the overlap.
 *
 * Process:
 * 1. Extract fade-in, fade-out, and crossfade settings from each clip
 * 2. Group clips by track index
 * 3. For each track, adjust effectiveStart for clips with crossfade-in
 * 4. Return a map of clip IDs to their computed metadata
 *
 * @param clips - Array of timeline clips
 * @returns Map of clip IDs to computed metadata
 */
const computeClipMetas = (clips: Clip[]): Map<string, ClipMeta> => {
  if (clips.length === 0) {
    return new Map();
  }

  // Extended metadata type that tracks crossfade-in and crossfade-out separately
  type InternalMeta = ClipMeta & { crossfadeOut: number; crossfadeIn: number };

  // Initialize metadata for each clip
  const base: InternalMeta[] = clips.map((clip) => {
    const length = Math.max(0, clip.end - clip.start);
    const timelineStart = Math.max(0, clip.timelinePosition);
    const transition = clip.transitionToNext;

    // Extract transition durations (minimum 50ms to avoid issues)
    const fadeInBase =
      transition?.type === 'fade-in' ? Math.max(0.05, transition.duration || 0.5) : 0;
    const fadeOutBase =
      transition?.type === 'fade-out' ? Math.max(0.05, transition.duration || 0.5) : 0;
    const crossfadeOut =
      transition?.type === 'crossfade' ? Math.min(length, Math.max(0.05, transition.duration || 0.5)) : 0;

    return {
      length,
      timelineStart,
      effectiveStart: timelineStart, // Will be adjusted for crossfades
      fadeIn: fadeInBase,
      fadeOut: fadeOutBase,
      crossfadeOut,
      crossfadeIn: 0,
    };
  });

  // Group clips by track index for crossfade processing
  const clipsByTrack = new Map<number, number[]>();
  clips.forEach((clip, index) => {
    const list = clipsByTrack.get(clip.trackIndex) ?? [];
    list.push(index);
    clipsByTrack.set(clip.trackIndex, list);
  });

  // Process crossfades: adjust effectiveStart for overlapping clips
  clipsByTrack.forEach((indices) => {
    // Sort clips by timeline position within each track
    indices.sort((a, b) => clips[a].timelinePosition - clips[b].timelinePosition);

    // Check adjacent clips for crossfade transitions
    for (let i = 1; i < indices.length; i += 1) {
      const prev = base[indices[i - 1]];
      const next = base[indices[i]];
      if (!prev || !next) {
        continue;
      }
      // If previous clip has crossfade-out, adjust next clip's start
      if (prev.crossfadeOut > 0) {
        const overlapStart = prev.timelineStart + Math.max(0, prev.length - prev.crossfadeOut);
        next.effectiveStart = Math.min(next.effectiveStart, overlapStart);
        next.crossfadeIn = Math.max(next.crossfadeIn, prev.crossfadeOut);
      }
    }
  });

  // Build final metadata map combining fades and crossfades
  const metaMap = new Map<string, ClipMeta>();
  base.forEach((meta, index) => {
    metaMap.set(clips[index].id, {
      length: meta.length,
      timelineStart: meta.timelineStart,
      effectiveStart: Math.max(0, meta.effectiveStart),
      // Use the maximum of fade-in and crossfade-in
      fadeIn: Math.max(meta.fadeIn, meta.crossfadeIn),
      // Use the maximum of fade-out and crossfade-out
      fadeOut: Math.max(meta.fadeOut, meta.crossfadeOut),
    });
  });

  return metaMap;
};

/**
 * Computes opacity for a clip based on its progress and fade settings.
 *
 * Opacity curve:
 * - Fades in from 0 to 1 over fadeIn duration
 * - Remains at 1 during middle section
 * - Fades out from 1 to 0 over fadeOut duration
 *
 * @param meta - Clip metadata with fade settings
 * @param progress - Playback progress within the clip (0 to meta.length)
 * @returns Opacity value between 0 and 1
 */
const computeOpacity = (meta: ClipMeta, progress: number) => {
  // Clip is not visible outside its duration
  if (progress < 0 || progress > meta.length) {
    return 0;
  }

  let opacity = 1;

  // Apply fade-in at the start
  if (meta.fadeIn > 0) {
    opacity = Math.min(opacity, clamp(progress / meta.fadeIn));
  }

  // Apply fade-out at the end
  if (meta.fadeOut > 0) {
    const remaining = meta.length - progress;
    opacity = Math.min(opacity, clamp(remaining / meta.fadeOut));
  }

  return clamp(opacity);
};

/**
 * Formats time in seconds to MM:SS:FF timecode.
 * FF represents frames at 30fps.
 *
 * @param seconds - Time in seconds
 * @returns Formatted timecode string (e.g., "01:23:15")
 */
const formatTimecode = (seconds: number): string => {
  if (!Number.isFinite(seconds)) {
    return '00:00:00';
  }
  const safe = Math.max(0, seconds);
  const totalSeconds = Math.floor(safe);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const frames = Math.floor((safe - totalSeconds) * 30); // 30fps
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames
    .toString()
    .padStart(2, '0')}`;
};

/**
 * Ensures video has buffered enough data for smooth playback.
 * Waits for readyState >= 3 (HAVE_FUTURE_DATA) instead of just metadata.
 */
async function ensureBuffered(video: HTMLVideoElement, timeout = 10000): Promise<void> {
  // readyState 3 = HAVE_FUTURE_DATA (enough data to play without immediate stalling)
  if (video.readyState >= 3) {
    return;
  }

  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Video buffering timeout after ${timeout}ms (readyState: ${video.readyState})`));
    }, timeout);

    const cleanup = () => {
      clearTimeout(timeoutId);
      video.removeEventListener('canplay', handler);
      video.removeEventListener('canplaythrough', handler);
      video.removeEventListener('error', errorHandler);
    };

    const handler = () => {
      if (video.readyState >= 3) {
        cleanup();
        resolve();
      }
    };

    const errorHandler = () => {
      cleanup();
      reject(new Error(`Video loading error: ${video.error?.message || 'Unknown error'}`));
    };

    video.addEventListener('canplay', handler);
    video.addEventListener('canplaythrough', handler);
    video.addEventListener('error', errorHandler);
  });
}

export default function PreviewPlayer() {
  const timeline = useEditorStore((state) => state.timeline);
  const currentTime = useEditorStore((state) => state.currentTime);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  const addTextOverlay = useEditorStore((state) => state.addTextOverlay);
  const addTransitionToSelectedClips = useEditorStore((state) => state.addTransitionToSelectedClips);
  const selectedClipIds = useEditorStore((state) => state.selectedClipIds);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoMapRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const videoPromisesRef = useRef<Map<string, Promise<HTMLVideoElement>>>(new Map());
  const signedUrlCacheRef = useRef<Map<string, { url: string; expiresAt: number }>>(new Map());
  const signedUrlRequestRef = useRef<Map<string, Promise<string | null>>>(new Map());
  // Track event listeners for proper cleanup
  const videoErrorHandlersRef = useRef<Map<string, (e: Event) => void>>(new Map());

  const playingRef = useRef(false);
  const playbackRafRef = useRef<number | null>(null);
  const playStartRef = useRef(0);
  const startTimeRef = useRef(0);
  const globalTimeRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const sortedClips = useMemo(() => {
    if (!timeline) return [];
    return [...timeline.clips].sort((a, b) => a.timelinePosition - b.timelinePosition);
  }, [timeline]);

  const clipMetas = useMemo(() => computeClipMetas(sortedClips), [sortedClips]);

  const totalDuration = useMemo(() => {
    let max = 0;
    sortedClips.forEach((clip) => {
      const meta = clipMetas.get(clip.id);
      if (!meta) return;
      max = Math.max(max, meta.effectiveStart + meta.length);
    });
    return max;
  }, [sortedClips, clipMetas]);

  // Proper video cleanup to prevent memory leaks
  const cleanupVideo = useCallback((clipId: string, video: HTMLVideoElement) => {
    // Remove event listeners
    const errorHandler = videoErrorHandlersRef.current.get(clipId);
    if (errorHandler) {
      video.removeEventListener('error', errorHandler);
      videoErrorHandlersRef.current.delete(clipId);
    }

    // Pause and clear source to release media buffers
    video.pause();
    video.removeAttribute('src');
    video.load(); // Critical: forces browser to release media resources
    video.remove();
  }, []);

  const locateClipSrc = useCallback(async (clip: Clip) => {
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
      clip.assetId ? { assetId: clip.assetId } : { storageUrl: clip.filePath },
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
        const expiresAt = Date.now() + Math.max(0, expiresInSeconds * 1000 - SIGNED_URL_BUFFER_MS);
        signedUrlCacheRef.current.set(cacheKey, { url: payload.signedUrl, expiresAt });
        return payload.signedUrl;
      } catch (error) {
        console.error('Failed to fetch signed URL for clip', { assetId: clip.assetId, error });
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
  }, []);

  const ensureClipElement = useCallback(
    async (clip: Clip): Promise<HTMLVideoElement> => {
      const existing = videoMapRef.current.get(clip.id);
      if (existing) {
        return existing;
      }

      let pending = videoPromisesRef.current.get(clip.id);
      if (!pending) {
        pending = (async () => {
          const container = containerRef.current;
          if (!container) {
            throw new Error('Preview container not mounted');
          }

          const video = document.createElement('video');
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
          video.style.willChange = 'opacity, transform';
          video.style.transform = 'translateZ(0)';
          video.style.backfaceVisibility = 'hidden';
          // Mute non-primary tracks to prevent browser audio throttling
          video.muted = clip.trackIndex !== 0;

          const source = await locateClipSrc(clip);
          // Set crossOrigin BEFORE src to avoid CORS issues
          video.crossOrigin = 'anonymous';
          video.src = source;

          // Store error handler for cleanup
          const errorHandler = (error: Event) => {
            console.error('Video playback error', {
              clipId: clip.id,
              src: source,
              error,
              videoError: video.error,
              readyState: video.readyState,
              networkState: video.networkState,
            });
          };
          video.addEventListener('error', errorHandler);
          videoErrorHandlersRef.current.set(clip.id, errorHandler);

          // Wait for video to buffer enough data for smooth playback
          await ensureBuffered(video);

          videoMapRef.current.set(clip.id, video);
          container.appendChild(video);
          return video;
        })();

        videoPromisesRef.current.set(clip.id, pending);
      }

      return pending;
    },
    [locateClipSrc],
  );

  const stopPlayback = useCallback(
    (options?: { finalTime?: number }) => {
      if (playbackRafRef.current !== null) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
      playingRef.current = false;
      setIsPlaying(false);

      const finalTime = options?.finalTime ?? globalTimeRef.current;
      sortedClips.forEach((clip) => {
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
          clipEnd > clip.start ? clipEnd - 0.001 : clip.start,
        );
        if (Math.abs(video.currentTime - targetTime) > 0.05) {
          video.currentTime = targetTime;
        }
        video.pause();
        video.style.opacity = computeOpacity(meta, localProgress).toString();
      });
    },
    [sortedClips, clipMetas],
  );

  // Component unmount cleanup
  useEffect(() => {
    const videoMap = videoMapRef.current;
    const videoPromises = videoPromisesRef.current;
    const errorHandlers = videoErrorHandlersRef.current;
    const signedUrlCache = signedUrlCacheRef.current;
    const signedUrlRequests = signedUrlRequestRef.current;

    return () => {
      // Stop playback
      if (playbackRafRef.current !== null) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
      playingRef.current = false;

      // Clean up all video elements
      videoMap.forEach((video, clipId) => {
        cleanupVideo(clipId, video);
      });
      videoMap.clear();
      videoPromises.clear();
      errorHandlers.clear();
      signedUrlCache.clear();
      signedUrlRequests.clear();
    };
  }, [cleanupVideo]);

  useEffect(() => {
    const clips = timeline?.clips ?? [];
    const validKeys = new Set(
      clips
        .map((clip) => clip.assetId ?? clip.filePath)
        .filter((key): key is string => typeof key === 'string' && key.length > 0),
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

  // Track last sync time to throttle updates during RAF loop
  const lastSyncTimeRef = useRef<number>(0);

  const syncClipsAtTime = useCallback(
    (time: number, play: boolean) => {
      // Throttle sync during playback to every 16ms (60fps max)
      const now = performance.now();
      if (play && now - lastSyncTimeRef.current < 16) {
        return;
      }
      lastSyncTimeRef.current = now;

      sortedClips.forEach((clip) => {
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

        const clipEnd = clip.start + meta.length;
        const targetTime = clamp(
          clip.start + localProgress,
          clip.start,
          clipEnd > clip.start ? clipEnd - 0.001 : clip.start,
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

        if (play) {
          if (video.paused && video.readyState >= 3) {
            // Only play if video has buffered enough data
            video.play().catch((error) => {
              console.warn(`Video play failed for clip ${clip.id}:`, {
                error: error.message,
                readyState: video.readyState,
                networkState: video.networkState,
              });
            });
          }
        } else if (!video.paused) {
          video.pause();
        }
      });
    },
    [sortedClips, clipMetas],
  );

  const playAll = useCallback(async () => {
    if (!timeline || timeline.clips.length === 0) {
      return;
    }

    await Promise.all(sortedClips.map((clip) => ensureClipElement(clip).catch((error) => {
      console.error('Failed to prepare clip for preview', { clipId: clip.id, error });
    })));

    const start = clamp(currentTime, 0, totalDuration);
    syncClipsAtTime(start, false);

    playingRef.current = true;
    setIsPlaying(true);
    startTimeRef.current = start;
    playStartRef.current = performance.now();
    globalTimeRef.current = start;

    const loop = () => {
      if (!playingRef.current) {
        return;
      }

      const elapsedSeconds = (performance.now() - playStartRef.current) / 1000;
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
  }, [timeline, sortedClips, ensureClipElement, currentTime, totalDuration, syncClipsAtTime, setCurrentTime, stopPlayback]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      stopPlayback({ finalTime: currentTime });
    } else {
      void playAll();
    }
  }, [isPlaying, currentTime, stopPlayback, playAll]);

  const toggleFullscreen = useCallback(async () => {
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
      console.error('Fullscreen error:', error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space' && event.target === document.body) {
        event.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [togglePlayPause]);

  useEffect(() => {
    if (!timeline) {
      stopPlayback({ finalTime: 0 });
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
  }, [timeline, stopPlayback, cleanupVideo]);

  useEffect(() => {
    if (!timeline || timeline.clips.length === 0 || playingRef.current) {
      return;
    }

    let cancelled = false;
    (async () => {
      const targets = timeline.clips.filter((clip) => {
        const meta = clipMetas.get(clip.id);
        if (!meta) return false;
        const localProgress = currentTime - meta.effectiveStart;
        return localProgress >= -2 && localProgress <= meta.length + 2;
      });

      await Promise.all(targets.map((clip) => ensureClipElement(clip).catch((error) => {
        console.error('Failed to warm clip for preview', { clipId: clip.id, error });
      })));

      if (cancelled) {
        return;
      }

      syncClipsAtTime(currentTime, false);
    })();

    return () => {
      cancelled = true;
    };
  }, [timeline, currentTime, ensureClipElement, syncClipsAtTime, clipMetas]);

  // Handler for adding text overlay from hover menu
  const handleAddText = useCallback(
    (x: number, y: number) => {
      const newTextOverlay: TextOverlay = {
        id: `text-${Date.now()}`,
        text: 'New Text',
        timelinePosition: currentTime,
        duration: 3, // Default 3 seconds
        x,
        y,
        fontSize: 48,
        color: '#ffffff',
        backgroundColor: 'transparent',
        fontFamily: 'sans-serif',
        align: 'center',
        opacity: 1.0,
      };
      addTextOverlay(newTextOverlay);
    },
    [currentTime, addTextOverlay]
  );

  // Handler for adding transition to selected clips from hover menu
  const handleAddTransition = useCallback(() => {
    if (selectedClipIds.size > 0) {
      // Default to crossfade with 0.5s duration
      addTransitionToSelectedClips('crossfade', 0.5);
    } else if (timeline) {
      // If no clips selected, find the clip at current playback time and add transition
      const clipAtCurrentTime = timeline.clips.find(
        (clip) => clip.timelinePosition <= currentTime && clip.timelinePosition + (clip.end - clip.start) >= currentTime
      );

      if (clipAtCurrentTime) {
        // Select the clip at current time and add transition
        const clipId = clipAtCurrentTime.id;
        if (clipId) {
          useEditorStore.getState().selectClip(clipId, false);
          addTransitionToSelectedClips('crossfade', 0.5);
        }
      }
    }
  }, [selectedClipIds, addTransitionToSelectedClips, timeline, currentTime]);

  if (!timeline) {
    return null;
  }

  const progress = totalDuration > 0 ? clamp(currentTime / totalDuration, 0, 1) : 0;
  const formattedCurrent = formatTimecode(currentTime);
  const formattedTotal = formatTimecode(totalDuration);

  return (
    <div
      ref={playerContainerRef}
      className="relative flex h-full flex-col"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isPlaying && setShowControls(true)}
    >
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

        {/* Hover Menu for Adding Text and Transitions */}
        {!isPlaying && (
          <VideoPlayerHoverMenu
            onAddText={handleAddText}
            onAddTransition={handleAddTransition}
            currentTime={currentTime}
          />
        )}

        {/* Overlay Controls - Auto-hide on play */}
        {showControls && (
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 transition-opacity duration-300 z-[1050]">
            {/* Close/Hide Controls Button */}
            <button
              type="button"
              onClick={() => setShowControls(false)}
              className="absolute top-4 right-4 rounded-full bg-black/50 hover:bg-black/70 p-2 text-white transition-all backdrop-blur-sm"
              title="Hide controls"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="absolute top-4 right-16 rounded-full bg-black/50 hover:bg-black/70 p-2 text-white transition-all backdrop-blur-sm"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>

            {/* Bottom Controls Container */}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-1.5 w-full rounded-full bg-white/30 backdrop-blur-sm">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-200"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="flex items-center justify-center gap-2 rounded-full bg-white hover:bg-white/90 px-6 py-3 text-sm font-bold text-black transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 shadow-lg"
                    disabled={!timeline.clips.length}
                    title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  >
                    {isPlaying ? (
                      <>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>Play</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2 text-sm font-mono font-semibold text-white drop-shadow-lg">
                    <span>{formattedCurrent}</span>
                    <span className="text-white/60">/</span>
                    <span>{formattedTotal}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Show controls button when hidden */}
        {!showControls && (
          <button
            type="button"
            onClick={() => setShowControls(true)}
            className="absolute bottom-4 right-4 rounded-full bg-black/50 hover:bg-black/70 p-3 text-white transition-all backdrop-blur-sm opacity-0 hover:opacity-100"
            title="Show controls"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
