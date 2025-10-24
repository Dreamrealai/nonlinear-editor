/**
 * Editor Constants
 *
 * Centralized constants for editor-related functionality including:
 * - Undo/redo history management
 * - Clip duration validation
 * - Timeline state management
 */

// History constants
export const EDITOR_CONSTANTS = {
  /** Maximum number of undo/redo states to keep in history */
  MAX_HISTORY: 50,
  /** Debounce delay for history saves in milliseconds */
  HISTORY_DEBOUNCE_MS: 300,
} as const;

// Clip constants
export const CLIP_CONSTANTS = {
  /** Minimum duration for a clip in seconds (prevents zero-length clips) */
  MIN_CLIP_DURATION: 0.1,
  /** Default duration for new clips in seconds */
  DEFAULT_CLIP_DURATION: 5,
} as const;

// Zoom constants (pixels per second)
export const ZOOM_CONSTANTS = {
  /** Minimum zoom level in pixels per second */
  MIN_ZOOM: 10,
  /** Maximum zoom level in pixels per second */
  MAX_ZOOM: 200,
  /** Default zoom level in pixels per second */
  DEFAULT_ZOOM: 50,
} as const;
