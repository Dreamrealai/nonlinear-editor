import type { Clip } from '@/types/timeline';
import { safeArrayLast } from '@/lib/utils/arrayUtils';

// Re-export time formatting utilities for backward compatibility
export { formatTime, formatTimecode } from '@/lib/utils/timeFormatting';

/**
 * Extracts the filename from a clip's file path
 * Handles both supabase:// protocol and standard paths
 * @param clip - The clip to extract filename from
 * @returns The filename or 'Clip' as fallback
 */
export function getClipFileName(clip: Clip): string {
  const path = clip.filePath ?? '';
  const normalized = path.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const segments = normalized.split('/');
  const leaf = safeArrayLast(segments);
  return leaf && leaf.length > 0 ? leaf : 'Clip';
}

/**
 * Snaps a value to the nearest grid interval
 * @param value - Value to snap
 * @param snapInterval - Grid interval to snap to
 * @returns Snapped value
 */
export function snapToGrid(value: number, snapInterval: number): number {
  return Math.round(value / snapInterval) * snapInterval;
}

/**
 * Checks if a value is within threshold of a candidate value
 * @param value - Value to check
 * @param candidate - Candidate value to snap to
 * @param threshold - Maximum distance for snapping
 * @returns True if within threshold
 */
export function isWithinSnapThreshold(
  value: number,
  candidate: number,
  threshold: number
): boolean {
  return Math.abs(candidate - value) <= threshold;
}

/**
 * Computes a safe position for a clip on the timeline, avoiding overlaps
 * @param clipId - ID of the clip being positioned
 * @param desiredPosition - Desired timeline position
 * @param clips - All clips in the timeline
 * @param snapInterval - Snap interval for grid alignment
 * @param snapThreshold - Threshold for snap detection
 * @param targetTrackIndex - Optional target track index
 * @returns Safe position that avoids overlaps
 */
export function computeSafeClipPosition(
  clipId: string,
  desiredPosition: number,
  clips: Clip[],
  snapInterval: number,
  snapThreshold: number,
  targetTrackIndex?: number
): number {
  const basePosition = Math.max(0, desiredPosition);
  const movingClip = clips.find((clip): boolean => clip.id === clipId);

  if (!movingClip) {
    return Math.max(0, snapToGrid(basePosition, snapInterval));
  }

  const duration = Math.max(snapInterval, movingClip.end - movingClip.start);
  let position = Math.max(0, snapToGrid(basePosition, snapInterval));

  const trackIndex =
    typeof targetTrackIndex === 'number' ? targetTrackIndex : movingClip.trackIndex;
  const trackClips = clips
    .filter((clip): boolean => clip.trackIndex === trackIndex && clip.id !== clipId)
    .sort((a, b): number => a.timelinePosition - b.timelinePosition);

  const previous = trackClips.filter((clip): boolean => clip.timelinePosition < position).pop();
  const next = trackClips.find((clip): boolean => clip.timelinePosition > position);

  let minStart = 0;
  if (previous) {
    const prevDuration = Math.max(snapInterval, previous.end - previous.start);
    minStart = previous.timelinePosition + prevDuration;
  }

  let maxStart = Number.POSITIVE_INFINITY;
  if (next) {
    maxStart = next.timelinePosition - duration;
    if (maxStart < minStart) {
      maxStart = minStart;
    }
  }

  position = Math.max(minStart, Math.min(position, maxStart));

  const gridCandidate = snapToGrid(position, snapInterval);
  if (gridCandidate >= minStart - snapThreshold && gridCandidate <= maxStart + snapThreshold) {
    position = gridCandidate;
  }

  const snapCandidates: number[] = [0, minStart];
  if (maxStart !== Number.POSITIVE_INFINITY) {
    snapCandidates.push(maxStart);
  }
  trackClips.forEach((clip): void => {
    snapCandidates.push(clip.timelinePosition);
    snapCandidates.push(clip.timelinePosition + Math.max(snapInterval, clip.end - clip.start));
  });

  for (const candidate of snapCandidates) {
    if (!Number.isFinite(candidate)) continue;
    if (isWithinSnapThreshold(position, candidate, snapThreshold)) {
      position = candidate;
      break;
    }
  }

  return Math.max(0, position);
}

/**
 * Calculates the total duration of a timeline based on clips and overlays
 * @param clips - Array of clips
 * @param textOverlays - Array of text overlays
 * @param minimumDuration - Minimum duration to return (default: 30)
 * @returns Timeline duration in seconds
 */
export function calculateTimelineDuration(
  clips: Clip[],
  textOverlays: Array<{ timelinePosition: number; duration: number }>,
  minimumDuration = 30
): number {
  const clipEndTimes = clips.length ? clips.map((c): number => c.timelinePosition + (c.end - c.start)) : [];
  const overlayEndTimes = textOverlays.length
    ? textOverlays.map((o): number => o.timelinePosition + o.duration)
    : [];
  const allEndTimes = [...clipEndTimes, ...overlayEndTimes];
  return allEndTimes.length ? Math.max(...allEndTimes, minimumDuration) : minimumDuration;
}

/**
 * Finds the clip at a given time position
 * @param clips - Array of clips to search
 * @param time - Time position to check
 * @returns Clip at that position, or undefined
 */
export function findClipAtTime(clips: Clip[], time: number): Clip | undefined {
  return clips.find((clip): boolean => {
    const clipStart = clip.timelinePosition;
    const clipEnd = clipStart + (clip.end - clip.start);
    return time > clipStart && time < clipEnd;
  });
}
