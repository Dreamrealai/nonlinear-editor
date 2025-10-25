/**
 * Tests for POST /api/video/generate - Video Generation
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/video/generate/route';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockProject,
  createMockAsset,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockQuerySuccess,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

// Mock withAuth wrapper
jest.mock(
  '@/lib/api/withAuth',
  (): Record<string, unknown> => ({
    withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
      const { createServerSupabaseClient } = require('@/lib/supabase');
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      return handler(req, { user, supabase, params: context?.params || {} });
    }),
  })
);

// Mock modules
jest.mock('@/lib/supabase', () => {
  const { createMockSupabaseClient } = jest.requireActual('@/__tests__/helpers/apiMocks');
  const mockClient = createMockSupabaseClient();

  return {
    createServerSupabaseClient: jest.fn(async () => mockClient),
    ensureHttpsProtocol: jest.fn((url) => url),
    __getMockClient: (): typeof mockClient => mockClient,
  };
});

jest.mock(
  '@/lib/veo',
  (): Record<string, unknown> => ({
    generateVideo: jest.fn(),
  })
);

jest.mock(
  '@/lib/fal-video',
  (): Record<string, unknown> => ({
    generateFalVideo: jest.fn(),
  })
);

jest.mock(
  '@/lib/rateLimit',
  (): Record<string, unknown> => ({
    checkRateLimit: jest.fn(),
    RATE_LIMITS: {
      tier2_resource_creation: { max: 10, windowMs: 60000 },
      tier3_status_read: { max: 30, windowMs: 60000 },
      tier4_general: { max: 60, windowMs: 60000 },
    },
  })
);

jest.mock(
  '@/lib/serverLogger',
  (): Record<string, unknown> => ({
    serverLogger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  })
);

// Mock API response helpers - use actual implementation, only mock wrapper
jest.mock('@/lib/api/response', () => {
  const actual = jest.requireActual('@/lib/api/response');
  return {
    ...actual,
    withErrorHandling: jest.fn((handler) => handler),
  };
});
jest.mock(
  '@/lib/api/validation',
  (): Record<string, unknown> => ({
    validateString: jest.fn((_value: unknown) => ({ valid: true })),
    validateUUID: jest.fn((_value: unknown) => ({ valid: true })),
    validateAspectRatio: jest.fn((_value: unknown) => ({ valid: true })),
    validateDuration: jest.fn((_value: unknown) => ({ valid: true })),
    validateSeed: jest.fn((_value: unknown) => ({ valid: true })),
    validateSampleCount: jest.fn((_value: unknown) => ({ valid: true })),
    validateAll: jest.fn(() => ({ valid: true, errors: [] })),
  })
);

jest.mock(
  '@/lib/api/project-verification',
  (): Record<string, unknown> => ({
    verifyProjectOwnership: jest.fn(),
    verifyAssetOwnership: jest.fn(),
  })
);

const { checkRateLimit, RATE_LIMITS } = require('@/lib/rateLimit');
const { verifyProjectOwnership, verifyAssetOwnership } = require('@/lib/api/project-verification');
const { generateVideo } = require('@/lib/veo');
const { generateFalVideo } = require('@/lib/fal-video');
const { validateAll } = require('@/lib/api/validation');

describe('POST /api/video/generate', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;

  beforeEach((): void => {
    jest.clearAllMocks();

    // IMPORTANT: Re-setup Supabase mock after clearAllMocks
    const { __getMockClient, createServerSupabaseClient } = require('@/lib/supabase');
    mockSupabase = __getMockClient();
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Setup default auth mock (needs to be reset after clearAllMocks)
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    });

    checkRateLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      resetAt: Date.now() + 60000,
    });
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'test prompt',
          projectId: 'test-project-id',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { checkRateLimit } = require('@/lib/rateLimit');
      checkRateLimit.mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        resetAt: Date.now() + 60000,
      });

      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'test prompt',
          projectId: 'test-project-id',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(429);
    });

    it('should apply expensive rate limit for video generation', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { checkRateLimit, RATE_LIMITS } = require('@/lib/rateLimit');
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({ hasAccess: true });

      const { generateVideo } = require('@/lib/veo');
      generateVideo.mockResolvedValue({ name: 'operation-123' });

      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'test prompt',
          projectId: 'test-project-id',
          model: 'veo-3.1-generate-preview',
        }),
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(checkRateLimit).toHaveBeenCalledWith(
        `video-gen:${mockUser.id}`,
        RATE_LIMITS.tier2_resource_creation
      );
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when validation fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { validateAll } = require('@/lib/api/validation');
      validateAll.mockReturnValue({
        valid: false,
        errors: [{ field: 'prompt', message: 'Prompt is required' }],
      });

      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '',
          projectId: 'test-project-id',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });

    it('should validate all required fields', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { validateAll, validateString, validateUUID } = require('@/lib/api/validation');
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({ hasAccess: true });

      const { generateVideo } = require('@/lib/veo');
      generateVideo.mockResolvedValue({ name: 'operation-123' });

      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'test prompt',
          projectId: 'test-project-id',
          model: 'veo-3.1-generate-preview',
          aspectRatio: '16:9',
          duration: 5,
        }),
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(validateAll).toHaveBeenCalled();
    });
  });

  describe('Project Ownership Verification', () => {
    it('should return 404 when project not found', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({
        hasAccess: false,
        error: 'Project not found',
        status: 404,
      });

      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'test prompt',
          projectId: 'nonexistent-project',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(404);
    });

    it('should return 403 when user does not own project', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({
        hasAccess: false,
        error: 'Access denied',
        status: 403,
      });

      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'test prompt',
          projectId: 'other-users-project',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(403);
    });
  });

  describe('Video Generation - Google Veo', () => {
    it('should generate video with Veo for Google models', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({ hasAccess: true });

      const { generateVideo } = require('@/lib/veo');
      generateVideo.mockResolvedValue({ name: 'operations/veo-123' });

      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful sunset',
          projectId: 'test-project-id',
          model: 'veo-3.1-generate-preview',
          aspectRatio: '16:9',
          duration: 5,
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.operationName).toBe('operations/veo-123');
      expect(data.status).toBe('processing');
      expect(generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'A beautiful sunset',
          model: 'veo-3.1-generate-preview',
          aspectRatio: '16:9',
          duration: 5,
        })
      );
    });

    it('should pass all Veo parameters correctly', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({ hasAccess: true });

      const { generateVideo } = require('@/lib/veo');
      generateVideo.mockResolvedValue({ name: 'operations/veo-123' });

      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test video',
          projectId: 'test-project-id',
          model: 'veo-3.1-generate-preview',
          aspectRatio: '16:9',
          duration: 5,
          resolution: '1080p',
          negativePrompt: 'blurry, low quality',
          personGeneration: true,
          enhancePrompt: true,
          generateAudio: true,
          seed: 12345,
          sampleCount: 2,
          compressionQuality: 'high',
        }),
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Test video',
          model: 'veo-3.1-generate-preview',
          negativePrompt: 'blurry, low quality',
          personGeneration: true,
          enhancePrompt: true,
          generateAudio: true,
          seed: 12345,
          sampleCount: 2,
          compressionQuality: 'high',
        })
      );
    });
  });

  describe('Video Generation - FAL Models', () => {
    it('should use FAL for Seedance model', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({ hasAccess: true });

      const { generateFalVideo } = require('@/lib/fal-video');
      generateFalVideo.mockResolvedValue({
        endpoint: 'seedance-1.0-pro',
        requestId: 'fal-request-123',
      });

      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Dancing scene',
          projectId: 'test-project-id',
          model: 'seedance-1.0-pro',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.operationName).toBe('fal:seedance-1.0-pro:fal-request-123');
      expect(generateFalVideo).toHaveBeenCalled();
    });

    it('should use FAL for MiniMax model', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({ hasAccess: true });

      const { generateFalVideo } = require('@/lib/fal-video');
      generateFalVideo.mockResolvedValue({
        endpoint: 'minimax-hailuo-02-pro',
        requestId: 'fal-request-456',
      });

      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test video',
          projectId: 'test-project-id',
          model: 'minimax-hailuo-02-pro',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.operationName).toContain('minimax-hailuo-02-pro');
    });
  });

  describe('Image-to-Video Generation', () => {
    it('should generate video from image asset', async () => {
      mockAuthenticatedUser(mockSupabase);
      const {
        verifyProjectOwnership,
        verifyAssetOwnership,
      } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({ hasAccess: true });

      const mockAsset = createMockAsset({
        id: 'image-asset-id',
        type: 'image',
        storage_url: 'supabase://assets/user-id/project-id/image/test.jpg',
      });
      verifyAssetOwnership.mockResolvedValue({
        hasAccess: true,
        asset: mockAsset,
      });

      mockSupabase.storage.from.mockReturnThis();
      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' },
      });

      const { generateVideo } = require('@/lib/veo');
      generateVideo.mockResolvedValue({ name: 'operations/veo-123' });

      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Animate this image',
          projectId: 'test-project-id',
          model: 'veo-3.1-generate-preview',
          imageAssetId: 'image-asset-id',
        }),
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(verifyAssetOwnership).toHaveBeenCalledWith(
        mockSupabase,
        'image-asset-id',
        expect.any(String)
      );
      expect(generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: 'https://example.com/test.jpg',
        })
      );
    });

    it('should return 404 when image asset not found', async () => {
      mockAuthenticatedUser(mockSupabase);
      const {
        verifyProjectOwnership,
        verifyAssetOwnership,
      } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({ hasAccess: true });
      verifyAssetOwnership.mockResolvedValue({
        hasAccess: false,
        error: 'Asset not found',
        status: 404,
      });

      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Animate this image',
          projectId: 'test-project-id',
          imageAssetId: 'nonexistent-asset',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(404);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when video generation fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({ hasAccess: true });

      const { generateVideo } = require('@/lib/veo');
      generateVideo.mockRejectedValue(new Error('API error'));

      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'test prompt',
          projectId: 'test-project-id',
          model: 'veo-3.1-generate-preview',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('API error');
    });

    it('should handle malformed JSON body', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid JSON body');
    });
  });

  describe('Response Format', () => {
    it('should return operationName and status', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({ hasAccess: true });

      const { generateVideo } = require('@/lib/veo');
      generateVideo.mockResolvedValue({ name: 'operations/test-123' });

      mockRequest = new NextRequest('http://localhost/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'test prompt',
          projectId: 'test-project-id',
          model: 'veo-3.1-generate-preview',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data).toHaveProperty('operationName');
      expect(data).toHaveProperty('status', 'processing');
      expect(data).toHaveProperty('message');
    });
  });
});
