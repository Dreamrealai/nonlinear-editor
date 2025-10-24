/**
 * Video Utility Functions
 *
 * Shared utilities for video playback, time formatting, and CSS transformations.
 * Extracted from PreviewPlayer to promote code reuse and maintainability.
 */

import type { Clip, ColorCorrection, Transform, TransitionType } from '@/types/timeline';

/** Default TTL for signed URLs in seconds (10 minutes) */
export const SIGNED_URL_TTL_DEFAULT = 600;

/** Buffer time before URL expiration to refresh (5 seconds) */
export const SIGNED_URL_BUFFER_MS = 5_000;

/**
 * Computed metadata for a clip on the timeline.
 * Includes fade/crossfade information for rendering.
 */
export type ClipMeta = {
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
  /** Transition type for rendering */
  transitionType: TransitionType;
  /** Transition duration in seconds */
  transitionDuration: number;
};

/**
 * Clamps a value between min and max.
 * @param value - Value to clamp
 * @param min - Minimum bound (default 0)
 * @param max - Maximum bound (default 1)
 * @returns Clamped value
 */
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/**
 * Generates CSS filter string from color correction settings.
 * @param colorCorrection - Color correction settings (optional)
 * @returns CSS filter string
 */
export const generateCSSFilter = (colorCorrection?: ColorCorrection): string => {
  if (!colorCorrection) {
    return 'none';
  }

  const filters: string[] = [];

  // Brightness: 0-200% (100 = no change)
  if (colorCorrection.brightness !== 100) {
    filters.push(`brightness(${colorCorrection.brightness}%)`);
  }

  // Contrast: 0-200% (100 = no change)
  if (colorCorrection.contrast !== 100) {
    filters.push(`contrast(${colorCorrection.contrast}%)`);
  }

  // Saturation: 0-200% (100 = no change)
  if (colorCorrection.saturation !== 100) {
    filters.push(`saturate(${colorCorrection.saturation}%)`);
  }

  // Hue: 0-360 degrees (0 = no change)
  if (colorCorrection.hue !== 0) {
    filters.push(`hue-rotate(${colorCorrection.hue}deg)`);
  }

  // Blur: 0-20 pixels (0 = no blur)
  const blur = (colorCorrection as { blur?: number }).blur;
  if (blur !== undefined && blur > 0) {
    filters.push(`blur(${blur}px)`);
  }

  return filters.length > 0 ? filters.join(' ') : 'none';
};

/**
 * Generates CSS transform string from transform settings.
 * @param transform - Transform settings (optional)
 * @returns CSS transform string
 */
export const generateCSSTransform = (transform?: Transform): string => {
  if (!transform) {
    return 'translateZ(0)';
  }

  const transforms: string[] = ['translateZ(0)']; // Always include for GPU acceleration

  // Flip horizontal/vertical (apply before scale to avoid double scaling)
  const scaleX = transform.flipHorizontal ? -1 : 1;
  const scaleY = transform.flipVertical ? -1 : 1;

  // Combined scale (user scale * flip scale)
  const finalScale = transform.scale || 1.0;
  transforms.push(`scale(${scaleX * finalScale}, ${scaleY * finalScale})`);

  // Rotation: 0-360 degrees (0 = no change)
  if (transform.rotation !== 0) {
    transforms.push(`rotate(${transform.rotation}deg)`);
  }

  return transforms.join(' ');
};

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
export const computeClipMetas = (clips: Clip[]): Map<string, ClipMeta> => {
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
      transition?.type === 'crossfade'
        ? Math.min(length, Math.max(0.05, transition.duration || 0.5))
        : 0;

    return {
      length,
      timelineStart,
      effectiveStart: timelineStart, // Will be adjusted for crossfades
      fadeIn: fadeInBase,
      fadeOut: fadeOutBase,
      crossfadeOut,
      crossfadeIn: 0,
      transitionType: transition?.type || 'none',
      transitionDuration: transition?.duration || 0,
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
    indices.sort((a, b) => (clips[a]?.timelinePosition || 0) - (clips[b]?.timelinePosition || 0));

    // Check adjacent clips for crossfade transitions
    for (let i = 1; i < indices.length; i += 1) {
      const prevIndex = indices[i - 1];
      const nextIndex = indices[i];
      if (prevIndex === undefined || nextIndex === undefined) {
        continue;
      }
      const prev = base[prevIndex];
      const next = base[nextIndex];
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
    const clip = clips[index];
    if (!clip || !meta) return;
    metaMap.set(clip.id, {
      length: meta.length,
      timelineStart: meta.timelineStart,
      effectiveStart: Math.max(0, meta.effectiveStart),
      // Use the maximum of fade-in and crossfade-in
      fadeIn: Math.max(meta.fadeIn, meta.crossfadeIn),
      // Use the maximum of fade-out and crossfade-out
      fadeOut: Math.max(meta.fadeOut, meta.crossfadeOut),
      transitionType: meta.transitionType,
      transitionDuration: meta.transitionDuration,
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
export const computeOpacity = (meta: ClipMeta, progress: number) => {
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

// Re-export frame-based timecode formatter from consolidated utilities
export { formatTimecodeFrames as formatTimecode } from '@/lib/utils/timeFormatting';

/**
 * Ensures video has buffered enough data for smooth playback.
 * Waits for readyState >= 3 (HAVE_FUTURE_DATA) instead of just metadata.
 */
export async function ensureBuffered(video: HTMLVideoElement, timeout = 10000): Promise<void> {
  // readyState 3 = HAVE_FUTURE_DATA (enough data to play without immediate stalling)
  if (video.readyState >= 3) {
    return;
  }

  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(
        new Error(`Video buffering timeout after ${timeout}ms (readyState: ${video.readyState})`)
      );
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
