/**
 * Validation Configuration
 * Centralized validation constants for user inputs and API parameters
 */

/**
 * String Length Limits
 */
export const STRING_LIMITS = {
  // Prompts
  PROMPT_MIN_LENGTH: 3,
  PROMPT_MAX_LENGTH: 1000,

  // Negative Prompts
  NEGATIVE_PROMPT_MAX_LENGTH: 1000,

  // Audio Text
  AUDIO_TEXT_MIN_LENGTH: 1,
  AUDIO_TEXT_MAX_LENGTH: 5000,

  // Music Style/Tags
  MUSIC_STYLE_MIN_LENGTH: 2,
  MUSIC_STYLE_MAX_LENGTH: 200,

  // Music Title
  MUSIC_TITLE_MAX_LENGTH: 100,

  // Voice ID (alphanumeric)
  VOICE_ID_MIN_LENGTH: 1,
  VOICE_ID_MAX_LENGTH: 100,

  // Project Name
  PROJECT_NAME_MIN_LENGTH: 1,
  PROJECT_NAME_MAX_LENGTH: 100,

  // Asset Filename
  FILENAME_MAX_LENGTH: 255,
} as const;

/**
 * Numeric Limits
 */
export const NUMERIC_LIMITS = {
  // Random Seed
  SEED_MIN: 0,
  SEED_MAX: 4294967295, // 2^32 - 1

  // Sample Count
  SAMPLE_COUNT_MIN: 1,
  SAMPLE_COUNT_MAX_VIDEO: 4,
  SAMPLE_COUNT_MAX_IMAGE: 8,
  SAMPLE_COUNT_MAX_AUDIO: 1,

  // Voice Settings (0-1 range)
  VOICE_STABILITY_MIN: 0,
  VOICE_STABILITY_MAX: 1,
  VOICE_SIMILARITY_MIN: 0,
  VOICE_SIMILARITY_MAX: 1,

  // Queue Limits
  VIDEO_QUEUE_MAX: 8,
  AUDIO_QUEUE_MAX: 8,
  IMAGE_QUEUE_MAX: 8,
} as const;

/**
 * Supported Aspect Ratios
 */
export const ASPECT_RATIOS = {
  VIDEO: ['16:9', '9:16', '1:1'] as const,
  IMAGE: ['1:1', '9:16', '16:9', '3:4', '4:3'] as const,
} as const;

export type VideoAspectRatio = typeof ASPECT_RATIOS.VIDEO[number];
export type ImageAspectRatio = typeof ASPECT_RATIOS.IMAGE[number];

/**
 * Supported Durations (in seconds)
 */
export const DURATIONS = {
  VIDEO: [4, 5, 6, 8, 10] as const,
} as const;

export type VideoDuration = typeof DURATIONS.VIDEO[number];

/**
 * Supported Resolutions
 */
export const RESOLUTIONS = {
  VIDEO: ['720p', '1080p'] as const,
  IMAGE: ['1024x1024', '1024x1792', '1792x1024'] as const,
} as const;

export type VideoResolution = typeof RESOLUTIONS.VIDEO[number];
export type ImageResolution = typeof RESOLUTIONS.IMAGE[number];

/**
 * Person Generation Settings
 */
export const PERSON_GENERATION = {
  ALLOW_ADULT: 'allow_adult',
  DONT_ALLOW: 'dont_allow',
} as const;

export type PersonGeneration = typeof PERSON_GENERATION[keyof typeof PERSON_GENERATION];

/**
 * Safety Filter Levels (for Imagen)
 */
export const SAFETY_FILTER_LEVELS = {
  BLOCK_MOST: 'block_most',
  BLOCK_SOME: 'block_some',
  BLOCK_FEW: 'block_few',
  BLOCK_FEWEST: 'block_fewest',
} as const;

export type SafetyFilterLevel = typeof SAFETY_FILTER_LEVELS[keyof typeof SAFETY_FILTER_LEVELS];

/**
 * Compression Quality
 */
export const COMPRESSION_QUALITY = {
  OPTIMIZED: 'optimized',
  LOSSLESS: 'lossless',
} as const;

export type CompressionQuality = typeof COMPRESSION_QUALITY[keyof typeof COMPRESSION_QUALITY];

/**
 * MIME Types
 */
export const MIME_TYPES = {
  // Video
  VIDEO_MP4: 'video/mp4',
  VIDEO_WEBM: 'video/webm',

  // Audio
  AUDIO_MP3: 'audio/mpeg',
  AUDIO_WAV: 'audio/wav',
  AUDIO_OGG: 'audio/ogg',

  // Image
  IMAGE_PNG: 'image/png',
  IMAGE_JPEG: 'image/jpeg',
  IMAGE_WEBP: 'image/webp',

  // Application
  APPLICATION_JSON: 'application/json',
} as const;

/**
 * File Size Limits (in bytes)
 */
export const FILE_SIZE_LIMITS = {
  // Upload limits
  MAX_IMAGE_UPLOAD: 10 * 1024 * 1024, // 10 MB
  MAX_VIDEO_UPLOAD: 100 * 1024 * 1024, // 100 MB
  MAX_AUDIO_UPLOAD: 25 * 1024 * 1024, // 25 MB

  // Generated asset limits
  MAX_GENERATED_VIDEO: 500 * 1024 * 1024, // 500 MB
  MAX_GENERATED_AUDIO: 50 * 1024 * 1024, // 50 MB
  MAX_GENERATED_IMAGE: 20 * 1024 * 1024, // 20 MB
} as const;

/**
 * Regex Patterns
 */
export const PATTERNS = {
  // UUID v4 pattern
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // Alphanumeric with underscore and dash
  ALPHANUMERIC: /^[a-zA-Z0-9_-]+$/,

  // Voice ID format
  VOICE_ID: /^[a-zA-Z0-9_-]{1,100}$/,

  // Email
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

/**
 * Validation helper functions
 */
export function isValidUUID(value: string): boolean {
  return PATTERNS.UUID.test(value);
}

export function isValidVoiceId(value: string): boolean {
  return PATTERNS.VOICE_ID.test(value);
}

export function isValidEmail(value: string): boolean {
  return PATTERNS.EMAIL.test(value);
}

export function isValidAspectRatio(value: string, type: 'video' | 'image'): boolean {
  const validRatios = type === 'video' ? ASPECT_RATIOS.VIDEO : ASPECT_RATIOS.IMAGE;
  return (validRatios as readonly string[]).includes(value);
}

export function isValidDuration(value: number): boolean {
  return (DURATIONS.VIDEO as readonly number[]).includes(value);
}

export function isValidResolution(value: string, type: 'video' | 'image'): boolean {
  const validResolutions = type === 'video' ? RESOLUTIONS.VIDEO : RESOLUTIONS.IMAGE;
  return (validResolutions as readonly string[]).includes(value);
}

export function isValidSeed(value: number): boolean {
  return value >= NUMERIC_LIMITS.SEED_MIN && value <= NUMERIC_LIMITS.SEED_MAX;
}

export function isValidSampleCount(value: number, type: 'video' | 'image' | 'audio'): boolean {
  const max = type === 'video'
    ? NUMERIC_LIMITS.SAMPLE_COUNT_MAX_VIDEO
    : type === 'image'
    ? NUMERIC_LIMITS.SAMPLE_COUNT_MAX_IMAGE
    : NUMERIC_LIMITS.SAMPLE_COUNT_MAX_AUDIO;

  return value >= NUMERIC_LIMITS.SAMPLE_COUNT_MIN && value <= max;
}
