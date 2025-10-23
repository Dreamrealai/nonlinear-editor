import {
  checkRateLimit,
  createRateLimiter,
  RATE_LIMITS,
  checkRateLimitSync,
} from '@/lib/rateLimit';

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Rate Limiting', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('should allow first request', async () => {
      const uniqueUser = `user-${Date.now()}-${Math.random()}`;
      const result = await checkRateLimit(uniqueUser, { max: 5, windowMs: 60000 });

      expect(result.success).toBe(true);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it('should track multiple requests', async () => {
      const config = { max: 3, windowMs: 60000 };
      const uniqueUser = `user-${Date.now()}-${Math.random()}`;

      const result1 = await checkRateLimit(uniqueUser, config);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = await checkRateLimit(uniqueUser, config);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = await checkRateLimit(uniqueUser, config);
      expect(result3.success).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should block requests after limit exceeded', async () => {
      const config = { max: 2, windowMs: 60000 };
      const uniqueUser = `user-${Date.now()}-${Math.random()}`;

      await checkRateLimit(uniqueUser, config); // 1st request
      await checkRateLimit(uniqueUser, config); // 2nd request

      const result = await checkRateLimit(uniqueUser, config); // 3rd request (should be blocked)
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after time window expires', async () => {
      const config = { max: 2, windowMs: 1000 };
      const uniqueUser = `user-${Date.now()}-${Math.random()}`;

      // Make requests up to limit
      await checkRateLimit(uniqueUser, config);
      await checkRateLimit(uniqueUser, config);

      // Should be blocked
      let result = await checkRateLimit(uniqueUser, config);
      expect(result.success).toBe(false);

      // Fast-forward past window
      jest.advanceTimersByTime(1001);
      await Promise.resolve();

      // Should allow new request
      result = await checkRateLimit(uniqueUser, config);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should track different identifiers separately', async () => {
      const config = { max: 2, windowMs: 60000 };
      const uniqueUser1 = `user-${Date.now()}-${Math.random()}`;
      const uniqueUser2 = `user-${Date.now()}-${Math.random()}`;

      await checkRateLimit(uniqueUser1, config);
      await checkRateLimit(uniqueUser1, config);

      // user-1 should be blocked
      let result = await checkRateLimit(uniqueUser1, config);
      expect(result.success).toBe(false);

      // user-2 should still have requests available
      result = await checkRateLimit(uniqueUser2, config);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should return consistent resetAt within window', async () => {
      const config = { max: 5, windowMs: 60000 };
      const uniqueUser = `user-${Date.now()}-${Math.random()}`;

      const result1 = await checkRateLimit(uniqueUser, config);
      const result2 = await checkRateLimit(uniqueUser, config);

      expect(result1.resetAt).toBe(result2.resetAt);
    });

    it('should handle zero remaining correctly', async () => {
      const config = { max: 1, windowMs: 60000 };
      const uniqueUser = `user-${Date.now()}-${Math.random()}`;

      const result1 = await checkRateLimit(uniqueUser, config);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(0);

      const result2 = await checkRateLimit(uniqueUser, config);
      expect(result2.success).toBe(false);
      expect(result2.remaining).toBe(0);
    });
  });

  describe('createRateLimiter', () => {
    it('should create a reusable rate limiter function', async () => {
      const limiter = createRateLimiter({ max: 3, windowMs: 60000 });
      const uniqueUser = `user-${Date.now()}-${Math.random()}`;

      const result1 = await limiter(uniqueUser);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = await limiter(uniqueUser);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(1);
    });

    it('should apply same config to all calls', async () => {
      const limiter = createRateLimiter({ max: 2, windowMs: 60000 });
      const uniqueUser = `user-${Date.now()}-${Math.random()}`;

      await limiter(uniqueUser);
      await limiter(uniqueUser);

      const result = await limiter(uniqueUser);
      expect(result.success).toBe(false);
    });
  });

  describe('RATE_LIMITS presets', () => {
    it('should expose tiered presets', () => {
      expect(RATE_LIMITS.tier1_auth_payment).toEqual({ max: 5, windowMs: 60_000 });
      expect(RATE_LIMITS.tier2_resource_creation).toEqual({ max: 10, windowMs: 60_000 });
      expect(RATE_LIMITS.tier3_status_read).toEqual({ max: 30, windowMs: 60_000 });
      expect(RATE_LIMITS.tier4_general).toEqual({ max: 60, windowMs: 60_000 });
    });

    it('legacy aliases map to tiered presets', () => {
      expect(RATE_LIMITS.strict).toEqual(RATE_LIMITS.tier1_auth_payment);
      expect(RATE_LIMITS.expensive).toEqual(RATE_LIMITS.tier2_resource_creation);
      expect(RATE_LIMITS.moderate).toEqual(RATE_LIMITS.tier3_status_read);
      expect(RATE_LIMITS.relaxed).toEqual(RATE_LIMITS.tier4_general);
    });

    it('strict preset should work correctly via sync helper', () => {
      const result = checkRateLimitSync('test-user', RATE_LIMITS.strict);
      expect(result.success).toBe(true);
      expect(result.limit).toBe(RATE_LIMITS.strict.max);
    });
  });
});
