/**
 * Centralized Configuration
 * Single entry point for all application configuration
 */

// Model Configuration
export * from './models';

// API Configuration
export * from './api';

// Rate Limit Configuration
export * from './rateLimit';

/**
 * Application Configuration
 */
export const APP_CONFIG = {
  // Application Name
  APP_NAME: 'Non-Linear Video Editor',

  // Version
  VERSION: '1.0.0',

  // Environment
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',

  // Feature Flags (can be expanded)
  FEATURES: {
    VIDEO_GENERATION: true,
    IMAGE_GENERATION: true,
    AUDIO_GENERATION: true,
    UPSCALING: true,
    SCENE_DETECTION: true,
  },
} as const;

/**
 * Storage Configuration
 */
export const STORAGE_CONFIG = {
  // Supabase Storage Buckets
  BUCKETS: {
    ASSETS: 'assets',
    PROJECTS: 'projects',
  },

  // Storage Path Templates
  PATHS: {
    USER_ASSET: (userId: string, projectId: string, type: string, filename: string) =>
      `${userId}/${projectId}/${type}/${filename}`,

    PROJECT_DATA: (userId: string, projectId: string) => `${userId}/${projectId}/data`,
  },

  // URL Prefixes
  SUPABASE_PREFIX: 'supabase://',
} as const;

/**
 * Default Generation Settings
 */
export const DEFAULT_GENERATION_SETTINGS = {
  VIDEO: {
    ASPECT_RATIO: '16:9' as const,
    DURATION: 8,
    RESOLUTION: '1080p' as const,
    ENHANCE_PROMPT: true,
    GENERATE_AUDIO: true,
    SAMPLE_COUNT: 1,
  },

  IMAGE: {
    ASPECT_RATIO: '1:1' as const,
    SAMPLE_COUNT: 1,
    ADD_WATERMARK: false,
  },

  AUDIO: {
    STABILITY: 0.5,
    SIMILARITY: 0.75,
  },
} as const;

/**
 * Polling Configuration
 */
export const POLLING_CONFIG = {
  // Polling intervals in milliseconds
  INTERVALS: {
    VIDEO_STATUS: 10000, // 10 seconds
    AUDIO_STATUS: 5000, // 5 seconds
    IMAGE_STATUS: 3000, // 3 seconds
  },

  // Maximum polling attempts
  MAX_ATTEMPTS: {
    VIDEO: 180, // 30 minutes at 10s intervals
    AUDIO: 240, // 20 minutes at 5s intervals
    IMAGE: 100, // 5 minutes at 3s intervals
  },

  // Timeout for giving up (in milliseconds)
  TIMEOUTS: {
    VIDEO: 30 * 60 * 1000, // 30 minutes
    AUDIO: 20 * 60 * 1000, // 20 minutes
    IMAGE: 5 * 60 * 1000, // 5 minutes
  },
} as const;

/**
 * Numeric Limits Configuration
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
 * Export all configuration as a single object for easy access
 */
export const CONFIG = {
  APP: APP_CONFIG,
  STORAGE: STORAGE_CONFIG,
  DEFAULT_SETTINGS: DEFAULT_GENERATION_SETTINGS,
  POLLING: POLLING_CONFIG,
  NUMERIC_LIMITS,
} as const;
