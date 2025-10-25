/**
 * Time Formatting Utilities
 *
 * Consolidated time formatting functions for consistent time display across the application.
 * Extracted from multiple locations to reduce code duplication and ensure consistency.
 */

/**
 * Formats time in seconds to MM:SS.CS format (centiseconds)
 * Used for timeline and clip duration display.
 *
 * @param seconds - Time in seconds
 * @returns Formatted time string (e.g., "1:23.45")
 *
 * @example
 * formatTimeMMSSCS(83.456) // "1:23.45"
 * formatTimeMMSSCS(0.5)    // "0:00.50"
 */
export function formatTimeMMSSCS(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Formats time in seconds to professional timecode format (HH:MM:SS.MS or MM:SS.MS)
 * Used for professional video editing displays.
 *
 * @param seconds - Time in seconds
 * @param showHours - Whether to always show hours (default: auto-detect)
 * @returns Formatted timecode string (e.g., "00:01:23.45" or "1:23.45")
 *
 * @example
 * formatTimecode(83.456)        // "1:23.45"
 * formatTimecode(3683.456)      // "1:01:23.45"
 * formatTimecode(83.456, true)  // "00:01:23.45"
 */
export function formatTimecode(seconds: number, showHours?: boolean): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  // Auto-detect: show hours if time >= 1 hour or explicitly requested
  const includeHours = showHours ?? hours > 0;

  if (includeHours) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Formats time in seconds to MM:SS:FF timecode (frames at 30fps)
 * Used for frame-accurate video playback displays.
 *
 * FF represents frames at 30fps.
 *
 * @param seconds - Time in seconds
 * @returns Formatted timecode string (e.g., "01:23:15")
 *
 * @example
 * formatTimecodeFrames(83.5)  // "01:23:15"
 * formatTimecodeFrames(0)     // "00:00:00"
 */
export function formatTimecodeFrames(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return '00:00:00';
  }
  const safe = Math.max(0, seconds);
  const totalSeconds = Math.floor(safe);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  // Add small epsilon to handle floating point precision issues (e.g., 0.1 * 30 = 2.9999...)
  const frames = Math.floor((safe - totalSeconds) * 30 + 0.0001); // 30fps
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames
    .toString()
    .padStart(2, '0')}`;
}

/**
 * Formats time in seconds to simple seconds display (X.XXs)
 * Used for timeline ruler and simple time displays.
 *
 * @param seconds - Time in seconds
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted time string (e.g., "1.23s")
 *
 * @example
 * formatTimeSeconds(1.234)     // "1.23s"
 * formatTimeSeconds(1.234, 1)  // "1.2s"
 */
export function formatTimeSeconds(seconds: number, decimals = 2): string {
  return `${seconds.toFixed(decimals)}s`;
}

/**
 * Formats seconds into a human-readable duration string
 * Used for progress displays, estimated time remaining, etc.
 *
 * @param seconds - Duration in seconds
 * @param options - Formatting options
 * @param options.approximate - Add "~" prefix for estimates (default: false)
 * @param options.verbose - Use verbose format (e.g., "1 minute" vs "1m") (default: false)
 * @returns Formatted duration string
 *
 * @example
 * formatDuration(45)                         // "45s"
 * formatDuration(45, {approximate: true})    // "~45s"
 * formatDuration(90)                         // "1m 30s"
 * formatDuration(90, {verbose: true})        // "1 minute 30 seconds"
 * formatDuration(3665)                       // "1h 1m"
 * formatDuration(3665, {verbose: true})      // "1 hour 1 minute"
 */
export function formatDuration(
  seconds: number,
  options: { approximate?: boolean; verbose?: boolean } = {}
): string {
  const { approximate = false, verbose = false } = options;
  const prefix = approximate ? '~' : '';

  if (seconds < 60) {
    const rounded = Math.round(seconds);
    if (verbose) {
      return `${prefix}${rounded} ${rounded === 1 ? 'second' : 'seconds'}`;
    }
    return `${prefix}${rounded}s`;
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (verbose) {
      const minLabel = minutes === 1 ? 'minute' : 'minutes';
      const secLabel = secs === 1 ? 'second' : 'seconds';
      return secs > 0
        ? `${prefix}${minutes} ${minLabel} ${secs} ${secLabel}`
        : `${prefix}${minutes} ${minLabel}`;
    }
    // Always show seconds for consistency in non-verbose mode
    return `${prefix}${minutes}m ${secs}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (verbose) {
    const hourLabel = hours === 1 ? 'hour' : 'hours';
    const minLabel = minutes === 1 ? 'minute' : 'minutes';
    return minutes > 0
      ? `${prefix}${hours} ${hourLabel} ${minutes} ${minLabel}`
      : `${prefix}${hours} ${hourLabel}`;
  }
  return minutes > 0 ? `${prefix}${hours}h ${minutes}m` : `${prefix}${hours}h`;
}

/**
 * Alias for formatDuration with approximate option enabled.
 * Used for estimated time remaining displays.
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string with "~" prefix
 *
 * @example
 * formatTimeRemaining(45)   // "~45s"
 * formatTimeRemaining(90)   // "~2m"
 * formatTimeRemaining(3665) // "~1h 2m"
 */
export function formatTimeRemaining(seconds: number): string {
  return formatDuration(seconds, { approximate: true });
}
