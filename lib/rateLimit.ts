/**
 * Supabase PostgreSQL-backed distributed rate limiter
 * Replaces in-memory storage with database-backed persistence
 * Supports multiple server instances and horizontal scaling
 *
 * Rate Limit Endpoints Mapping:
 * - video-gen:userId - Video generation (expensive: 100/min)
 * - image-gen:userId - Image generation (expensive: 100/min)
 * - audio-tts:userId - Audio TTS generation (expensive: 100/min)
 * - audio-music:userId - Music generation (expensive: 100/min)
 * - audio-sfx:userId - Sound effects generation (expensive: 100/min)
 */

import { serverLogger } from '@/lib/serverLogger';
import { safeArrayFirst } from '@/lib/utils/arrayUtils';
import { createServiceSupabaseClient, isSupabaseServiceConfigured } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Fallback in-memory store for when Supabase is unavailable
const fallbackStore = new Map<string, RateLimitEntry>();

// Cleanup interval tracking (only starts when fallback is used)
let cleanupInterval: NodeJS.Timeout | null = null;
let fallbackInUse = false;

/**
 * Starts cleanup interval only when fallback is actually used.
 * Prevents memory leak from unnecessary interval when Supabase is available.
 */
function startCleanupIfNeeded(): void {
  if (!fallbackInUse) {
    fallbackInUse = true;
  }

  // Only start interval if not already running
  if (!cleanupInterval) {
    cleanupInterval = setInterval(
      () => {
        const now = Date.now();
        for (const [key, value] of fallbackStore.entries()) {
          if (value.resetAt < now) {
            fallbackStore.delete(key);
          }
        }
      },
      5 * 60 * 1000
    ); // Clean up expired entries every 5 minutes
  }
}

/**
 * Stops cleanup interval and clears fallback store.
 * Call this during shutdown to prevent memory leaks.
 */
export function cleanupRateLimit(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  fallbackStore.clear();
  fallbackInUse = false;
}

// Automatic cleanup on process termination (for serverless/edge environments)
if (typeof process !== 'undefined' && process.on) {
  // Clean up on graceful shutdown
  process.on('beforeExit', cleanupRateLimit);
  process.on('SIGTERM', cleanupRateLimit);
  process.on('SIGINT', cleanupRateLimit);

  // Clean up on HMR (Hot Module Replacement) during development
  // Type assertion for module.hot which is injected by webpack/vite in development
  if (process.env.NODE_ENV === 'development' && typeof module !== 'undefined') {
    const hotModule = module as typeof module & {
      hot?: {
        dispose: (callback: () => void) => void;
      };
    };
    if (hotModule.hot) {
      hotModule.hot.dispose(cleanupRateLimit);
    }
  }
}

// Initialize Supabase client with service role key for rate limiting
// Service role is required because rate_limits table has RLS enabled
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseClient) {
    let serviceConfigured = false;

    if (typeof isSupabaseServiceConfigured === 'function') {
      try {
        serviceConfigured = isSupabaseServiceConfigured();
      } catch (error) {
        serverLogger.warn(
          {
            event: 'rateLimit.supabase_check_failed',
            error,
          },
          'Failed to determine Supabase service configuration, using in-memory rate limiting fallback'
        );
        serviceConfigured = false;
      }
    } else {
      serverLogger.warn(
        {
          event: 'rateLimit.supabase_helper_missing',
          helper: 'isSupabaseServiceConfigured',
        },
        'Supabase service configuration helper missing, using in-memory rate limiting fallback'
      );
    }

    if (!serviceConfigured) {
      serverLogger.warn(
        {
          event: 'rateLimit.supabase_unavailable',
        },
        'Supabase service role not configured, using in-memory rate limiting fallback'
      );
      return null;
    }

    if (typeof createServiceSupabaseClient !== 'function') {
      serverLogger.warn(
        {
          event: 'rateLimit.supabase_helper_missing',
          helper: 'createServiceSupabaseClient',
        },
        'Supabase service client factory missing, using in-memory rate limiting fallback'
      );
      return null;
    }

    try {
      supabaseClient = createServiceSupabaseClient();
    } catch (error) {
      serverLogger.warn(
        {
          event: 'rateLimit.supabase_init_failed',
          error,
        },
        'Failed to initialize Supabase client, using in-memory rate limiting fallback'
      );
      return null;
    }
  }

  return supabaseClient;
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Fallback in-memory rate limit check
 */
function checkRateLimitMemory(identifier: string, config: RateLimitConfig): RateLimitResult {
  // Start cleanup interval when fallback is first used
  startCleanupIfNeeded();

  const now = Date.now();
  const entry = fallbackStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    // First request or window expired
    const resetAt = now + config.windowMs;
    fallbackStore.set(identifier, { count: 1, resetAt });

    return {
      success: true,
      limit: config.max,
      remaining: config.max - 1,
      resetAt,
    };
  }

  if (entry.count >= config.max) {
    // Rate limit exceeded
    return {
      success: false,
      limit: config.max,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  return {
    success: true,
    limit: config.max,
    remaining: config.max - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Check if request is rate limited using Supabase PostgreSQL
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const client = getSupabaseClient();

  // Fallback to in-memory if Supabase is unavailable
  if (!client) {
    return checkRateLimitMemory(identifier, config);
  }

  try {
    const windowSeconds = Math.floor(config.windowMs / 1000);

    // Call the increment_rate_limit function
    // IMPORTANT: The database function increments AFTER checking, preventing race conditions.
    // The returned current_count is the count AFTER incrementing.
    // Note: We use 'as unknown' to bypass Supabase's strict typing for custom RPC functions
    const { data: rawData, error } = await client.rpc('increment_rate_limit', {
      rate_key: identifier,
      window_seconds: windowSeconds,
    } as unknown as never);

    if (error) {
      serverLogger.error(
        {
          event: 'rateLimit.check_failed',
          identifier,
          error: error.message,
          code: error.code,
        },
        'Rate limit check failed, using in-memory fallback'
      );
      return checkRateLimitMemory(identifier, config);
    }

    const data = rawData as unknown as Array<{ current_count: number; reset_time: string }>;

    if (!data || data.length === 0) {
      serverLogger.error(
        {
          event: 'rateLimit.no_data',
          identifier,
        },
        'Rate limit function returned no data, using in-memory fallback'
      );
      return checkRateLimitMemory(identifier, config);
    }

    // Safely get first result
    const result = safeArrayFirst(data);
    if (!result) {
      serverLogger.error(
        {
          event: 'rateLimit.invalid_data',
          identifier,
        },
        'Rate limit function returned invalid data, using in-memory fallback'
      );
      return checkRateLimitMemory(identifier, config);
    }

    const currentCount = result.current_count;
    const resetTime = new Date(result.reset_time).getTime();

    // Check if the INCREMENTED count exceeds the limit
    // If currentCount > max, the request should be rejected
    const success = currentCount <= config.max;
    const remaining = Math.max(0, config.max - currentCount);

    return {
      success,
      limit: config.max,
      remaining,
      resetAt: resetTime,
    };
  } catch (err) {
    serverLogger.error(
      {
        event: 'rateLimit.unexpected_error',
        identifier,
        error: err,
      },
      'Unexpected error in rate limit check, using in-memory fallback'
    );
    return checkRateLimitMemory(identifier, config);
  }
}

/**
 * Rate limit middleware helper for API routes
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (identifier: string): Promise<RateLimitResult> => {
    return checkRateLimit(identifier, config);
  };
}

/**
 * Synchronous rate limit check (uses in-memory fallback)
 * @deprecated Use async checkRateLimit instead for distributed rate limiting
 */
export function checkRateLimitSync(identifier: string, config: RateLimitConfig): RateLimitResult {
  return checkRateLimitMemory(identifier, config);
}

/**
 * Common rate limit presets - TIERED SECURITY MODEL
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
export const RATE_LIMITS = {
  // TIER 1: 5 requests per minute - for authentication, payment, and admin operations
  tier1_auth_payment: { max: 5, windowMs: 60 * 1000 },

  // TIER 2: 10 requests per minute - for expensive resource creation operations
  tier2_resource_creation: { max: 10, windowMs: 60 * 1000 },

  // TIER 3: 30 requests per minute - for status checks and read operations
  tier3_status_read: { max: 30, windowMs: 60 * 1000 },

  // TIER 4: 60 requests per minute - for general API operations
  tier4_general: { max: 60, windowMs: 60 * 1000 },

  // Legacy aliases for backward compatibility (will be removed)
  // @deprecated Use tier-based limits instead
  strict: { max: 5, windowMs: 60 * 1000 },
  expensive: { max: 10, windowMs: 60 * 1000 },
  moderate: { max: 30, windowMs: 60 * 1000 },
  relaxed: { max: 60, windowMs: 60 * 1000 },
} as const satisfies Record<string, RateLimitConfig>;
