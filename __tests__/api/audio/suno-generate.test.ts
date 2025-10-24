/**
 * Tests for POST /api/audio/suno/generate - Suno Music Generation
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/audio/suno/generate/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

// Mock rate limiting
jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn(),
  RATE_LIMITS: {
    tier2_resource_creation: { max: 10, windowMs: 60000 },
  },
}));

// Mock project verification
jest.mock('@/lib/api/project-verification', () => ({
  verifyProjectOwnership: jest.fn(),
}));

// Mock the Supabase module
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

// Mock server logger
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import the real ValidationError class for use in mocks
const { ValidationError } = jest.requireActual('@/lib/validation');

// Mock validation functions from @/lib/api/validation (the backward compatibility wrapper)
jest.mock('@/lib/api/validation', () => {
  const actual = jest.requireActual('@/lib/api/validation');
  const { ValidationError: VError } = jest.requireActual('@/lib/validation');

  return {
    ...actual,
    validateString: jest.fn((value, field, options) => {
      const required = options?.required ?? true;
      if (!required && (value === undefined || value === null || value === '')) {
        return null;
      }
      if (!value || typeof value !== 'string') {
        return { field, message: `${field} is required` };
      }
      if (options?.minLength && value.length < options.minLength) {
        return { field, message: `Invalid ${field}` };
      }
      if (options?.maxLength && value.length > options.maxLength) {
        return { field, message: `Invalid ${field}` };
      }
      return null;
    }),
    validateUUID: jest.fn((id, field) => {
      if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return { field, message: `${field} must be a valid UUID` };
      }
      return null;
    }),
    validateBoolean: jest.fn((value, field, required = false) => {
      if (!required && (value === undefined || value === null)) {
        return null;
      }
      if (value !== undefined && value !== null && typeof value !== 'boolean') {
        return { field, message: `${field} must be a boolean` };
      }
      return null;
    }),
    validateAll: actual.validateAll,
  };
});

// Mock global fetch
global.fetch = jest.fn();

describe('POST /api/audio/suno/generate', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Set up environment variable
    process.env['COMET_API_KEY'] = 'test-comet-api-key';

    // Mock rate limit to pass by default
    const { checkRateLimit } = require('@/lib/rateLimit');
    checkRateLimit.mockResolvedValue({ success: true, limit: 10, remaining: 9 });

    // Mock project verification to pass by default
    const { verifyProjectOwnership } = require('@/lib/api/project-verification');
    verifyProjectOwnership.mockResolvedValue({ hasAccess: true });
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
    delete process.env['COMET_API_KEY'];
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Epic orchestral music',
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when prompt is missing in non-custom mode', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          customMode: false,
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Prompt is required');
    });

    it('should return 400 when projectId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Epic music',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid projectId format', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'invalid-uuid',
          prompt: 'Epic music',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should return 400 when prompt is too short', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
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

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'a'.repeat(1001), // Exceeds 1000 chars
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should return 400 when style is missing in custom mode', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
          customMode: true,
          // style missing
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Style is required');
    });

    it('should return 400 when customMode is not a boolean', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
          customMode: 'yes', // Should be boolean
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('must be a boolean');
    });

    it('should return 400 when instrumental is not a boolean', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
          instrumental: 1, // Should be boolean
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should validate style length in custom mode', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
          customMode: true,
          style: 'a', // Too short (min 2)
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should validate title max length', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
          title: 'a'.repeat(101), // Exceeds 100 chars
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
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

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
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

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(403);
    });
  });

  describe('Success Cases - Non-Custom Mode', () => {
    it('should generate music in non-custom mode', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockResponse = {
        code: 200,
        msg: 'Success',
        data: {
          taskId: 'task-123-abc',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic orchestral music for a video game',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.taskId).toBe('task-123-abc');
      expect(data.message).toContain('started');
    });

    it('should call Suno API with correct parameters for non-custom mode', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockResponse = {
        code: 200,
        msg: 'Success',
        data: { taskId: 'task-123' },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Upbeat pop music',
        }),
      });

      await POST(mockRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.cometapi.com/suno/submit/music',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-comet-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const bodyJson = JSON.parse(callArgs[1].body);
      expect(bodyJson.mv).toBe('chirp-crow'); // Suno V5
      expect(bodyJson.gpt_description_prompt).toBe('Upbeat pop music');
      expect(bodyJson.custom_mode).toBeUndefined();
    });
  });

  describe('Success Cases - Custom Mode', () => {
    it('should generate music in custom mode with all parameters', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockResponse = {
        code: 200,
        msg: 'Success',
        data: { taskId: 'task-456-def' },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'A dramatic scene',
          customMode: true,
          style: 'orchestral, cinematic, epic',
          title: 'Epic Battle Theme',
          instrumental: true,
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.taskId).toBe('task-456-def');
    });

    it('should call Suno API with correct parameters for custom mode', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockResponse = {
        code: 200,
        msg: 'Success',
        data: { taskId: 'task-789' },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Background music',
          customMode: true,
          style: 'ambient, relaxing',
          title: 'Calm Background',
          instrumental: true,
        }),
      });

      await POST(mockRequest);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const bodyJson = JSON.parse(callArgs[1].body);
      expect(bodyJson.custom_mode).toBe(true);
      expect(bodyJson.tags).toBe('ambient, relaxing');
      expect(bodyJson.title).toBe('Calm Background');
      expect(bodyJson.make_instrumental).toBe(true);
    });

    it('should handle custom mode without optional title', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockResponse = {
        code: 200,
        msg: 'Success',
        data: { taskId: 'task-999' },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Background music',
          customMode: true,
          style: 'jazz',
          // no title
        }),
      });

      await POST(mockRequest);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const bodyJson = JSON.parse(callArgs[1].body);
      expect(bodyJson.title).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when API key is not configured', async () => {
      delete process.env['COMET_API_KEY'];
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('not configured');
    });

    it('should return error when Suno API fails', async () => {
      mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 402,
        text: jest.fn().mockResolvedValue('Payment Required'),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(402);
    });

    it('should handle API response with error code', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockResponse = {
        code: 400,
        msg: 'Invalid prompt format',
        data: null,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid prompt format');
    });

    it('should return 504 when API times out', async () => {
      mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock).mockImplementation(() => {
        const error = new Error('Request timeout');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(504);
      const data = await response.json();
      expect(data.error).toContain('timeout');
    });

    it('should return 500 for other fetch errors', async () => {
      mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(500);
    });

    it('should handle 429 rate limit from Comet API', async () => {
      mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('Rate limit exceeded'),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toContain('Rate limit exceeded');
    });

    it('should handle 401 invalid API key from Comet API', async () => {
      mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized - Invalid API key'),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Unauthorized');
    });

    it('should handle 403 forbidden from Comet API', async () => {
      mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        text: jest.fn().mockResolvedValue('Forbidden - Insufficient permissions'),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Forbidden');
    });

    it('should handle 503 service unavailable from Comet API', async () => {
      mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        text: jest.fn().mockResolvedValue('Service temporarily unavailable'),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toContain('Service temporarily unavailable');
    });

    it('should return 500 for malformed JSON response from Comet API', async () => {
      mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(500);
    });

    it('should handle external service returning error in success response', async () => {
      mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          code: 500,
          msg: 'Internal server error on Suno service',
          data: null,
        }),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Internal server error on Suno service');
    });
  });

  describe('Request Timeout', () => {
    it('should set a 60 second timeout for API requests', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockResponse = {
        code: 200,
        msg: 'Success',
        data: { taskId: 'task-123' },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
          prompt: 'Epic music',
        }),
      });

      await POST(mockRequest);

      // Verify fetch was called with signal
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[1].signal).toBeTruthy();
    });
  });
});
