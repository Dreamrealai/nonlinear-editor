/**
 * Supabase PostgreSQL-backed distributed rate limiter
 * Replaces in-memory storage with database-backed persistence
 * Supports multiple server instances and horizontal scaling
 */

import { createClient } from '@supabase/supabase-js';
import { serverLogger } from '@/lib/serverLogger';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Fallback in-memory store for when Supabase is unavailable
const fallbackStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes (fallback only)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of fallbackStore.entries()) {
    if (value.resetAt < now) {
      fallbackStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Initialize Supabase client with service role key for rate limiting
// Service role is required because rate_limits table has RLS enabled
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      serverLogger.warn({
        event: 'rateLimit.supabase_unavailable',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
      }, 'Supabase credentials not found, using in-memory rate limiting fallback');
      return null;
    }

    supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
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
function checkRateLimitMemory(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
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
    // Note: We use 'as unknown' to bypass Supabase's strict typing for custom RPC functions
    const { data: rawData, error } = await client.rpc(
      'increment_rate_limit',
      { rate_key: identifier, window_seconds: windowSeconds } as unknown as never
    );

    if (error) {
      serverLogger.error({
        event: 'rateLimit.check_failed',
        identifier,
        error: error.message,
        code: error.code,
      }, 'Rate limit check failed, using in-memory fallback');
      return checkRateLimitMemory(identifier, config);
    }

    const data = rawData as unknown as Array<{ current_count: number; reset_time: string }>;

    if (!data || data.length === 0) {
      serverLogger.error({
        event: 'rateLimit.no_data',
        identifier,
      }, 'Rate limit function returned no data, using in-memory fallback');
      return checkRateLimitMemory(identifier, config);
    }

    const result = data[0];
    const currentCount = result.current_count;
    const resetTime = new Date(result.reset_time).getTime();

    const success = currentCount <= config.max;
    const remaining = Math.max(0, config.max - currentCount);

    return {
      success,
      limit: config.max,
      remaining,
      resetAt: resetTime,
    };
  } catch (err) {
    serverLogger.error({
      event: 'rateLimit.unexpected_error',
      identifier,
      error: err,
    }, 'Unexpected error in rate limit check, using in-memory fallback');
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
export function checkRateLimitSync(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  return checkRateLimitMemory(identifier, config);
}

// Common rate limit presets
export const RATE_LIMITS = {
  // 10 requests per 10 seconds
  strict: { max: 10, windowMs: 10 * 1000 },

  // 30 requests per minute
  moderate: { max: 30, windowMs: 60 * 1000 },

  // 100 requests per minute
  relaxed: { max: 100, windowMs: 60 * 1000 },

  // 5 requests per minute (for expensive operations)
  expensive: { max: 5, windowMs: 60 * 1000 },
};
