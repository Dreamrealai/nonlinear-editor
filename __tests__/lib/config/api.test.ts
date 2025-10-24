/**
 * Tests for API Configuration
 *
 * @module __tests__/lib/config/api.test
 */

import {
  API_ENDPOINTS,
  FAL_ENDPOINTS,
  TIMEOUTS,
  RETRY_CONFIG,
  RETRYABLE_STATUS_CODES,
  DEFAULT_VOICE_IDS,
  VOICE_SETTINGS,
  calculateRetryDelay,
  shouldRetryStatusCode,
} from '@/lib/config/api';

describe('API_ENDPOINTS', () => {
  it('should define Google Vertex AI endpoint', () => {
    expect(API_ENDPOINTS.GOOGLE_VERTEX_AI).toBe('https://us-central1-aiplatform.googleapis.com/v1');
  });

  it('should define FAL queue endpoint', () => {
    expect(API_ENDPOINTS.FAL_QUEUE).toBe('https://queue.fal.run');
  });

  it('should define ElevenLabs endpoints', () => {
    expect(API_ENDPOINTS.ELEVENLABS_TTS).toContain('api.elevenlabs.io');
    expect(API_ENDPOINTS.ELEVENLABS_VOICES).toContain('api.elevenlabs.io');
  });

  it('should define Suno endpoints', () => {
    expect(API_ENDPOINTS.SUNO_SUBMIT).toContain('api.cometapi.com');
    expect(API_ENDPOINTS.SUNO_QUERY).toContain('api.cometapi.com');
  });

  it('should define Google Cloud scope', () => {
    expect(API_ENDPOINTS.GOOGLE_CLOUD_PLATFORM_SCOPE).toContain('googleapis.com/auth');
  });

  it('should have all endpoints as HTTPS', () => {
    Object.values(API_ENDPOINTS).forEach((endpoint) => {
      expect(endpoint).toMatch(/^https:\/\//);
    });
  });
});

describe('FAL_ENDPOINTS', () => {
  it('should define SeeDance text-to-video endpoint', () => {
    expect(FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO).toContain('seedance');
    expect(FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO).toContain('text-to-video');
  });

  it('should define SeeDance image-to-video endpoint', () => {
    expect(FAL_ENDPOINTS.SEEDANCE_IMAGE_TO_VIDEO).toContain('seedance');
    expect(FAL_ENDPOINTS.SEEDANCE_IMAGE_TO_VIDEO).toContain('image-to-video');
  });

  it('should define Minimax text-to-video endpoint', () => {
    expect(FAL_ENDPOINTS.MINIMAX_TEXT_TO_VIDEO).toContain('minimax');
    expect(FAL_ENDPOINTS.MINIMAX_TEXT_TO_VIDEO).toContain('text-to-video');
  });

  it('should define Minimax image-to-video endpoint', () => {
    expect(FAL_ENDPOINTS.MINIMAX_IMAGE_TO_VIDEO).toContain('minimax');
    expect(FAL_ENDPOINTS.MINIMAX_IMAGE_TO_VIDEO).toContain('image-to-video');
  });

  it('should follow FAL.ai endpoint pattern', () => {
    Object.values(FAL_ENDPOINTS).forEach((endpoint) => {
      expect(endpoint).toMatch(/^fal-ai\//);
    });
  });
});

describe('TIMEOUTS', () => {
  describe('Base Timeouts', () => {
    it('should define default timeout', () => {
      expect(TIMEOUTS.DEFAULT).toBe(60000);
    });

    it('should define short timeout', () => {
      expect(TIMEOUTS.SHORT).toBe(30000);
    });

    it('should define long timeout', () => {
      expect(TIMEOUTS.LONG).toBe(120000);
    });

    it('should have increasing timeout durations', () => {
      expect(TIMEOUTS.SHORT).toBeLessThan(TIMEOUTS.DEFAULT);
      expect(TIMEOUTS.DEFAULT).toBeLessThan(TIMEOUTS.LONG);
    });
  });

  describe('Operation Timeouts', () => {
    it('should define video generation timeouts', () => {
      expect(TIMEOUTS.VIDEO_GENERATION_REQUEST).toBeDefined();
      expect(TIMEOUTS.VIDEO_STATUS_CHECK).toBeDefined();
    });

    it('should define image generation timeout', () => {
      expect(TIMEOUTS.IMAGE_GENERATION).toBeDefined();
    });

    it('should define audio generation timeouts', () => {
      expect(TIMEOUTS.AUDIO_GENERATION).toBeDefined();
      expect(TIMEOUTS.AUDIO_STATUS_CHECK).toBeDefined();
    });

    it('should use shorter timeout for status checks', () => {
      expect(TIMEOUTS.VIDEO_STATUS_CHECK).toBeLessThanOrEqual(TIMEOUTS.VIDEO_GENERATION_REQUEST);
      expect(TIMEOUTS.AUDIO_STATUS_CHECK).toBeLessThanOrEqual(TIMEOUTS.AUDIO_GENERATION);
    });
  });

  describe('Service-Specific Timeouts', () => {
    it('should define FAL.ai timeouts', () => {
      expect(TIMEOUTS.FAL_SUBMIT).toBeDefined();
      expect(TIMEOUTS.FAL_STATUS).toBeDefined();
      expect(TIMEOUTS.FAL_RESULT).toBeDefined();
    });

    it('should define ElevenLabs timeouts', () => {
      expect(TIMEOUTS.ELEVENLABS_TTS).toBeDefined();
      expect(TIMEOUTS.ELEVENLABS_VOICES).toBeDefined();
    });

    it('should define Suno timeouts', () => {
      expect(TIMEOUTS.SUNO_SUBMIT).toBeDefined();
      expect(TIMEOUTS.SUNO_STATUS).toBeDefined();
    });

    it('should define Veo/Imagen timeouts', () => {
      expect(TIMEOUTS.VEO_SUBMIT).toBeDefined();
      expect(TIMEOUTS.VEO_STATUS).toBeDefined();
      expect(TIMEOUTS.IMAGEN_GENERATE).toBeDefined();
    });
  });

  describe('Cleanup Intervals', () => {
    it('should define rate limit cleanup interval', () => {
      expect(TIMEOUTS.RATE_LIMIT_CLEANUP).toBe(5 * 60 * 1000);
    });

    it('should define autosave interval', () => {
      expect(TIMEOUTS.AUTOSAVE_INTERVAL).toBe(2000);
    });

    it('should have reasonable cleanup interval', () => {
      expect(TIMEOUTS.RATE_LIMIT_CLEANUP).toBeGreaterThan(60000);
    });
  });

  describe('Timeout Values', () => {
    it('should have all timeouts as positive numbers', () => {
      Object.values(TIMEOUTS).forEach((timeout) => {
        expect(timeout).toBeGreaterThan(0);
        expect(typeof timeout).toBe('number');
      });
    });

    it('should have reasonable maximum timeouts', () => {
      Object.entries(TIMEOUTS).forEach(([key, timeout]) => {
        if (!key.includes('CLEANUP') && !key.includes('INTERVAL')) {
          expect(timeout).toBeLessThanOrEqual(120000); // 2 minutes max
        }
      });
    });
  });
});

describe('RETRY_CONFIG', () => {
  it('should define max retries', () => {
    expect(RETRY_CONFIG.MAX_RETRIES).toBe(3);
  });

  it('should define base delay', () => {
    expect(RETRY_CONFIG.BASE_DELAY).toBe(1000);
  });

  it('should define max delay', () => {
    expect(RETRY_CONFIG.MAX_DELAY).toBe(10000);
  });

  it('should define jitter factor', () => {
    expect(RETRY_CONFIG.JITTER_FACTOR).toBe(0.1);
  });

  it('should have reasonable values', () => {
    expect(RETRY_CONFIG.MAX_RETRIES).toBeGreaterThan(0);
    expect(RETRY_CONFIG.BASE_DELAY).toBeGreaterThan(0);
    expect(RETRY_CONFIG.MAX_DELAY).toBeGreaterThan(RETRY_CONFIG.BASE_DELAY);
    expect(RETRY_CONFIG.JITTER_FACTOR).toBeGreaterThan(0);
    expect(RETRY_CONFIG.JITTER_FACTOR).toBeLessThanOrEqual(1);
  });
});

describe('RETRYABLE_STATUS_CODES', () => {
  it('should include request timeout', () => {
    expect(RETRYABLE_STATUS_CODES).toContain(408);
  });

  it('should include rate limit', () => {
    expect(RETRYABLE_STATUS_CODES).toContain(429);
  });

  it('should include server errors', () => {
    expect(RETRYABLE_STATUS_CODES).toContain(500);
    expect(RETRYABLE_STATUS_CODES).toContain(502);
    expect(RETRYABLE_STATUS_CODES).toContain(503);
    expect(RETRYABLE_STATUS_CODES).toContain(504);
  });

  it('should not include client errors', () => {
    expect(RETRYABLE_STATUS_CODES).not.toContain(400);
    expect(RETRYABLE_STATUS_CODES).not.toContain(401);
    expect(RETRYABLE_STATUS_CODES).not.toContain(403);
    expect(RETRYABLE_STATUS_CODES).not.toContain(404);
  });

  it('should have at least 6 status codes', () => {
    expect(RETRYABLE_STATUS_CODES.length).toBe(6);
  });
});

describe('DEFAULT_VOICE_IDS', () => {
  it('should define voice IDs', () => {
    expect(DEFAULT_VOICE_IDS.SARAH).toBeDefined();
    expect(DEFAULT_VOICE_IDS.ADAM).toBeDefined();
    expect(DEFAULT_VOICE_IDS.RACHEL).toBeDefined();
  });

  it('should have non-empty voice IDs', () => {
    Object.values(DEFAULT_VOICE_IDS).forEach((voiceId) => {
      expect(voiceId).toBeTruthy();
      expect(typeof voiceId).toBe('string');
      expect(voiceId.length).toBeGreaterThan(0);
    });
  });

  it('should have unique voice IDs', () => {
    const ids = Object.values(DEFAULT_VOICE_IDS);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('VOICE_SETTINGS', () => {
  it('should define default stability', () => {
    expect(VOICE_SETTINGS.DEFAULT_STABILITY).toBe(0.5);
  });

  it('should define default similarity', () => {
    expect(VOICE_SETTINGS.DEFAULT_SIMILARITY).toBe(0.75);
  });

  it('should define stability range', () => {
    expect(VOICE_SETTINGS.MIN_STABILITY).toBe(0);
    expect(VOICE_SETTINGS.MAX_STABILITY).toBe(1);
  });

  it('should define similarity range', () => {
    expect(VOICE_SETTINGS.MIN_SIMILARITY).toBe(0);
    expect(VOICE_SETTINGS.MAX_SIMILARITY).toBe(1);
  });

  it('should have defaults within range', () => {
    expect(VOICE_SETTINGS.DEFAULT_STABILITY).toBeGreaterThanOrEqual(VOICE_SETTINGS.MIN_STABILITY);
    expect(VOICE_SETTINGS.DEFAULT_STABILITY).toBeLessThanOrEqual(VOICE_SETTINGS.MAX_STABILITY);
    expect(VOICE_SETTINGS.DEFAULT_SIMILARITY).toBeGreaterThanOrEqual(VOICE_SETTINGS.MIN_SIMILARITY);
    expect(VOICE_SETTINGS.DEFAULT_SIMILARITY).toBeLessThanOrEqual(VOICE_SETTINGS.MAX_SIMILARITY);
  });
});

describe('calculateRetryDelay', () => {
  beforeEach(() => {
    // Mock Math.random for predictable tests
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should calculate exponential backoff', () => {
    const delay0 = calculateRetryDelay(0);
    const delay1 = calculateRetryDelay(1);
    const delay2 = calculateRetryDelay(2);

    expect(delay1).toBeGreaterThan(delay0);
    expect(delay2).toBeGreaterThan(delay1);
  });

  it('should cap at max delay', () => {
    const delay = calculateRetryDelay(10); // Large attempt number

    expect(delay).toBeLessThanOrEqual(RETRY_CONFIG.MAX_DELAY * (1 + RETRY_CONFIG.JITTER_FACTOR));
  });

  it('should add jitter', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const delay1 = calculateRetryDelay(0);

    jest.spyOn(Math, 'random').mockReturnValue(0.8);
    const delay2 = calculateRetryDelay(0);

    expect(delay1).not.toBe(delay2);
  });

  it('should calculate first retry delay', () => {
    const delay = calculateRetryDelay(0);
    const expectedBase = RETRY_CONFIG.BASE_DELAY;

    expect(delay).toBeGreaterThanOrEqual(expectedBase);
    expect(delay).toBeLessThanOrEqual(expectedBase * (1 + RETRY_CONFIG.JITTER_FACTOR));
  });

  it('should calculate third retry delay', () => {
    const delay = calculateRetryDelay(2);
    const expectedBase = RETRY_CONFIG.BASE_DELAY * 4; // 2^2

    expect(delay).toBeGreaterThanOrEqual(expectedBase);
  });

  it('should handle zero attempt', () => {
    const delay = calculateRetryDelay(0);

    expect(delay).toBeGreaterThan(0);
    expect(typeof delay).toBe('number');
  });
});

describe('shouldRetryStatusCode', () => {
  describe('Retryable Status Codes', () => {
    it('should retry 408 Request Timeout', () => {
      expect(shouldRetryStatusCode(408)).toBe(true);
    });

    it('should retry 429 Too Many Requests', () => {
      expect(shouldRetryStatusCode(429)).toBe(true);
    });

    it('should retry 500 Internal Server Error', () => {
      expect(shouldRetryStatusCode(500)).toBe(true);
    });

    it('should retry 502 Bad Gateway', () => {
      expect(shouldRetryStatusCode(502)).toBe(true);
    });

    it('should retry 503 Service Unavailable', () => {
      expect(shouldRetryStatusCode(503)).toBe(true);
    });

    it('should retry 504 Gateway Timeout', () => {
      expect(shouldRetryStatusCode(504)).toBe(true);
    });
  });

  describe('Non-Retryable Status Codes', () => {
    it('should not retry 200 OK', () => {
      expect(shouldRetryStatusCode(200)).toBe(false);
    });

    it('should not retry 400 Bad Request', () => {
      expect(shouldRetryStatusCode(400)).toBe(false);
    });

    it('should not retry 401 Unauthorized', () => {
      expect(shouldRetryStatusCode(401)).toBe(false);
    });

    it('should not retry 403 Forbidden', () => {
      expect(shouldRetryStatusCode(403)).toBe(false);
    });

    it('should not retry 404 Not Found', () => {
      expect(shouldRetryStatusCode(404)).toBe(false);
    });

    it('should not retry 422 Unprocessable Entity', () => {
      expect(shouldRetryStatusCode(422)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown status codes', () => {
      expect(shouldRetryStatusCode(999)).toBe(false);
    });

    it('should handle negative status codes', () => {
      expect(shouldRetryStatusCode(-1)).toBe(false);
    });

    it('should handle zero status code', () => {
      expect(shouldRetryStatusCode(0)).toBe(false);
    });
  });
});

describe('Configuration Immutability', () => {
  it('should freeze API_ENDPOINTS', () => {
    expect(() => {
      (API_ENDPOINTS as any).NEW_ENDPOINT = 'https://example.com';
    }).toThrow();
  });

  it('should freeze FAL_ENDPOINTS', () => {
    expect(() => {
      (FAL_ENDPOINTS as any).NEW_ENDPOINT = 'fal-ai/test';
    }).toThrow();
  });

  it('should freeze RETRY_CONFIG', () => {
    expect(() => {
      (RETRY_CONFIG as any).MAX_RETRIES = 5;
    }).toThrow();
  });
});

describe('Integration Tests', () => {
  it('should have consistent timeout scaling', () => {
    // Status checks should generally be shorter than submission
    expect(TIMEOUTS.FAL_STATUS).toBeLessThanOrEqual(TIMEOUTS.FAL_SUBMIT);
    expect(TIMEOUTS.SUNO_STATUS).toBeLessThanOrEqual(TIMEOUTS.SUNO_SUBMIT);
    expect(TIMEOUTS.VIDEO_STATUS_CHECK).toBeLessThanOrEqual(TIMEOUTS.VIDEO_GENERATION_REQUEST);
  });

  it('should calculate retry sequence within reasonable bounds', () => {
    const delays = [];
    for (let i = 0; i < RETRY_CONFIG.MAX_RETRIES; i++) {
      delays.push(calculateRetryDelay(i));
    }

    // All delays should be positive
    delays.forEach((delay) => {
      expect(delay).toBeGreaterThan(0);
    });

    // Total retry time should be reasonable
    const totalTime = delays.reduce((sum, delay) => sum + delay, 0);
    expect(totalTime).toBeLessThan(30000); // Less than 30 seconds total
  });

  it('should have all retryable codes match shouldRetryStatusCode', () => {
    RETRYABLE_STATUS_CODES.forEach((code) => {
      expect(shouldRetryStatusCode(code)).toBe(true);
    });
  });
});
