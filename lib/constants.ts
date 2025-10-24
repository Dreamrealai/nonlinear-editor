/**
 * Application Constants
 *
 * Centralized configuration values used across the application.
 */

/** Thumbnail generation constants */
export const THUMBNAIL_CONSTANTS = {
  /** Maximum width for generated thumbnails in pixels */
  THUMBNAIL_WIDTH: 320,
  /** Quality of thumbnail JPEG encoding (0-1) */
  THUMBNAIL_QUALITY: 0.8,
} as const;

/** Clip-related constants */
export const CLIP_CONSTANTS = {
  /** Minimum duration for a clip in seconds */
  MIN_CLIP_DURATION: 0.1,
} as const;

/** Asset pagination constants */
export const ASSET_PAGINATION_CONSTANTS = {
  /** Default number of assets to show per page */
  DEFAULT_PAGE_SIZE: 50,
} as const;

/** Editor state constants */
export const EDITOR_CONSTANTS = {
  /** Maximum history entries for undo/redo */
  MAX_HISTORY: 50,
  /** Debounce delay for history saves in milliseconds */
  HISTORY_DEBOUNCE_MS: 300,
} as const;

/** Zoom constants for timeline */
export const ZOOM_CONSTANTS = {
  /** Minimum zoom level */
  MIN_ZOOM: 10,
  /** Maximum zoom level */
  MAX_ZOOM: 200,
  /** Default zoom level */
  DEFAULT_ZOOM: 50,
} as const;

/** Performance constants for rendering and playback */
export const PERFORMANCE_CONSTANTS = {
  /** Target frame time for 60fps rendering (16.67ms rounded to 16ms) */
  FRAME_TIME_60FPS: 16,
  /** Target frame time for 30fps rendering */
  FRAME_TIME_30FPS: 33,
  /** Target frames per second for high-end devices */
  TARGET_FPS_HIGH: 60,
  /** Target frames per second for low-end devices */
  TARGET_FPS_LOW: 30,
} as const;
