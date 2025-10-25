/**
 * Tests for POST /api/video/upscale - Video Upscaling
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/video/upscale/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
  createMockAsset,
} from '@/__tests__/helpers/apiMocks';

// Mock withAuth wrapper
jest.mock(
  '@/lib/api/withAuth',
  () => ({
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
jest.mock('@/lib/supabase', () => {
  const { createMockSupabaseClient } = jest.requireActual('@/__tests__/helpers/apiMocks');
  const mockClient = createMockSupabaseClient();

  return {
    createServerSupabaseClient: jest.fn(async () => mockClient),
    __getMockClient: () => mockClient,
  };
});

jest.mock(
  '@/lib/serverLogger',
  () => ({
    serverLogger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  })
);

jest.mock(
  '@/lib/fetchWithTimeout',
  () => ({
    fetchWithTimeout: jest.fn(),
  })
);

jest.mock(
  '@/lib/rateLimit',
  () => ({
    checkRateLimit: jest.fn(),
    RATE_LIMITS: {
      tier2_resource_creation: { requests: 10, window: 60000 },
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
  '@/lib/api/project-verification',
  () => ({
    verifyAssetOwnership: jest.fn(),
  })
);

const { checkRateLimit } = require('@/lib/rateLimit');
const { verifyAssetOwnership } = require('@/lib/api/project-verification');
const { fetchWithTimeout } = require('@/lib/fetchWithTimeout');

describe('POST /api/video/upscale', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

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

    checkRateLimit.mockResolvedValue({ success: true, remaining: 9 });

    const mockAsset = createMockAsset({ type: 'video' });
    verifyAssetOwnership.mockResolvedValue({ hasAccess: true, asset: mockAsset });

    mockSupabase.storage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/video.mp4' },
    });

    process.env['FAL_API_KEY'] = 'test-fal-key';
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
    delete process.env['FAL_API_KEY'];
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/upscale', {
        method: 'POST',
        body: JSON.stringify({
          assetId: 'test-asset-id-valid',
          projectId: 'test-project-id-valid',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
    });
  });

  describe('Validation', () => {
    it('should return 400 for invalid assetId', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/upscale', {
        method: 'POST',
        body: JSON.stringify({
          assetId: 'invalid',
          projectId: 'test-project-id-valid',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid projectId', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/upscale', {
        method: 'POST',
        body: JSON.stringify({
          assetId: 'test-asset-id-valid',
          projectId: 'invalid',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
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

      const mockRequest = new NextRequest('http://localhost/api/video/upscale', {
        method: 'POST',
        body: JSON.stringify({
          assetId: 'test-asset-id-valid',
          projectId: 'test-project-id-valid',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(429);
    });
  });

  describe('Success Cases', () => {
    it('should submit upscale request successfully', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { fetchWithTimeout } = require('@/lib/fetchWithTimeout');
      fetchWithTimeout.mockResolvedValue({
        ok: true,
        json: async () => ({ request_id: 'upscale-request-123' }),
      });

      const mockRequest = new NextRequest('http://localhost/api/video/upscale', {
        method: 'POST',
        body: JSON.stringify({
          assetId: 'test-asset-id-valid',
          projectId: 'test-project-id-valid',
          upscaleFactor: 2,
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.requestId).toBe('upscale-request-123');
      expect(data.message).toContain('successfully');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when FAL_API_KEY is not configured', async () => {
      delete process.env['FAL_API_KEY'];
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/video/upscale', {
        method: 'POST',
        body: JSON.stringify({
          assetId: 'test-asset-id-valid',
          projectId: 'test-project-id-valid',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
    });

    it('should handle FAL API errors', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { fetchWithTimeout } = require('@/lib/fetchWithTimeout');
      fetchWithTimeout.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'FAL API error',
      });

      const mockRequest = new NextRequest('http://localhost/api/video/upscale', {
        method: 'POST',
        body: JSON.stringify({
          assetId: 'test-asset-id-valid',
          projectId: 'test-project-id-valid',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
    });

    it('should handle timeout errors', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { fetchWithTimeout } = require('@/lib/fetchWithTimeout');
      fetchWithTimeout.mockRejectedValue(new Error('Request timeout'));

      const mockRequest = new NextRequest('http://localhost/api/video/upscale', {
        method: 'POST',
        body: JSON.stringify({
          assetId: 'test-asset-id-valid',
          projectId: 'test-project-id-valid',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(504);
    });
  });
});
