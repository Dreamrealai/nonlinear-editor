/**
 * Comprehensive Tests for POST /api/audio/elevenlabs/generate
 *
 * Tests the ElevenLabs text-to-speech generation endpoint that converts
 * text into realistic speech audio using AI voices.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/audio/elevenlabs/generate/route';
import {
  createTestUser,
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  createTestAuthHandler,
  getTestDatabase,
} from '@/test-utils/testWithAuth';

// Mock external dependencies
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    resetAt: Date.now() + 60000,
  }),
  RATE_LIMITS: {
    tier2_generation: { limit: 10, windowMs: 60000 },
  },
}));

// Mock fetch for ElevenLabs API
global.fetch = jest.fn();

describe('POST /api/audio/elevenlabs/generate', () => {
  const mockUser = createTestUser();
  const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
  const validText = 'Hello, this is a test of text-to-speech generation.';
  const mockAudioData = Buffer.from('mock-audio-data');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ELEVENLABS_API_KEY = 'test-api-key-123';

    // Setup database
    const db = getTestDatabase();
    db.set('projects', validProjectId, {
      id: validProjectId,
      user_id: mockUser.id,
      title: 'Test Project',
      created_at: new Date().toISOString(),
    });

    db.set('user_profiles', mockUser.id, {
      id: mockUser.id,
      email: mockUser.email,
      tier: 'premium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Mock successful ElevenLabs API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: jest.fn().mockResolvedValue(mockAudioData),
      text: jest.fn().mockResolvedValue(''),
    });
  });

  afterEach(() => {
    delete process.env.ELEVENLABS_API_KEY;
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      const request = createUnauthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should validate required text field', async () => {
      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          projectId: validProjectId,
          // Missing text
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('text');
    });

    it('should validate text minimum length', async () => {
      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: '', // Empty text
          projectId: validProjectId,
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('text');
    });

    it('should validate text maximum length (5000 chars)', async () => {
      const longText = 'a'.repeat(5001); // Exceeds limit

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: longText,
          projectId: validProjectId,
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('text');
    });

    it('should validate required projectId field', async () => {
      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          // Missing projectId
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('projectId');
    });

    it('should validate projectId is valid UUID', async () => {
      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: 'invalid-uuid',
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('projectId');
    });

    it('should validate voiceId format', async () => {
      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
          voiceId: 'invalid voice id with spaces!',
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('voice ID');
    });

    it('should validate stability is number between 0 and 1', async () => {
      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
          stability: 1.5, // Out of range
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Stability');
    });

    it('should validate similarity is number between 0 and 1', async () => {
      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
          similarity: -0.1, // Out of range
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Similarity');
    });
  });

  describe('Project Ownership', () => {
    it('should verify user owns the project', async () => {
      const otherUserId = '999e9999-e99b-99d9-a999-999999999999';
      const db = getTestDatabase();

      // Set project owned by different user
      db.set('projects', validProjectId, {
        id: validProjectId,
        user_id: otherUserId,
        title: 'Other User Project',
        created_at: new Date().toISOString(),
      });

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('project');
    });

    it('should reject when project does not exist', async () => {
      const nonExistentProjectId = '000e0000-e00b-00d0-a000-000000000000';

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: nonExistentProjectId,
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('project');
    });
  });

  describe('ElevenLabs API Integration', () => {
    it('should call ElevenLabs API with correct parameters', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
          voiceId: 'custom-voice-123',
          modelId: 'eleven_turbo_v2',
          stability: 0.6,
          similarity: 0.8,
        },
      });

      await POST(request, { params: Promise.resolve({}) });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/text-to-speech/custom-voice-123',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'xi-api-key': 'test-api-key-123',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: validText,
            model_id: 'eleven_turbo_v2',
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.8,
            },
          }),
        })
      );
    });

    it('should use default voice and model when not specified', async () => {
      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
        },
      });

      await POST(request, { params: Promise.resolve({}) });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL',
        expect.objectContaining({
          body: expect.stringContaining('eleven_multilingual_v2'),
        })
      );
    });

    it('should return 503 when ELEVENLABS_API_KEY not configured', async () => {
      delete process.env.ELEVENLABS_API_KEY;

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toContain('API key not configured');
    });
  });

  describe('Error Handling', () => {
    it('should handle ElevenLabs API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Invalid voice ID'),
      });

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Failed to generate audio');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
    });

    it('should handle timeout errors', async () => {
      // Mock fetch to take longer than timeout
      (global.fetch as jest.Mock).mockImplementation(
        (url, options) =>
          new Promise((resolve) => {
            setTimeout(() => {
              if (options?.signal?.aborted) {
                throw new DOMException('Aborted', 'AbortError');
              }
              resolve({
                ok: true,
                arrayBuffer: jest.fn().mockResolvedValue(mockAudioData),
              });
            }, 65000); // Longer than 60s timeout
          })
      );

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('timeout');
    }, 70000);

    it('should handle storage upload failures', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
        },
      });

      // Mock storage to fail
      const db = getTestDatabase();
      db.setStorageError('assets', {
        message: 'Storage quota exceeded',
        statusCode: '413',
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('upload');
    });

    it('should handle database insert failures', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
        },
      });

      // Mock database to fail on insert
      const db = getTestDatabase();
      db.setTableError('assets', {
        message: 'Database connection lost',
        code: 'CONNECTION_ERROR',
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('database');
    });
  });

  describe('Success Cases', () => {
    it('should successfully generate audio and return asset', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
          voiceId: 'test-voice-456',
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message).toContain('Audio generated successfully');
      expect(data.asset).toBeDefined();
      expect(data.asset.type).toBe('audio');
      expect(data.asset.source).toBe('genai');
      expect(data.asset.mime_type).toBe('audio/mpeg');
      expect(data.asset.project_id).toBe(validProjectId);
      expect(data.asset.user_id).toBe(user.id);
    });

    it('should store correct metadata in asset', async () => {
      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
          voiceId: 'metadata-test-voice',
          modelId: 'metadata-test-model',
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data.asset.metadata).toEqual(
        expect.objectContaining({
          provider: 'elevenlabs',
          voiceId: 'metadata-test-voice',
          modelId: 'metadata-test-model',
          text: validText,
          filename: expect.stringMatching(/^elevenlabs_\d+\.mp3$/),
        })
      );
    });

    it('should truncate long text in metadata to 200 chars', async () => {
      const longText = 'a'.repeat(500);

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: longText,
          projectId: validProjectId,
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data.asset.metadata.text).toHaveLength(200);
      expect(data.asset.metadata.text).toBe(longText.substring(0, 200));
    });

    it('should upload audio to correct storage path', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
        },
      });

      await POST(request, { params: Promise.resolve({}) });

      const db = getTestDatabase();
      const uploads = db.getStorageUploads('assets');

      expect(uploads.length).toBe(1);
      expect(uploads[0].path).toMatch(
        new RegExp(`^${user.id}/${validProjectId}/audio/elevenlabs_\\d+\\.mp3$`)
      );
      expect(uploads[0].contentType).toBe('audio/mpeg');
    });

    it('should generate unique filenames for concurrent requests', async () => {
      const { request: request1 } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
        },
      });

      const { request: request2 } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: 'Different text for second request',
          projectId: validProjectId,
        },
      });

      const [response1, response2] = await Promise.all([
        POST(request1, { params: Promise.resolve({}) }),
        POST(request2, { params: Promise.resolve({}) }),
      ]);

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.asset.metadata.filename).not.toBe(data2.asset.metadata.filename);
      expect(data1.asset.id).not.toBe(data2.asset.id);
    });
  });

  describe('Edge Cases', () => {
    it('should handle bodyUserId mismatch (forbidden)', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
          userId: '000e0000-e00b-00d0-a000-000000000000', // Different from authenticated user
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Forbidden');
    });

    it('should accept bodyUserId when it matches authenticated user', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
          userId: user.id, // Matches authenticated user
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
    });

    it('should handle maximum allowed text length (5000 chars)', async () => {
      const maxText = 'a'.repeat(5000);

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: maxText,
          projectId: validProjectId,
        },
      });

      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
    });

    it('should handle edge values for stability (0 and 1)', async () => {
      const { request: requestMin } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
          stability: 0,
        },
      });

      const { request: requestMax } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
          stability: 1,
        },
      });

      const [responseMin, responseMax] = await Promise.all([
        POST(requestMin, { params: Promise.resolve({}) }),
        POST(requestMax, { params: Promise.resolve({}) }),
      ]);

      expect(responseMin.status).toBe(200);
      expect(responseMax.status).toBe(200);
    });

    it('should handle edge values for similarity (0 and 1)', async () => {
      const { request: requestMin } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
          similarity: 0,
        },
      });

      const { request: requestMax } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/audio/elevenlabs/generate',
        body: {
          text: validText,
          projectId: validProjectId,
          similarity: 1,
        },
      });

      const [responseMin, responseMax] = await Promise.all([
        POST(requestMin, { params: Promise.resolve({}) }),
        POST(requestMax, { params: Promise.resolve({}) }),
      ]);

      expect(responseMin.status).toBe(200);
      expect(responseMax.status).toBe(200);
    });
  });
});
