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

  describe('Success Cases', () => {
    it('should generate images successfully', async () => {
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
  });
});
