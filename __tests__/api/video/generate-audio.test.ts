/**
 * Tests for POST /api/video/generate-audio - Video to Audio Generation
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/video/generate-audio/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
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
jest.mock(
  '@/lib/supabase',
  () => ({
    createServerSupabaseClient: jest.fn(),
  })
);

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

jest.mock('@/lib/api/response', () => {
  const actual = jest.requireActual('@/lib/api/response');
  return {
    ...actual,
    withErrorHandling: jest.fn((handler) => handler),
  };
});

// Mock global fetch
global.fetch = jest.fn();

describe('POST /api/video/generate-audio', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validAssetId = '550e8400-e29b-41d4-a716-446655440001';
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Set FAL_API_KEY by default
    process.env['FAL_API_KEY'] = 'test-fal-api-key';

    // Mock successful fetch by default
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ request_id: 'test-request-id' }),
      text: async () => 'Success',
    });
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
    delete process.env['FAL_API_KEY'];
    jest.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
          model: 'minimax',
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

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
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

  describe('Input Validation - Required Fields', () => {
    it('should return 400 when assetId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('assetId');
    });

    it('should return 400 when projectId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('projectId');
    });

    it('should return 400 when both assetId and projectId are missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
    });
  });

  describe('Model Validation', () => {
    it('should return 400 for invalid model', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
          model: 'invalid-model',
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid model');
    });

    it('should accept minimax model', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validAssetId,
            url: 'https://example.com/video.mp4',
            storage_url: null,
            user_id: mockUser.id,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'job-123' },
          error: null,
        });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
          model: 'minimax',
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
    });

    it('should accept mureka-1.5 model', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validAssetId,
            url: 'https://example.com/video.mp4',
            user_id: mockUser.id,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'job-123' },
          error: null,
        });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
          model: 'mureka-1.5',
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
    });

    it('should accept kling-turbo-2.5 model', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validAssetId,
            url: 'https://example.com/video.mp4',
            user_id: mockUser.id,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'job-123' },
          error: null,
        });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
          model: 'kling-turbo-2.5',
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
    });

    it('should default to minimax model when not specified', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validAssetId,
            url: 'https://example.com/video.mp4',
            user_id: mockUser.id,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'job-123' },
          error: null,
        });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.model).toBe('minimax');
    });
  });

  describe('Asset Verification', () => {
    it('should return 404 when asset not found', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Asset not found');
    });

    it('should verify asset belongs to user', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          url: 'https://example.com/video.mp4',
          user_id: mockUser.id,
        },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      await POST(mockRequest);

      // Verify the query includes user_id filter
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });
  });

  describe('API Key Configuration', () => {
    it('should return 500 when FAL_API_KEY is not configured', async () => {
      delete process.env['FAL_API_KEY'];
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          url: 'https://example.com/video.mp4',
          user_id: mockUser.id,
        },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('FAL_API_KEY');
    });
  });

  describe('Storage URL Handling', () => {
    it('should convert storage URL to public URL', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validAssetId,
            url: null,
            storage_url: 'supabase://assets/user123/project456/video.mp4',
            user_id: mockUser.id,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'job-123' },
          error: null,
        });

      mockSupabase.storage.from.mockReturnValue({
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/public-video.mp4' },
        }),
      });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
    });

    it('should return 500 when video URL cannot be obtained', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          url: null,
          storage_url: null,
          user_id: mockUser.id,
        },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('video URL');
    });
  });

  describe('FAL.ai API Integration', () => {
    it('should call FAL.ai API with correct parameters', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validAssetId,
            url: 'https://example.com/video.mp4',
            user_id: mockUser.id,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'job-123' },
          error: null,
        });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
          model: 'minimax',
          prompt: 'Generate dramatic music',
        }),
      });

      await POST(mockRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://queue.fal.run/fal-ai/minimax/video-to-audio',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Key test-fal-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle FAL.ai API errors', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          url: 'https://example.com/video.mp4',
          user_id: mockUser.id,
        },
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Invalid video format',
      });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('video-to-audio request');
    });

    it('should handle API timeout', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          url: 'https://example.com/video.mp4',
          user_id: mockUser.id,
        },
        error: null,
      });

      (global.fetch as jest.Mock).mockImplementation(() => {
        const error = new Error('Timeout');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(504);
      const data = await response.json();
      expect(data.error).toContain('timeout');
    });

    it('should return 500 when request_id is missing from response', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validAssetId,
          url: 'https://example.com/video.mp4',
          user_id: mockUser.id,
        },
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('request ID');
    });
  });

  describe('Database Job Tracking', () => {
    it('should create job record in database', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validAssetId,
            url: 'https://example.com/video.mp4',
            user_id: mockUser.id,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'job-123' },
          error: null,
        });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
          model: 'minimax',
          prompt: 'Test prompt',
        }),
      });

      await POST(mockRequest);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          project_id: validProjectId,
          asset_id: validAssetId,
          job_type: 'video-to-audio',
          status: 'pending',
          provider: 'fal.ai',
          provider_job_id: 'test-request-id',
        })
      );
    });

    it('should continue when job database insert fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validAssetId,
            url: 'https://example.com/video.mp4',
            user_id: mockUser.id,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Insert failed' },
        });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
        }),
      });

      const response = await POST(mockRequest);
      // Should still return success even if job tracking fails
      expect(response.status).toBe(200);
    });
  });

  describe('Success Cases', () => {
    it('should successfully start video-to-audio generation', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validAssetId,
            url: 'https://example.com/video.mp4',
            user_id: mockUser.id,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'job-123' },
          error: null,
        });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
          model: 'minimax',
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.requestId).toBe('test-request-id');
      expect(data.jobId).toBe('job-123');
      expect(data.model).toBe('minimax');
    });

    it('should accept optional prompt parameter', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validAssetId,
            url: 'https://example.com/video.mp4',
            user_id: mockUser.id,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'job-123' },
          error: null,
        });

      const mockRequest = new NextRequest('http://localhost/api/video/generate-audio', {
        method: 'POST',
        body: JSON.stringify({
          assetId: validAssetId,
          projectId: validProjectId,
          prompt: 'Epic background music',
        }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
    });
  });
});
