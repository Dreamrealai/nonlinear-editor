/**
 * API Configuration
 * Centralized configuration for API endpoints, timeouts, and retry logic
 */

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Google Cloud / Vertex AI
  GOOGLE_VERTEX_AI: 'https://us-central1-aiplatform.googleapis.com/v1',

  // FAL.ai
  FAL_QUEUE: 'https://queue.fal.run',

  // ElevenLabs
  ELEVENLABS_TTS: 'https://api.elevenlabs.io/v1/text-to-speech',
  ELEVENLABS_VOICES: 'https://api.elevenlabs.io/v1/voices',

  // Suno (via Comet API)
  SUNO_SUBMIT: 'https://api.cometapi.com/suno/submit/music',
  SUNO_QUERY: 'https://api.cometapi.com/suno/query',

  // Google Cloud Scopes
  GOOGLE_CLOUD_PLATFORM_SCOPE: 'https://www.googleapis.com/auth/cloud-platform',
} as const;

/**
 * FAL.ai Endpoint Mapping
 */
export const FAL_ENDPOINTS = {
  SEEDANCE_TEXT_TO_VIDEO: 'fal-ai/bytedance/seedance/v1/pro/text-to-video',
  SEEDANCE_IMAGE_TO_VIDEO: 'fal-ai/bytedance/seedance/v1/pro/image-to-video',
  MINIMAX_TEXT_TO_VIDEO: 'fal-ai/minimax/hailuo-02/pro/text-to-video',
  MINIMAX_IMAGE_TO_VIDEO: 'fal-ai/minimax/hailuo-02/pro/image-to-video',
} as const;

/**
 * Timeout Configuration (in milliseconds)
 */
export const TIMEOUTS = {
  // API Request Timeouts
  DEFAULT: 60000, // 60 seconds - default for most operations
  SHORT: 30000, // 30 seconds - for status checks
  LONG: 120000, // 2 minutes - for long-running operations

  // Specific Operation Timeouts
  VIDEO_GENERATION_REQUEST: 60000, // 60s - Initiating video generation
  VIDEO_STATUS_CHECK: 30000, // 30s - Checking video status
  IMAGE_GENERATION: 60000, // 60s - Image generation
  AUDIO_GENERATION: 60000, // 60s - Audio generation (TTS/Music)
  AUDIO_STATUS_CHECK: 30000, // 30s - Checking audio status

  // FAL.ai Specific
  FAL_SUBMIT: 60000, // 60s - Submit request to FAL
  FAL_STATUS: 30000, // 30s - Check FAL status
  FAL_RESULT: 30000, // 30s - Fetch FAL result

  // ElevenLabs
  ELEVENLABS_TTS: 60000, // 60s - TTS generation
  ELEVENLABS_VOICES: 30000, // 30s - Fetch voices list

  // Suno
  SUNO_SUBMIT: 60000, // 60s - Submit music generation
  SUNO_STATUS: 30000, // 30s - Check music status

  // Google Veo/Imagen
  VEO_SUBMIT: 60000, // 60s - Submit video generation
  VEO_STATUS: 60000, // 60s - Check video status (can be long)
  IMAGEN_GENERATE: 60000, // 60s - Generate image

  // Cleanup Intervals
  RATE_LIMIT_CLEANUP: 5 * 60 * 1000, // 5 minutes - cleanup expired rate limits
  AUTOSAVE_INTERVAL: 2000, // 2 seconds - autosave interval
} as const;

/**
 * Retry Configuration
 */
export const RETRY_CONFIG = {
  // Maximum number of retries
  MAX_RETRIES: 3,

  // Base delay for exponential backoff (in milliseconds)
  BASE_DELAY: 1000, // 1 second

  // Maximum delay between retries (in milliseconds)
  MAX_DELAY: 10000, // 10 seconds

  // Jitter factor (0-1) to add randomness to retry delays
  JITTER_FACTOR: 0.1,
} as const;

/**
 * HTTP Status Codes that should trigger a retry
 */
export const RETRYABLE_STATUS_CODES = [
  408, // Request Timeout
  429, // Too Many Requests (Rate Limited)
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
] as const;

/**
 * Default Voice IDs for ElevenLabs
 */
export const DEFAULT_VOICE_IDS = {
  SARAH: 'EXAVITQu4vr4xnSDxMaL',
  ADAM: '21m00Tcm4TlvDq8ikWAM',
  RACHEL: '2EiwWnXFnvU5JabPnv8n',
} as const;

/**
 * Voice Settings Defaults
 */
export const VOICE_SETTINGS = {
  DEFAULT_STABILITY: 0.5,
  DEFAULT_SIMILARITY: 0.75,
  MIN_STABILITY: 0,
  MAX_STABILITY: 1,
  MIN_SIMILARITY: 0,
  MAX_SIMILARITY: 1,
} as const;

/**
 * Helper function to calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(attempt: number): number {
  const delay = Math.min(RETRY_CONFIG.BASE_DELAY * Math.pow(2, attempt), RETRY_CONFIG.MAX_DELAY);

  // Add jitter
  const jitter = delay * RETRY_CONFIG.JITTER_FACTOR * Math.random();
  return delay + jitter;
}

/**
 * Helper function to check if a status code should be retried
 */
export function shouldRetryStatusCode(statusCode: number): boolean {
  return (RETRYABLE_STATUS_CODES as readonly number[]).includes(statusCode);
}
