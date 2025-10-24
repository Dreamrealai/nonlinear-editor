/**
 * Tests for Rate Limit Configuration
 *
 * @module __tests__/lib/config/rateLimit.test
 */

import {
  RATE_LIMIT_TIERS,
  ENDPOINT_RATE_LIMITS,
  RATE_LIMIT_KEYS,
  RATE_LIMIT_HEADERS,
  RATE_LIMIT_MESSAGES,
  LEGACY_RATE_LIMITS,
  createRateLimitKey,
  type RateLimitConfig,
} from '@/lib/config/rateLimit';

describe('RATE_LIMIT_TIERS', () => {
  describe('Tier Definitions', () => {
    it('should define TIER_1_AUTH_PAYMENT with correct values', () => {
      expect(RATE_LIMIT_TIERS.TIER_1_AUTH_PAYMENT).toEqual({
        max: 5,
        windowMs: 60 * 1000,
      });
    });

    it('should define TIER_2_RESOURCE_CREATION with correct values', () => {
      expect(RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION).toEqual({
        max: 10,
        windowMs: 60 * 1000,
      });
    });

    it('should define TIER_3_STATUS_READ with correct values', () => {
      expect(RATE_LIMIT_TIERS.TIER_3_STATUS_READ).toEqual({
        max: 30,
        windowMs: 60 * 1000,
      });
    });

    it('should define TIER_4_GENERAL with correct values', () => {
      expect(RATE_LIMIT_TIERS.TIER_4_GENERAL).toEqual({
        max: 60,
        windowMs: 60 * 1000,
      });
    });
  });

  describe('Tier Strictness', () => {
    it('should have increasing limits from Tier 1 to Tier 4', () => {
      expect(RATE_LIMIT_TIERS.TIER_1_AUTH_PAYMENT.max).toBeLessThan(
        RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION.max
      );
      expect(RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION.max).toBeLessThan(
        RATE_LIMIT_TIERS.TIER_3_STATUS_READ.max
      );
      expect(RATE_LIMIT_TIERS.TIER_3_STATUS_READ.max).toBeLessThan(
        RATE_LIMIT_TIERS.TIER_4_GENERAL.max
      );
    });

    it('should have consistent window across all tiers', () => {
      const windowMs = 60 * 1000;

      expect(RATE_LIMIT_TIERS.TIER_1_AUTH_PAYMENT.windowMs).toBe(windowMs);
      expect(RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION.windowMs).toBe(windowMs);
      expect(RATE_LIMIT_TIERS.TIER_3_STATUS_READ.windowMs).toBe(windowMs);
      expect(RATE_LIMIT_TIERS.TIER_4_GENERAL.windowMs).toBe(windowMs);
    });
  });

  describe('Immutability', () => {
    it('should be immutable', () => {
      expect(() => {
        // @ts-expect-error Testing immutability
        RATE_LIMIT_TIERS.TIER_1_AUTH_PAYMENT = { max: 100, windowMs: 1000 };
      }).toThrow();
    });
  });
});

describe('ENDPOINT_RATE_LIMITS', () => {
  describe('Video Operations', () => {
    it('should apply TIER_2 to video generation', () => {
      expect(ENDPOINT_RATE_LIMITS.VIDEO_GENERATION).toBe(
        RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION
      );
    });

    it('should apply TIER_3 to video status', () => {
      expect(ENDPOINT_RATE_LIMITS.VIDEO_STATUS).toBe(
        RATE_LIMIT_TIERS.TIER_3_STATUS_READ
      );
    });

    it('should apply TIER_2 to video upscale', () => {
      expect(ENDPOINT_RATE_LIMITS.VIDEO_UPSCALE).toBe(
        RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION
      );
    });
  });

  describe('Image Operations', () => {
    it('should apply TIER_2 to image generation', () => {
      expect(ENDPOINT_RATE_LIMITS.IMAGE_GENERATION).toBe(
        RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION
      );
    });
  });

  describe('Audio Operations', () => {
    it('should apply TIER_2 to TTS', () => {
      expect(ENDPOINT_RATE_LIMITS.AUDIO_TTS).toBe(
        RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION
      );
    });

    it('should apply TIER_2 to music generation', () => {
      expect(ENDPOINT_RATE_LIMITS.AUDIO_MUSIC).toBe(
        RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION
      );
    });

    it('should apply TIER_2 to SFX generation', () => {
      expect(ENDPOINT_RATE_LIMITS.AUDIO_SFX).toBe(
        RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION
      );
    });
  });

  describe('Asset Operations', () => {
    it('should apply TIER_2 to asset upload', () => {
      expect(ENDPOINT_RATE_LIMITS.ASSET_UPLOAD).toBe(
        RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION
      );
    });

    it('should apply TIER_3 to asset list', () => {
      expect(ENDPOINT_RATE_LIMITS.ASSET_LIST).toBe(
        RATE_LIMIT_TIERS.TIER_3_STATUS_READ
      );
    });
  });

  describe('Project Operations', () => {
    it('should apply TIER_2 to project creation', () => {
      expect(ENDPOINT_RATE_LIMITS.PROJECT_CREATE).toBe(
        RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION
      );
    });

    it('should apply TIER_3 to project list', () => {
      expect(ENDPOINT_RATE_LIMITS.PROJECT_LIST).toBe(
        RATE_LIMIT_TIERS.TIER_3_STATUS_READ
      );
    });

    it('should apply TIER_4 to project update', () => {
      expect(ENDPOINT_RATE_LIMITS.PROJECT_UPDATE).toBe(
        RATE_LIMIT_TIERS.TIER_4_GENERAL
      );
    });
  });

  describe('Authentication & Payment', () => {
    it('should apply TIER_1 to Stripe checkout', () => {
      expect(ENDPOINT_RATE_LIMITS.STRIPE_CHECKOUT).toBe(
        RATE_LIMIT_TIERS.TIER_1_AUTH_PAYMENT
      );
    });

    it('should apply TIER_1 to Stripe portal', () => {
      expect(ENDPOINT_RATE_LIMITS.STRIPE_PORTAL).toBe(
        RATE_LIMIT_TIERS.TIER_1_AUTH_PAYMENT
      );
    });

    it('should apply TIER_1 to user deletion', () => {
      expect(ENDPOINT_RATE_LIMITS.USER_DELETE).toBe(
        RATE_LIMIT_TIERS.TIER_1_AUTH_PAYMENT
      );
    });

    it('should apply TIER_1 to admin operations', () => {
      expect(ENDPOINT_RATE_LIMITS.ADMIN_OPERATIONS).toBe(
        RATE_LIMIT_TIERS.TIER_1_AUTH_PAYMENT
      );
    });
  });

  describe('History & Logs', () => {
    it('should apply TIER_3 to history', () => {
      expect(ENDPOINT_RATE_LIMITS.HISTORY).toBe(
        RATE_LIMIT_TIERS.TIER_3_STATUS_READ
      );
    });

    it('should apply TIER_3 to logs', () => {
      expect(ENDPOINT_RATE_LIMITS.LOGS).toBe(
        RATE_LIMIT_TIERS.TIER_3_STATUS_READ
      );
    });
  });

  describe('Resource Creation Endpoints', () => {
    it('should identify all TIER_2 endpoints', () => {
      const tier2Endpoints = Object.entries(ENDPOINT_RATE_LIMITS)
        .filter(([, config]) => config === RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION)
        .map(([key]) => key);

      expect(tier2Endpoints).toContain('VIDEO_GENERATION');
      expect(tier2Endpoints).toContain('IMAGE_GENERATION');
      expect(tier2Endpoints).toContain('AUDIO_TTS');
      expect(tier2Endpoints).toContain('ASSET_UPLOAD');
      expect(tier2Endpoints).toContain('PROJECT_CREATE');
    });
  });
});

describe('RATE_LIMIT_KEYS', () => {
  it('should define video generation key', () => {
    expect(RATE_LIMIT_KEYS.VIDEO_GEN).toBe('video-gen');
  });

  it('should define image generation key', () => {
    expect(RATE_LIMIT_KEYS.IMAGE_GEN).toBe('image-gen');
  });

  it('should define audio keys', () => {
    expect(RATE_LIMIT_KEYS.AUDIO_TTS).toBe('audio-tts');
    expect(RATE_LIMIT_KEYS.AUDIO_MUSIC).toBe('audio-music');
    expect(RATE_LIMIT_KEYS.AUDIO_SFX).toBe('audio-sfx');
  });

  it('should define asset upload key', () => {
    expect(RATE_LIMIT_KEYS.ASSET_UPLOAD).toBe('asset-upload');
  });

  it('should define project creation key', () => {
    expect(RATE_LIMIT_KEYS.PROJECT_CREATE).toBe('project-create');
  });

  it('should define authentication keys', () => {
    expect(RATE_LIMIT_KEYS.STRIPE).toBe('stripe');
    expect(RATE_LIMIT_KEYS.USER_DELETE).toBe('user-delete');
    expect(RATE_LIMIT_KEYS.ADMIN).toBe('admin');
  });
});

describe('createRateLimitKey', () => {
  it('should create key with operation and user ID', () => {
    const key = createRateLimitKey('video-gen', 'user-123');
    expect(key).toBe('video-gen:user-123');
  });

  it('should create unique keys for different operations', () => {
    const key1 = createRateLimitKey('video-gen', 'user-123');
    const key2 = createRateLimitKey('image-gen', 'user-123');

    expect(key1).not.toBe(key2);
    expect(key1).toBe('video-gen:user-123');
    expect(key2).toBe('image-gen:user-123');
  });

  it('should create unique keys for different users', () => {
    const key1 = createRateLimitKey('video-gen', 'user-123');
    const key2 = createRateLimitKey('video-gen', 'user-456');

    expect(key1).not.toBe(key2);
    expect(key1).toBe('video-gen:user-123');
    expect(key2).toBe('video-gen:user-456');
  });

  it('should work with predefined operation keys', () => {
    const key = createRateLimitKey(RATE_LIMIT_KEYS.VIDEO_GEN, 'user-789');
    expect(key).toBe('video-gen:user-789');
  });

  it('should handle empty strings', () => {
    const key = createRateLimitKey('', '');
    expect(key).toBe(':');
  });

  it('should handle special characters in user ID', () => {
    const key = createRateLimitKey('video-gen', 'user-abc-123-xyz');
    expect(key).toBe('video-gen:user-abc-123-xyz');
  });
});

describe('RATE_LIMIT_HEADERS', () => {
  it('should define standard rate limit headers', () => {
    expect(RATE_LIMIT_HEADERS.LIMIT).toBe('X-RateLimit-Limit');
    expect(RATE_LIMIT_HEADERS.REMAINING).toBe('X-RateLimit-Remaining');
    expect(RATE_LIMIT_HEADERS.RESET).toBe('X-RateLimit-Reset');
    expect(RATE_LIMIT_HEADERS.RETRY_AFTER).toBe('Retry-After');
  });

  it('should follow standard header naming conventions', () => {
    expect(RATE_LIMIT_HEADERS.LIMIT).toMatch(/^X-RateLimit-/);
    expect(RATE_LIMIT_HEADERS.REMAINING).toMatch(/^X-RateLimit-/);
    expect(RATE_LIMIT_HEADERS.RESET).toMatch(/^X-RateLimit-/);
  });
});

describe('RATE_LIMIT_MESSAGES', () => {
  it('should define generic exceeded message', () => {
    expect(RATE_LIMIT_MESSAGES.EXCEEDED).toBe(
      'Rate limit exceeded. Please try again later.'
    );
  });

  it('should define tier-specific messages', () => {
    expect(RATE_LIMIT_MESSAGES.TIER_1).toContain('authentication/payment');
    expect(RATE_LIMIT_MESSAGES.TIER_2).toContain('resource creation');
    expect(RATE_LIMIT_MESSAGES.TIER_3).toContain('status check');
    expect(RATE_LIMIT_MESSAGES.TIER_4).toContain('Too many requests');
  });

  it('should provide user-friendly messages', () => {
    Object.values(RATE_LIMIT_MESSAGES).forEach((message) => {
      expect(message.length).toBeGreaterThan(0);
      expect(message).toMatch(/\./); // Should end with period
    });
  });
});

describe('LEGACY_RATE_LIMITS', () => {
  it('should map strict to TIER_1', () => {
    expect(LEGACY_RATE_LIMITS.strict).toBe(RATE_LIMIT_TIERS.TIER_1_AUTH_PAYMENT);
  });

  it('should map expensive to TIER_2', () => {
    expect(LEGACY_RATE_LIMITS.expensive).toBe(RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION);
  });

  it('should map moderate to TIER_3', () => {
    expect(LEGACY_RATE_LIMITS.moderate).toBe(RATE_LIMIT_TIERS.TIER_3_STATUS_READ);
  });

  it('should map relaxed to TIER_4', () => {
    expect(LEGACY_RATE_LIMITS.relaxed).toBe(RATE_LIMIT_TIERS.TIER_4_GENERAL);
  });

  it('should maintain backward compatibility', () => {
    // Verify legacy names work the same as new names
    expect(LEGACY_RATE_LIMITS.strict.max).toBe(5);
    expect(LEGACY_RATE_LIMITS.expensive.max).toBe(10);
    expect(LEGACY_RATE_LIMITS.moderate.max).toBe(30);
    expect(LEGACY_RATE_LIMITS.relaxed.max).toBe(60);
  });
});

describe('Type Safety', () => {
  it('should enforce RateLimitConfig structure', () => {
    const config: RateLimitConfig = {
      max: 10,
      windowMs: 60000,
    };

    expect(config.max).toBe(10);
    expect(config.windowMs).toBe(60000);
  });

  it('should allow valid tier configurations', () => {
    const configs: RateLimitConfig[] = [
      RATE_LIMIT_TIERS.TIER_1_AUTH_PAYMENT,
      RATE_LIMIT_TIERS.TIER_2_RESOURCE_CREATION,
      RATE_LIMIT_TIERS.TIER_3_STATUS_READ,
      RATE_LIMIT_TIERS.TIER_4_GENERAL,
    ];

    configs.forEach((config) => {
      expect(config.max).toBeGreaterThan(0);
      expect(config.windowMs).toBeGreaterThan(0);
    });
  });
});

describe('Configuration Validation', () => {
  it('should have positive max values for all tiers', () => {
    Object.values(RATE_LIMIT_TIERS).forEach((tier) => {
      expect(tier.max).toBeGreaterThan(0);
    });
  });

  it('should have positive window values for all tiers', () => {
    Object.values(RATE_LIMIT_TIERS).forEach((tier) => {
      expect(tier.windowMs).toBeGreaterThan(0);
    });
  });

  it('should have reasonable max values', () => {
    Object.values(RATE_LIMIT_TIERS).forEach((tier) => {
      expect(tier.max).toBeLessThanOrEqual(1000); // Sanity check
    });
  });

  it('should have reasonable window values', () => {
    Object.values(RATE_LIMIT_TIERS).forEach((tier) => {
      expect(tier.windowMs).toBeLessThanOrEqual(3600000); // Max 1 hour
    });
  });

  it('should define all endpoint limits', () => {
    const requiredEndpoints = [
      'VIDEO_GENERATION',
      'VIDEO_STATUS',
      'IMAGE_GENERATION',
      'AUDIO_TTS',
      'ASSET_UPLOAD',
      'PROJECT_CREATE',
      'STRIPE_CHECKOUT',
      'ADMIN_OPERATIONS',
    ];

    requiredEndpoints.forEach((endpoint) => {
      expect(ENDPOINT_RATE_LIMITS).toHaveProperty(endpoint);
    });
  });
});
