'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Clip } from '@/types/timeline';

const SIGNED_URL_TTL_DEFAULT = 600;
const SIGNED_URL_BUFFER_MS = 5_000;

type ClipMeta = {
  length: number;
  timelineStart: number;
  effectiveStart: number;
  fadeIn: number;
  fadeOut: number;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const computeClipMetas = (clips: Clip[]): Map<string, ClipMeta> => {
  if (clips.length === 0) {
    return new Map();
  }

  type InternalMeta = ClipMeta & { crossfadeOut: number; crossfadeIn: number };

  const base: InternalMeta[] = clips.map((clip) => {
    const length = Math.max(0, clip.end - clip.start);
    const timelineStart = Math.max(0, clip.timelinePosition);
    const transition = clip.transitionToNext;

    const fadeInBase =
      transition?.type === 'fade-in' ? Math.max(0.05, transition.duration || 0.5) : 0;
    const fadeOutBase =
      transition?.type === 'fade-out' ? Math.max(0.05, transition.duration || 0.5) : 0;
    const crossfadeOut =
      transition?.type === 'crossfade' ? Math.min(length, Math.max(0.05, transition.duration || 0.5)) : 0;

    return {
      length,
      timelineStart,
      effectiveStart: timelineStart,
      fadeIn: fadeInBase,
      fadeOut: fadeOutBase,
      crossfadeOut,
      crossfadeIn: 0,
    };
  });

  const clipsByTrack = new Map<number, number[]>();
  clips.forEach((clip, index) => {
    const list = clipsByTrack.get(clip.trackIndex) ?? [];
    list.push(index);
    clipsByTrack.set(clip.trackIndex, list);
  });

  clipsByTrack.forEach((indices) => {
    indices.sort((a, b) => clips[a].timelinePosition - clips[b].timelinePosition);
    for (let i = 1; i < indices.length; i += 1) {
      const prev = base[indices[i - 1]];
      const next = base[indices[i]];
      if (!prev || !next) {
        continue;
      }
      if (prev.crossfadeOut > 0) {
        const overlapStart = prev.timelineStart + Math.max(0, prev.length - prev.crossfadeOut);
        next.effectiveStart = Math.min(next.effectiveStart, overlapStart);
        next.crossfadeIn = Math.max(next.crossfadeIn, prev.crossfadeOut);
      }
    }
  });

  const metaMap = new Map<string, ClipMeta>();
  base.forEach((meta, index) => {
    metaMap.set(clips[index].id, {
      length: meta.length,
      timelineStart: meta.timelineStart,
      effectiveStart: Math.max(0, meta.effectiveStart),
      fadeIn: Math.max(meta.fadeIn, meta.crossfadeIn),
      fadeOut: Math.max(meta.fadeOut, meta.crossfadeOut),
    });
  });

  return metaMap;
};

const computeOpacity = (meta: ClipMeta, progress: number) => {
  if (progress < 0 || progress > meta.length) {
    return 0;
  }
  let opacity = 1;
  if (meta.fadeIn > 0) {
    opacity = Math.min(opacity, clamp(progress / meta.fadeIn));
  }
  if (meta.fadeOut > 0) {
    const remaining = meta.length - progress;
    opacity = Math.min(opacity, clamp(remaining / meta.fadeOut));
  }
  return clamp(opacity);
};

const formatTimecode = (seconds: number): string => {
  if (!Number.isFinite(seconds)) {
    return '00:00:00';
  }
  const safe = Math.max(0, seconds);
  const totalSeconds = Math.floor(safe);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const frames = Math.floor((safe - totalSeconds) * 30);
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

  const syncClipsAtTime = useCallback(
    (time: number, play: boolean) => {
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

  if (!timeline) {
    return null;
  }

  const progress = totalDuration > 0 ? clamp(currentTime / totalDuration, 0, 1) : 0;
  const formattedCurrent = formatTimecode(currentTime);
  const formattedTotal = formatTimecode(totalDuration);

  return (
    <div className="relative flex h-full flex-col gap-3">
      {/* Video Preview */}
      <div className="relative flex-1 overflow-hidden rounded-xl bg-black">
        <div ref={containerRef} className="absolute inset-0" />
      </div>

      {/* Progress Bar */}
      <div className="w-full px-2">
        <div className="h-2 w-full rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-sky-500 transition-all duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-4 pb-1">
        <button
          type="button"
          onClick={togglePlayPause}
          className="flex items-center justify-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 shadow"
          disabled={!timeline.clips.length}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? (
            <>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              <span>Pause</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>Play</span>
            </>
          )}
        </button>
        <div className="flex items-center gap-2 text-sm font-mono font-medium text-neutral-700">
          <span>{formattedCurrent}</span>
          <span className="text-neutral-400">/</span>
          <span>{formattedTotal}</span>
        </div>
      </div>
    </div>
  );
}
