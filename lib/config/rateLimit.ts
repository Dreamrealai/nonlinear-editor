/**
 * Rate Limit Configuration
 * Centralized rate limit settings per tier and endpoint
 */

/**
 * Rate Limit Tiers
 *
 * TIER 1 - Authentication/Payment (5/min):
 *   Critical security operations that could be abused for account takeover,
 *   payment fraud, or privilege escalation
 *   Routes: /api/stripe/*, /api/user/delete-account, /api/admin/*
 *
 * TIER 2 - Resource Creation (10/min):
 *   Expensive operations that create billable resources or consume significant
 *   compute/storage. Prevents resource exhaustion attacks
 *   Routes: /api/projects (POST), /api/assets/upload, /api/video/generate, /api/audio/*, /api/image/generate
 *
 * TIER 3 - Status/Read Operations (30/min):
 *   Read-only or polling operations that query external services or databases
 *   Routes: /api/video/status, /api/projects (GET), /api/assets (GET), /api/history (GET)
 *
 * TIER 4 - General Operations (60/min):
 *   Standard API operations with moderate resource usage
 *   Routes: Other authenticated routes
 */

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Tiered Rate Limits
 */
export const RATE_LIMIT_TIERS = {
  // TIER 1: 5 requests per minute - for authentication, payment, and admin operations
  TIER_1_AUTH_PAYMENT: {
    max: 5,
    windowMs: 60 * 1000,
  } as RateLimitConfig,

  // TIER 2: 10 requests per minute - for expensive resource creation operations
  TIER_2_RESOURCE_CREATION: {
    max: 10,
    windowMs: 60 * 1000,
  } as RateLimitConfig,

  // TIER 3: 100 requests per minute - for status checks and read operations
  // Increased from 30 to support loading timelines with many assets
  TIER_3_STATUS_READ: {
    max: 100,
    windowMs: 60 * 1000,
  } as RateLimitConfig,

  // TIER 4: 200 requests per minute - for general API operations
  // Increased from 60 to support real-time chat and frequent updates
  TIER_4_GENERAL: {
    max: 200,
    windowMs: 60 * 1000,
  } as RateLimitConfig,

  // TIER 5: 500 requests per minute - for high-frequency operations like asset signing
  // New tier for authenticated users performing asset-heavy operations
  TIER_5_HIGH_FREQUENCY: {
    max: 500,
    windowMs: 60 * 1000,
  } as RateLimitConfig,
} as const;

/**
 * Endpoint-Specific Rate Limits
 *
 * Maps specific operation types to rate limit configurations
 */
export const ENDPOINT_RATE_LIMITS = {
  // Video Generation
  VIDEO_GENERATION: RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION,
  VIDEO_STATUS: RATE_LIMIT_TIERS.TIER_3_STATUS_READ,
  VIDEO_UPSCALE: RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION,

  // Image Generation
  IMAGE_GENERATION: RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION,

  // Audio Generation
  AUDIO_TTS: RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION,
  AUDIO_MUSIC: RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION,
  AUDIO_SFX: RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION,

  // Asset Operations (High frequency - users may load timelines with 100+ assets)
  ASSET_SIGN: RATE_LIMIT_TIERS.TIER_5_HIGH_FREQUENCY,
  ASSET_UPLOAD: RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION,
  ASSET_LIST: RATE_LIMIT_TIERS.TIER_3_STATUS_READ,

  // Project Operations
  PROJECT_CREATE: RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION,
  PROJECT_LIST: RATE_LIMIT_TIERS.TIER_3_STATUS_READ,
  PROJECT_UPDATE: RATE_LIMIT_TIERS.TIER_4_GENERAL,
  PROJECT_CHAT: RATE_LIMIT_TIERS.TIER_4_GENERAL, // Chat needs higher limits for real-time updates

  // Authentication & Payment
  STRIPE_CHECKOUT: RATE_LIMIT_TIERS.TIER_1_AUTH_PAYMENT,
  STRIPE_PORTAL: RATE_LIMIT_TIERS.TIER_1_AUTH_PAYMENT,
  USER_DELETE: RATE_LIMIT_TIERS.TIER_1_AUTH_PAYMENT,
  ADMIN_OPERATIONS: RATE_LIMIT_TIERS.TIER_1_AUTH_PAYMENT,

  // History & Logs
  HISTORY: RATE_LIMIT_TIERS.TIER_3_STATUS_READ,
  LOGS: RATE_LIMIT_TIERS.TIER_3_STATUS_READ,
} as const;

/**
 * Rate Limit Identifiers
 *
 * Used to create unique rate limit keys per user/operation
 */
export const RATE_LIMIT_KEYS = {
  VIDEO_GEN: 'video-gen',
  IMAGE_GEN: 'image-gen',
  AUDIO_TTS: 'audio-tts',
  AUDIO_MUSIC: 'audio-music',
  AUDIO_SFX: 'audio-sfx',
  ASSET_UPLOAD: 'asset-upload',
  PROJECT_CREATE: 'project-create',
  STRIPE: 'stripe',
  USER_DELETE: 'user-delete',
  ADMIN: 'admin',
} as const;

/**
 * Helper function to create a rate limit identifier
 */
export function createRateLimitKey(operation: string, userId: string): string {
  return `${operation}:${userId}`;
}

/**
 * Legacy Rate Limit Presets (for backward compatibility)
 * @deprecated Use RATE_LIMIT_TIERS instead
 */
export const LEGACY_RATE_LIMITS = {
  strict: RATE_LIMIT_TIERS.TIER_1_AUTH_PAYMENT,
  expensive: RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION,
  moderate: RATE_LIMIT_TIERS.TIER_3_STATUS_READ,
  relaxed: RATE_LIMIT_TIERS.TIER_4_GENERAL,
} as const;

/**
 * Rate Limit Response Headers
 */
export const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After',
} as const;

/**
 * Rate Limit Error Messages
 */
export const RATE_LIMIT_MESSAGES = {
  EXCEEDED: 'Rate limit exceeded. Please try again later.',
  TIER_1: 'Too many authentication/payment requests. Please wait before trying again.',
  TIER_2: 'Too many resource creation requests. Please wait before generating more content.',
  TIER_3: 'Too many status check requests. Please reduce polling frequency.',
  TIER_4: 'Too many requests. Please slow down.',
} as const;
