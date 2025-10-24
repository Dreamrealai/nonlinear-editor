/**
 * Tests for POST /api/video/split-scenes - Scene Detection with Google Video Intelligence
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/video/split-scenes/route';
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

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/api/response', () => {
  const actual = jest.requireActual('@/lib/api/response');
  return {
    ...actual,
    withErrorHandling: jest.fn((handler) => handler),
  };
});

// Mock Google Cloud libraries
jest.mock('@google-cloud/video-intelligence', () => ({
  VideoIntelligenceServiceClient: jest.fn(() => ({
    annotateVideo: jest.fn(),
  })),
  protos: {
    google: {
      cloud: {
        videointelligence: {
          v1: {
            Feature: {
              SHOT_CHANGE_DETECTION: 1,
            },
          },
        },
      },
    },
  },
}));

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      exists: jest.fn().mockResolvedValue([true]),
      file: jest.fn(() => ({
        save: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      })),
    })),
  })),
}));

global.fetch = jest.fn();

describe('POST /api/video/split-scenes', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validAssetId = '550e8400-e29b-41d4-a716-446655440001';
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    process.env['GOOGLE_SERVICE_ACCOUNT'] = JSON.stringify({
      project_id: 'test-project',
      client_email: 'test@test.iam.gserviceaccount.com',
      private_key: 'test-key',
    });
    process.env['GCS_BUCKET_NAME'] = 'test-bucket';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(1024),
    });
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
    delete process.env['GOOGLE_SERVICE_ACCOUNT'];
    delete process.env['GCS_BUCKET_NAME'];
    jest.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/split-scenes', {
        method: 'POST',
        body: JSON.stringify({ assetId: validAssetId, projectId: validProjectId }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when assetId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/split-scenes', {
        method: 'POST',
        body: JSON.stringify({ projectId: validProjectId }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
    });

    it('should return 400 when projectId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/split-scenes', {
        method: 'POST',
        body: JSON.stringify({ assetId: validAssetId }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid assetId UUID format', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/split-scenes', {
        method: 'POST',
        body: JSON.stringify({ assetId: 'invalid-uuid', projectId: validProjectId }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid projectId UUID format', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/split-scenes', {
        method: 'POST',
        body: JSON.stringify({ assetId: validAssetId, projectId: 'invalid-uuid' }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
    });
  });

  describe('Configuration Validation', () => {
    it('should return 503 when GOOGLE_SERVICE_ACCOUNT is not configured', async () => {
      delete process.env['GOOGLE_SERVICE_ACCOUNT'];
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          type: 'video',
          user_id: mockUser.id,
          storage_url: 'test://video.mp4',
        },
        error: null,
      });

      mockSupabase.storage.from.mockReturnValue({
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed-url.com' },
          error: null,
        }),
      });

      const mockRequest = new NextRequest('http://localhost/api/video/split-scenes', {
        method: 'POST',
        body: JSON.stringify({ assetId: validAssetId, projectId: validProjectId }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toContain('unavailable');
    });

    it('should return 503 when GCS_BUCKET_NAME is not configured', async () => {
      delete process.env['GCS_BUCKET_NAME'];
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          type: 'video',
          user_id: mockUser.id,
          storage_url: 'test://video.mp4',
        },
        error: null,
      });

      mockSupabase.storage.from.mockReturnValue({
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed-url.com' },
          error: null,
        }),
      });

      const mockRequest = new NextRequest('http://localhost/api/video/split-scenes', {
        method: 'POST',
        body: JSON.stringify({ assetId: validAssetId, projectId: validProjectId }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toContain('GCS bucket');
    });

    it('should return 503 when GCS bucket does not exist', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          type: 'video',
          user_id: mockUser.id,
          storage_url: 'test://video.mp4',
        },
        error: null,
      });

      mockSupabase.storage.from.mockReturnValue({
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed-url.com' },
          error: null,
        }),
      });

      const { Storage } = require('@google-cloud/storage');
      Storage.mockImplementation(() => ({
        bucket: jest.fn(() => ({
          exists: jest.fn().mockResolvedValue([false]),
        })),
      }));

      const mockRequest = new NextRequest('http://localhost/api/video/split-scenes', {
        method: 'POST',
        body: JSON.stringify({ assetId: validAssetId, projectId: validProjectId }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(503);
    });
  });

  describe('Asset Verification', () => {
    it('should return 403 when asset not found', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const mockRequest = new NextRequest('http://localhost/api/video/split-scenes', {
        method: 'POST',
        body: JSON.stringify({ assetId: validAssetId, projectId: validProjectId }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(403);
    });

    it('should return 400 when asset type is not video', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: { id: validAssetId, type: 'image', user_id: mockUser.id },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/video/split-scenes', {
        method: 'POST',
        body: JSON.stringify({ assetId: validAssetId, projectId: validProjectId }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
    });
  });

  describe('Existing Scenes', () => {
    it('should return existing scenes if already detected', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: { id: validAssetId, type: 'video', user_id: mockUser.id },
        error: null,
      });

      mockSupabase.select.mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [
            { id: 'scene-1', start_ms: 0, end_ms: 1000 },
            { id: 'scene-2', start_ms: 1000, end_ms: 2000 },
          ],
          error: null,
        }),
      });

      const mockRequest = new NextRequest('http://localhost/api/video/split-scenes', {
        method: 'POST',
        body: JSON.stringify({ assetId: validAssetId, projectId: validProjectId }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain('already detected');
      expect(data.count).toBe(2);
    });
  });

  describe('Success Cases', () => {
    it('should successfully detect scenes', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      // Mock asset query
      let selectCallCount = 0;
      mockSupabase.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call - existing scenes check
          return {
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        // Subsequent calls - scene inserts
        return mockSupabase;
      });

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validAssetId,
            type: 'video',
            user_id: mockUser.id,
            storage_url: 'supabase://assets/video.mp4',
          },
          error: null,
        })
        .mockResolvedValue({
          data: { id: 'scene-1', start_ms: 0, end_ms: 1000 },
          error: null,
        });

      mockSupabase.storage.from.mockReturnValue({
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed-url.com/video.mp4' },
          error: null,
        }),
      });

      const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');
      const mockAnnotateVideo = jest.fn().mockResolvedValue([
        {
          promise: jest.fn().mockResolvedValue([
            {
              annotationResults: [
                {
                  shotAnnotations: [
                    {
                      startTimeOffset: { seconds: 0, nanos: 0 },
                      endTimeOffset: { seconds: 1, nanos: 0 },
                    },
                    {
                      startTimeOffset: { seconds: 1, nanos: 0 },
                      endTimeOffset: { seconds: 2, nanos: 0 },
                    },
                  ],
                },
              ],
            },
          ]),
        },
      ]);
      VideoIntelligenceServiceClient.mockImplementation(() => ({
        annotateVideo: mockAnnotateVideo,
      }));

      const mockRequest = new NextRequest('http://localhost/api/video/split-scenes', {
        method: 'POST',
        body: JSON.stringify({ assetId: validAssetId, projectId: validProjectId }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.count).toBeGreaterThan(0);
    });
  });
});
