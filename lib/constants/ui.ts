/**
 * UI Constants
 *
 * Centralized constants for UI-related magic numbers throughout the application.
 * This improves maintainability and makes the codebase more readable.
 */

// Time constants (milliseconds)
export const TIME_CONSTANTS = {
  ONE_SECOND_MS: 1000,
  ONE_MINUTE_MS: 60000,
  ONE_HOUR_MS: 3600000,
  ONE_DAY_MS: 86400000,
  DEFAULT_DEBOUNCE_MS: 300,
  SEARCH_DEBOUNCE_MS: 500,
  TOOLTIP_DELAY_MS: 200,
  ANIMATION_DURATION_MS: 300,
} as const;

// Timeline constants
export const TIMELINE_CONSTANTS = {
  TRACK_HEIGHT: 80,
  RULER_HEIGHT: 30,
  MIN_TRACKS: 3,
  MAX_TRACKS: 10,
  SNAP_INTERVAL_SECONDS: 0.1,
  SNAP_THRESHOLD_SECONDS: 0.05,
  OVERSCAN_PIXELS: 500,
  DEFAULT_ZOOM: 100, // pixels per second
} as const;

// Spinner/Loading constants
export const SPINNER_CONSTANTS = {
  SPINNER_SIZE_SM: 4, // h-4 w-4
  SPINNER_SIZE_MD: 6, // h-6 w-6
  SPINNER_SIZE_LG: 8, // h-8 w-8
  SPINNER_BORDER_WIDTH: 2,
  SPINNER_BORDER_WIDTH_THICK: 4,
} as const;

// Fade animation constants
export const FADE_CONSTANTS = {
  FADE_IN_DURATION_SECONDS: 0.3,
  FADE_OUT_DURATION_SECONDS: 0.3,
} as const;

// Icon size constants (tailwind classes)
export const ICON_SIZES = {
  ICON_SIZE_XS: 3, // h-3 w-3
  ICON_SIZE_SM: 4, // h-4 w-4
  ICON_SIZE_MD: 5, // h-5 w-5
  ICON_SIZE_LG: 6, // h-6 w-6
  ICON_SIZE_XL: 8, // h-8 w-8
} as const;

// Z-index constants
export const Z_INDEX = {
  VIDEO_BASE: 1000,
  OVERLAY: 10,
  OVERLAY_TEXT: 20,
  MENU: 20,
  MODAL: 1000,
  PLAYER_CONTROLS: 1050,
  TOOLTIP: 1100,
} as const;

// Video player constants
export const PLAYER_CONSTANTS = {
  SIGNED_URL_BUFFER_MS: 300000, // 5 minutes buffer before expiry
  RAF_SYNC_TOLERANCE_MS: 50,
  VIDEO_LOAD_TIMEOUT_MS: 10000,
} as const;

// Pagination constants
export const PAGINATION_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  HISTORY_LIMIT: 100,
} as const;

// File size constants
export const FILE_SIZE_CONSTANTS = {
  BYTES_PER_KB: 1024,
  BYTES_PER_MB: 1048576, // 1024 * 1024
  BYTES_PER_GB: 1073741824, // 1024 * 1024 * 1024
  MAX_UPLOAD_SIZE_MB: 100,
} as const;

// Text overlay constants
export const TEXT_OVERLAY_CONSTANTS = {
  DEFAULT_HEIGHT: 40,
  TOP_OFFSET: 8,
  OPACITY_DEFAULT: 1.0,
  OPACITY_TRANSPARENT: 0.15,
} as const;

// Activity history time ranges
export const ACTIVITY_TIME_RANGES = {
  ONE_MINUTE_MS: TIME_CONSTANTS.ONE_MINUTE_MS,
  ONE_HOUR_MS: TIME_CONSTANTS.ONE_HOUR_MS,
  ONE_DAY_MS: TIME_CONSTANTS.ONE_DAY_MS,
  ONE_WEEK_MS: 7 * TIME_CONSTANTS.ONE_DAY_MS,
} as const;

// Waveform rendering constants
export const WAVEFORM_CONSTANTS = {
  MAX_HEIGHT: 0.8, // 80% of canvas height
  MIN_SAMPLES: 100,
  BAR_WIDTH: 2,
  BAR_GAP: 1,
} as const;
