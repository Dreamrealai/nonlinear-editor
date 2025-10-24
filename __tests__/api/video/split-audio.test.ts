/**
 * Tests for POST /api/video/split-audio - Extract Audio from Video
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/video/split-audio/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

// Mock withAuth wrapper
jest.mock('@/lib/api/withAuth', () => ({
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

jest.mock('@/lib/api/response', () => {
  const actual = jest.requireActual('@/lib/api/response');
  return {
    ...actual,
    withErrorHandling: jest.fn((handler) => handler),
  };
});

describe('POST /api/video/split-audio', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validAssetId = '550e8400-e29b-41d4-a716-446655440001';
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/split-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when auth error occurs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' },
      });

      const mockRequest = new NextRequest('http://localhost/api/video/split-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when assetId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/split-audio', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Asset ID');
    });

    it('should return 400 when projectId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/split-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Project ID');
    });

    it('should return 400 when both fields are missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/split-audio', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
    });
  });

  describe('Asset Verification', () => {
    it('should return 403 when asset not found', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const mockRequest = new NextRequest('http://localhost/api/video/split-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('not found');
    });

    it('should verify asset belongs to authenticated user', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          type: 'video',
          storage_url: 'supabase://assets/video.mp4',
          user_id: mockUser.id,
        },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/video/split-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      await POST(mockRequest);

      // Verify the query includes user_id check
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should return 400 when asset type is not video', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          type: 'image',
          user_id: mockUser.id,
        },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/video/split-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('video');
    });
  });

  describe('Storage Download', () => {
    it('should handle storage download errors', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          type: 'video',
          storage_url: 'supabase://assets/video.mp4',
          user_id: mockUser.id,
        },
        error: null,
      });

      mockSupabase.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Download failed' },
        }),
      });

      const mockRequest = new NextRequest('http://localhost/api/video/split-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('download video');
    });
  });

  describe('Success Cases', () => {
    it('should return client-side processing recommendation', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          type: 'video',
          storage_url: 'supabase://assets/video.mp4',
          metadata: { sourceUrl: 'https://example.com/video.mp4' },
          user_id: mockUser.id,
        },
        error: null,
      });

      mockSupabase.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: new Blob(['video data']),
          error: null,
        }),
      });

      const mockRequest = new NextRequest('http://localhost/api/video/split-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBeDefined();
      expect(data.recommendation).toBeDefined();
      expect(data.assetId).toBe(validAssetId);
    });

    it('should include video URL in response', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const sourceUrl = 'https://example.com/video.mp4';
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          type: 'video',
          storage_url: 'supabase://assets/video.mp4',
          metadata: { sourceUrl },
          user_id: mockUser.id,
        },
        error: null,
      });

      mockSupabase.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: new Blob(['video data']),
          error: null,
        }),
      });

      const mockRequest = new NextRequest('http://localhost/api/video/split-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();
      expect(data.videoUrl).toBe(sourceUrl);
    });

    it('should fallback to storage_url when sourceUrl not in metadata', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const storageUrl = 'supabase://assets/video.mp4';
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          type: 'video',
          storage_url: storageUrl,
          metadata: {},
          user_id: mockUser.id,
        },
        error: null,
      });

      mockSupabase.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: new Blob(['video data']),
          error: null,
        }),
      });

      const mockRequest = new NextRequest('http://localhost/api/video/split-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();
      expect(data.videoUrl).toBe(storageUrl);
    });
  });

  describe('Logging', () => {
    it('should log processing events', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { serverLogger } = require('@/lib/serverLogger');
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          type: 'video',
          storage_url: 'supabase://assets/video.mp4',
          user_id: mockUser.id,
        },
        error: null,
      });

      mockSupabase.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: new Blob(['video data']),
          error: null,
        }),
      });

      const mockRequest = new NextRequest('http://localhost/api/video/split-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      await POST(mockRequest);

      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'split_audio.processing',
          userId: mockUser.id,
          assetId: validAssetId,
          projectId: validProjectId,
        }),
        expect.any(String)
      );
    });

    it('should log warnings for missing fields', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { serverLogger } = require('@/lib/serverLogger');

      const mockRequest = new NextRequest('http://localhost/api/video/split-audio', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
        }),
      });

      await POST(mockRequest);

      expect(serverLogger.warn).toHaveBeenCalled();
    });

    it('should log errors for asset not found', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { serverLogger } = require('@/lib/serverLogger');
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const mockRequest = new NextRequest('http://localhost/api/video/split-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      await POST(mockRequest);

      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'split_audio.asset_not_found',
        }),
        expect.any(String)
      );
    });
  });
});
