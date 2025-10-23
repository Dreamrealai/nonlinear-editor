/**
 * Simple in-memory rate limiter for API routes
 * For production, use Redis-based rate limiting (e.g., @upstash/ratelimit)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.resetAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

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
 * Check if request is rate limited
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    // First request or window expired
    const resetAt = now + config.windowMs;
    store.set(identifier, { count: 1, resetAt });

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
 * Rate limit middleware helper for API routes
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (identifier: string): RateLimitResult => {
    return checkRateLimit(identifier, config);
  };
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
