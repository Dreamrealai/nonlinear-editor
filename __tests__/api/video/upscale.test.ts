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
} from '@/test-utils/mockSupabase';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/fetchWithTimeout', () => ({
  fetchWithTimeout: jest.fn(),
}));

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn(),
  RATE_LIMITS: {
    tier2_resource_creation: { requests: 10, window: 60000 },
  },
}));

jest.mock('@/lib/api/response', () => ({
  errorResponse: jest.fn((msg, status) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json' } })
  ),
  unauthorizedResponse: jest.fn(() =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  ),
  validationError: jest.fn((msg) =>
    new Response(JSON.stringify({ error: msg }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  ),
  internalServerError: jest.fn((msg) =>
    new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  ),
  withErrorHandling: jest.fn((handler) => handler),
}));

jest.mock('@/lib/api/project-verification', () => ({
  verifyAssetOwnership: jest.fn(),
}));

describe('POST /api/video/upscale', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    const { checkRateLimit } = require('@/lib/rateLimit');
    checkRateLimit.mockResolvedValue({ success: true, remaining: 9 });

    const { verifyAssetOwnership } = require('@/lib/api/project-verification');
    const mockAsset = createMockAsset({ type: 'video' });
    verifyAssetOwnership.mockResolvedValue({ hasAccess: true, asset: mockAsset });

    mockSupabase.storage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/video.mp4' },
    });

    process.env['FAL_API_KEY'] = 'test-fal-key';
    jest.clearAllMocks();
  });

  afterEach(() => {
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

      const response = await POST(mockRequest);

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

      const response = await POST(mockRequest);

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

      const response = await POST(mockRequest);

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
        resetAt: Date.now() + 60000
      });

      const mockRequest = new NextRequest('http://localhost/api/video/upscale', {
        method: 'POST',
        body: JSON.stringify({
          assetId: 'test-asset-id-valid',
          projectId: 'test-project-id-valid',
        }),
      });

      const response = await POST(mockRequest);

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

      const response = await POST(mockRequest);

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

      const response = await POST(mockRequest);

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

      const response = await POST(mockRequest);

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

      const response = await POST(mockRequest);

      expect(response.status).toBe(504);
    });
  });
});
