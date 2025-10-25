/**
 * Tests for POST /api/audio/elevenlabs/sfx - ElevenLabs Sound Effects Generation
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/audio/elevenlabs/sfx/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

// Mock withAuth wrapper
jest.mock('@/lib/api/withAuth', (): Record<string, unknown> => ({
  withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
    const { createServerSupabaseClient } = require('@/lib/supabase');
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    return handler(req, { user, supabase, params: context?.params || {} });
  }),
}));

// Mock fetchWithTimeout
jest.mock('@/lib/fetchWithTimeout', (): Record<string, unknown> => ({
  fetchWithTimeout: jest.fn(),
}));

// Mock rate limiting
jest.mock('@/lib/rateLimit', (): Record<string, unknown> => ({
  checkRateLimit: jest.fn(),
  RATE_LIMITS: {
    tier2_resource_creation: { max: 10, windowMs: 60000 },
  },
}));

// Mock project verification
jest.mock('@/lib/api/project-verification', (): Record<string, unknown> => ({
  verifyProjectOwnership: jest.fn(),
}));

// Mock the Supabase module
jest.mock('@/lib/supabase', (): Record<string, unknown> => ({
  createServerSupabaseClient: jest.fn(),
}));

// Mock server logger
jest.mock('@/lib/serverLogger', (): Record<string, unknown> => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock validation
jest.mock('@/lib/api/validation', () => {
  const actual = jest.requireActual('@/lib/api/validation');
  return {
    ...actual,
    validateString: jest.fn((value, field, options) => {
      if (
        !value ||
        value.length < (options?.minLength || 0) ||
        value.length > (options?.maxLength || Infinity)
      ) {
        return { valid: false, errors: [{ field, message: `Invalid ${field}` }] };
      }
      return { valid: true, errors: [] };
    }),
    validateUUID: jest.fn((id, field) => {
      if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return { valid: false, errors: [{ field, message: `${field} must be a valid UUID` }] };
      }
      return { valid: true, errors: [] };
    }),
    validateAll: jest.fn((validations) => {
      const errors = validations.flatMap((v: any) => v.errors || []);
      return { valid: errors.length === 0, errors };
    }),
  };
});

describe('POST /api/audio/elevenlabs/sfx', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';
  const mockAudioBuffer = new ArrayBuffer(1024);

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Set up environment variable
    process.env['ELEVENLABS_API_KEY'] = 'test-api-key';

    // Mock rate limit to pass by default
    const { checkRateLimit } = require('@/lib/rateLimit');
    checkRateLimit.mockResolvedValue({ success: true, limit: 10, remaining: 9 });

    // Mock project verification to pass by default
    const { verifyProjectOwnership } = require('@/lib/api/project-verification');
    verifyProjectOwnership.mockResolvedValue({ hasAccess: true });
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
    delete process.env['ELEVENLABS_API_KEY'];
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'thunder storm',
          duration: 5.0,
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when prompt is missing', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          duration: 5.0,
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('prompt');
    });

    it('should return 400 when projectId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'thunder storm',
          duration: 5.0,
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid projectId format', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'invalid-uuid',
          prompt: 'thunder storm',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should return 400 when prompt is too short', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'ab', // Less than 3 chars
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should return 400 when prompt is too long', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'a'.repeat(501), // Exceeds 500 chars
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should return 400 for duration less than 0.5 seconds', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'thunder storm',
          duration: 0.4,
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('between 0.5 and 22 seconds');
    });

    it('should return 400 for duration greater than 22 seconds', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'thunder storm',
          duration: 23,
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should use default duration of 5.0 when not provided', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { fetchWithTimeout } = require('@/lib/fetchWithTimeout');
      fetchWithTimeout.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer),
      });

      // Mock storage upload success
      mockSupabase.storage.from().upload = jest.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      });

      mockSupabase.storage.from().getPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/audio.mp3' },
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'asset-123' },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'thunder storm',
          // duration omitted
        }),
      });

      await POST(mockRequest);

      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"duration_seconds":5'),
        })
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { checkRateLimit } = require('@/lib/rateLimit');
      checkRateLimit.mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        resetAt: Date.now() + 60000,
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'thunder storm',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(429);
    });
  });

  describe('Project Ownership', () => {
    it('should return 403 when user does not own project', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({
        hasAccess: false,
        error: 'Unauthorized access to project',
        status: 403,
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'thunder storm',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(403);
    });
  });

  describe('Success Cases', () => {
    it('should generate SFX successfully', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { fetchWithTimeout } = require('@/lib/fetchWithTimeout');

      fetchWithTimeout.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer),
      });

      mockSupabase.storage.from().upload = jest.fn().mockResolvedValue({
        data: { path: 'test-path.mp3' },
        error: null,
      });

      mockSupabase.storage.from().getPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/sfx.mp3' },
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'asset-123',
          type: 'audio',
          source: 'genai',
          storage_url: 'supabase://assets/test-path.mp3',
        },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'thunder storm',
          duration: 8.0,
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.asset).toBeTruthy();
      expect(data.url).toBe('https://example.com/sfx.mp3');
    });

    it('should call ElevenLabs API with correct parameters', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { fetchWithTimeout } = require('@/lib/fetchWithTimeout');

      fetchWithTimeout.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer),
      });

      mockSupabase.storage.from().upload = jest.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      });

      mockSupabase.storage.from().getPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/audio.mp3' },
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'asset-123' },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'gentle rain',
          duration: 10.0,
        }),
      });

      await POST(mockRequest);

      expect(fetchWithTimeout).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/sound-generation',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'xi-api-key': 'test-api-key',
            'Content-Type': 'application/json',
          }),
          timeout: 60000,
        })
      );

      const callArgs = fetchWithTimeout.mock.calls[0];
      const bodyJson = JSON.parse(callArgs[1].body);
      expect(bodyJson.text).toBe('gentle rain');
      expect(bodyJson.duration_seconds).toBe(10.0);
      expect(bodyJson.prompt_influence).toBe(0.3);
    });

    it('should save asset with correct metadata', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { fetchWithTimeout } = require('@/lib/fetchWithTimeout');

      fetchWithTimeout.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer),
      });

      mockSupabase.storage.from().upload = jest.fn().mockResolvedValue({
        data: { path: 'test/path.mp3' },
        error: null,
      });

      mockSupabase.storage.from().getPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/sfx.mp3' },
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'asset-123' },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'ocean waves',
          duration: 15.0,
        }),
      });

      await POST(mockRequest);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'audio',
          source: 'genai',
          mime_type: 'audio/mpeg',
          metadata: expect.objectContaining({
            provider: 'elevenlabs-sfx',
            prompt: 'ocean waves',
            duration: 15.0,
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when API key is not configured', async () => {
      delete process.env['ELEVENLABS_API_KEY'];
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'thunder',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('not configured');
    });

    it('should return error when ElevenLabs API fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { fetchWithTimeout } = require('@/lib/fetchWithTimeout');

      fetchWithTimeout.mockResolvedValue({
        ok: false,
        status: 402,
        statusText: 'Payment Required',
        text: jest.fn().mockResolvedValue('Insufficient credits'),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'thunder',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(402);
    });

    it('should return 504 when API times out', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { fetchWithTimeout } = require('@/lib/fetchWithTimeout');

      fetchWithTimeout.mockRejectedValue(new Error('Request timeout'));

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'thunder',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(504);
      const data = await response.json();
      expect(data.error).toContain('timeout');
    });

    it('should return 500 when storage upload fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { fetchWithTimeout } = require('@/lib/fetchWithTimeout');

      fetchWithTimeout.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer),
      });

      mockSupabase.storage.from().upload = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'thunder',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('upload');
    });

    it('should return 500 when database insert fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { fetchWithTimeout } = require('@/lib/fetchWithTimeout');

      fetchWithTimeout.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer),
      });

      mockSupabase.storage.from().upload = jest.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      });

      mockSupabase.storage.from().getPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/audio.mp3' },
      });

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/sfx', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'thunder',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('metadata');
    });
  });
});
