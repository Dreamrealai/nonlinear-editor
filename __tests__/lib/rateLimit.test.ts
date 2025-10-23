import {
  checkRateLimit,
  createRateLimiter,
  RATE_LIMITS,
} from '@/lib/rateLimit'

describe('Rate Limiting', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const uniqueUser = `user-${Date.now()}-${Math.random()}`
      const result = checkRateLimit(uniqueUser, { max: 5, windowMs: 60000 })

      expect(result.success).toBe(true)
      expect(result.limit).toBe(5)
      expect(result.remaining).toBe(4)
      expect(result.resetAt).toBeGreaterThan(Date.now())
    })

    it('should track multiple requests', () => {
      const config = { max: 3, windowMs: 60000 }
      const uniqueUser = `user-${Date.now()}-${Math.random()}`

      const result1 = checkRateLimit(uniqueUser, config)
      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(2)

      const result2 = checkRateLimit(uniqueUser, config)
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(1)

      const result3 = checkRateLimit(uniqueUser, config)
      expect(result3.success).toBe(true)
      expect(result3.remaining).toBe(0)
    })

    it('should block requests after limit exceeded', () => {
      const config = { max: 2, windowMs: 60000 }
      const uniqueUser = `user-${Date.now()}-${Math.random()}`

      checkRateLimit(uniqueUser, config) // 1st request
      checkRateLimit(uniqueUser, config) // 2nd request

      const result = checkRateLimit(uniqueUser, config) // 3rd request (should be blocked)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should reset after time window expires', () => {
      const config = { max: 2, windowMs: 1000 }
      const uniqueUser = `user-${Date.now()}-${Math.random()}`

      // Make requests up to limit
      checkRateLimit(uniqueUser, config)
      checkRateLimit(uniqueUser, config)

      // Should be blocked
      let result = checkRateLimit(uniqueUser, config)
      expect(result.success).toBe(false)

      // Fast-forward past window
      jest.advanceTimersByTime(1001)

      // Should allow new request
      result = checkRateLimit(uniqueUser, config)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(1)
    })

    it('should track different identifiers separately', () => {
      const config = { max: 2, windowMs: 60000 }
      const uniqueUser1 = `user-${Date.now()}-${Math.random()}`
      const uniqueUser2 = `user-${Date.now()}-${Math.random()}`

      checkRateLimit(uniqueUser1, config)
      checkRateLimit(uniqueUser1, config)

      // user-1 should be blocked
      let result = checkRateLimit(uniqueUser1, config)
      expect(result.success).toBe(false)

      // user-2 should still have requests available
      result = checkRateLimit(uniqueUser2, config)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(1)
    })

    it('should return consistent resetAt within window', () => {
      const config = { max: 5, windowMs: 60000 }
      const uniqueUser = `user-${Date.now()}-${Math.random()}`

      const result1 = checkRateLimit(uniqueUser, config)
      const result2 = checkRateLimit(uniqueUser, config)

      expect(result1.resetAt).toBe(result2.resetAt)
    })

    it('should handle zero remaining correctly', () => {
      const config = { max: 1, windowMs: 60000 }
      const uniqueUser = `user-${Date.now()}-${Math.random()}`

      const result1 = checkRateLimit(uniqueUser, config)
      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(0)

      const result2 = checkRateLimit(uniqueUser, config)
      expect(result2.success).toBe(false)
      expect(result2.remaining).toBe(0)
    })
  })

  describe('createRateLimiter', () => {
    it('should create a reusable rate limiter function', () => {
      const limiter = createRateLimiter({ max: 3, windowMs: 60000 })
      const uniqueUser = `user-${Date.now()}-${Math.random()}`

      const result1 = limiter(uniqueUser)
      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(2)

      const result2 = limiter(uniqueUser)
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(1)
    })

    it('should apply same config to all calls', () => {
      const limiter = createRateLimiter({ max: 2, windowMs: 60000 })
      const uniqueUser = `user-${Date.now()}-${Math.random()}`

      limiter(uniqueUser)
      limiter(uniqueUser)

      const result = limiter(uniqueUser)
      expect(result.success).toBe(false)
    })
  })

  describe('RATE_LIMITS presets', () => {
    it('should have strict preset', () => {
      expect(RATE_LIMITS.strict).toEqual({
        max: 10,
        windowMs: 10 * 1000,
      })
    })

    it('should have moderate preset', () => {
      expect(RATE_LIMITS.moderate).toEqual({
        max: 30,
        windowMs: 60 * 1000,
      })
    })

    it('should have relaxed preset', () => {
      expect(RATE_LIMITS.relaxed).toEqual({
        max: 100,
        windowMs: 60 * 1000,
      })
    })

    it('should have expensive preset', () => {
      expect(RATE_LIMITS.expensive).toEqual({
        max: 5,
        windowMs: 60 * 1000,
      })
    })

    it('strict preset should work correctly', () => {
      const result = checkRateLimit('test-user', RATE_LIMITS.strict)
      expect(result.success).toBe(true)
      expect(result.limit).toBe(10)
    })
  })
})
