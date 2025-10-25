/**
 * Tests for POST /api/image/generate - Image Generation
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/image/generate/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
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

// Mock dependencies
jest.mock(
  '@/lib/supabase',
  (): Record<string, unknown> => ({
    createServerSupabaseClient: jest.fn(),
    ensureHttpsProtocol: jest.fn((url) => url),
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

jest.mock(
  '@/lib/imagen',
  (): Record<string, unknown> => ({
    generateImage: jest.fn(),
  })
);

jest.mock(
  '@/lib/rateLimit',
  (): Record<string, unknown> => ({
    checkRateLimit: jest.fn(),
    RATE_LIMITS: {
      tier2_resource_creation: { requests: 10, window: 60000 },
    },
  })
);

jest.mock('@/lib/api/response', () => {
  const actual = jest.requireActual('@/lib/api/response');
  return {
    ...actual,
    withErrorHandling: jest.fn((handler) => handler),
  };
});

jest.mock(
  '@/lib/api/project-verification',
  (): Record<string, unknown> => ({
    verifyProjectOwnership: jest.fn(),
  })
);

describe('POST /api/image/generate', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach((): void => {
    jest.clearAllMocks();

    // IMPORTANT: Re-setup Supabase mock after clearAllMocks
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    const { checkRateLimit } = require('@/lib/rateLimit');
    checkRateLimit.mockResolvedValue({ success: true, remaining: 9 });

    const { verifyProjectOwnership } = require('@/lib/api/project-verification');
    verifyProjectOwnership.mockResolvedValue({ hasAccess: true });

    mockSupabase.storage.upload.mockResolvedValue({ data: { path: 'test-path' }, error: null });
    mockSupabase.storage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/image.png' },
    });
    mockSupabase.single.mockResolvedValue({
      data: { id: 'asset-123', type: 'image' },
      error: null,
    });
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful sunset',
          projectId: 'test-project-id-valid',
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
        limit: 10,
        remaining: 0,
        resetAt: Date.now() + 60000,
      });

      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful sunset',
          projectId: 'test-project-id-valid',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(429);
    });
  });

  describe('Validation', () => {
    it('should validate prompt minimum length', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'ab', // Too short (min 3)
          projectId: 'test-project-id-valid',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('prompt');
    });

    it('should validate prompt maximum length', async () => {
      mockAuthenticatedUser(mockSupabase);
      const longPrompt = 'a'.repeat(1001); // Exceeds max 1000
      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: longPrompt,
          projectId: 'test-project-id-valid',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });

    it('should validate projectId is UUID', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful sunset',
          projectId: 'invalid-uuid',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('projectId');
    });

    it('should validate aspectRatio values', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful sunset',
          projectId: 'test-project-id-valid',
          aspectRatio: '21:9', // Invalid ratio
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('aspectRatio');
    });

    it('should validate sampleCount range (1-8)', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful sunset',
          projectId: 'test-project-id-valid',
          sampleCount: 10, // Exceeds max 8
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('sampleCount');
    });

    it('should validate negative prompt length', async () => {
      mockAuthenticatedUser(mockSupabase);
      const longNegativePrompt = 'a'.repeat(1001);
      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful sunset',
          projectId: 'test-project-id-valid',
          negativePrompt: longNegativePrompt,
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });

    it('should validate seed range', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful sunset',
          projectId: 'test-project-id-valid',
          seed: 3000000000, // Exceeds max
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });
  });

  describe('Project Ownership', () => {
    it('should verify user owns the project', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({
        hasAccess: false,
        error: 'Project not found or access denied',
        status: 403,
      });

      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful sunset',
          projectId: 'test-project-id-valid',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle image generation API errors', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { generateImage } = require('@/lib/imagen');
      generateImage.mockRejectedValue(new Error('Imagen API error'));

      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful sunset',
          projectId: 'test-project-id-valid',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(500);
    });

    it('should handle storage upload errors', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { generateImage } = require('@/lib/imagen');
      generateImage.mockResolvedValue({
        predictions: [
          {
            bytesBase64Encoded: Buffer.from('test-image-data').toString('base64'),
            mimeType: 'image/png',
          },
        ],
      });

      mockSupabase.storage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });

      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful sunset',
          projectId: 'test-project-id-valid',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(200);
      const data = await response.json();
      // Should skip failed uploads
      expect(data.assets).toHaveLength(0);
    });

    it('should handle database asset creation errors', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { generateImage } = require('@/lib/imagen');
      generateImage.mockResolvedValue({
        predictions: [
          {
            bytesBase64Encoded: Buffer.from('test-image-data').toString('base64'),
            mimeType: 'image/png',
          },
        ],
      });

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful sunset',
          projectId: 'test-project-id-valid',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(200);
      const data = await response.json();
      // Should skip failed database inserts
      expect(data.assets).toHaveLength(0);
    });
  });

  describe('Success Cases', () => {
    it('should generate single image successfully', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { generateImage } = require('@/lib/imagen');
      generateImage.mockResolvedValue({
        predictions: [
          {
            bytesBase64Encoded: Buffer.from('test-image-data').toString('base64'),
            mimeType: 'image/png',
          },
        ],
      });

      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful sunset over mountains',
          projectId: 'test-project-id-valid',
          aspectRatio: '16:9',
          sampleCount: 1,
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.assets).toHaveLength(1);
      expect(data.message).toContain('Generated 1 image(s) successfully');
    });

    it('should generate multiple images', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { generateImage } = require('@/lib/imagen');
      generateImage.mockResolvedValue({
        predictions: [
          {
            bytesBase64Encoded: Buffer.from('test-image-1').toString('base64'),
            mimeType: 'image/png',
          },
          {
            bytesBase64Encoded: Buffer.from('test-image-2').toString('base64'),
            mimeType: 'image/png',
          },
          {
            bytesBase64Encoded: Buffer.from('test-image-3').toString('base64'),
            mimeType: 'image/png',
          },
        ],
      });

      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful sunset',
          projectId: 'test-project-id-valid',
          sampleCount: 3,
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.assets).toHaveLength(3);
      expect(data.message).toContain('Generated 3 image(s) successfully');
    });

    it('should handle JPEG output format', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { generateImage } = require('@/lib/imagen');
      generateImage.mockResolvedValue({
        predictions: [
          {
            bytesBase64Encoded: Buffer.from('test-jpeg-data').toString('base64'),
            mimeType: 'image/jpeg',
          },
        ],
      });

      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful sunset',
          projectId: 'test-project-id-valid',
          outputMimeType: 'image/jpeg',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.assets[0].metadata.mimeType).toBe('image/jpeg');
    });

    it('should include all metadata in asset', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { generateImage } = require('@/lib/imagen');
      generateImage.mockResolvedValue({
        predictions: [
          {
            bytesBase64Encoded: Buffer.from('test-image-data').toString('base64'),
            mimeType: 'image/png',
          },
        ],
      });

      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A photorealistic cat',
          negativePrompt: 'blurry, low quality',
          projectId: 'test-project-id-valid',
          aspectRatio: '1:1',
          seed: 12345,
          model: 'imagen-3.0-fast-001',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data.assets[0].metadata).toEqual(
        expect.objectContaining({
          provider: 'imagen',
          model: 'imagen-3.0-fast-001',
          prompt: 'A photorealistic cat',
          negativePrompt: 'blurry, low quality',
          aspectRatio: '1:1',
          seed: 12345,
        })
      );
    });

    it('should accept all optional parameters', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { generateImage } = require('@/lib/imagen');
      generateImage.mockResolvedValue({
        predictions: [
          {
            bytesBase64Encoded: Buffer.from('test-image-data').toString('base64'),
            mimeType: 'image/png',
          },
        ],
      });

      const mockRequest = new NextRequest('http://localhost/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A beautiful landscape',
          projectId: 'test-project-id-valid',
          model: 'imagen-3.0-generate-001',
          aspectRatio: '4:3',
          negativePrompt: 'people, cars',
          sampleCount: 2,
          seed: 42,
          safetyFilterLevel: 'block_some',
          personGeneration: 'dont_allow',
          addWatermark: true,
          language: 'en',
          outputMimeType: 'image/png',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(200);
      expect(generateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'A beautiful landscape',
          model: 'imagen-3.0-generate-001',
          aspectRatio: '4:3',
          negativePrompt: 'people, cars',
          sampleCount: 2,
          seed: 42,
          safetyFilterLevel: 'block_some',
          personGeneration: 'dont_allow',
          addWatermark: true,
          language: 'en',
          outputMimeType: 'image/png',
        })
      );
    });
  });
});
