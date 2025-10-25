/**
 * Tests for GET /api/video/upscale-status - Check Video Upscale Status
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/video/upscale-status/route';
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

jest.mock('@/lib/supabase', (): Record<string, unknown> => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/serverLogger', (): Record<string, unknown> => ({
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

global.fetch = jest.fn();

describe('GET /api/video/upscale-status', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validRequestId = 'test-request-123';
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    process.env['FAL_API_KEY'] = 'test-fal-key';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'IN_PROGRESS' }),
    });
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
    delete process.env['FAL_API_KEY'];
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/video/upscale-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when requestId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/video/upscale-status?projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(400);
    });

    it('should return 400 when projectId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/video/upscale-status?requestId=${validRequestId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(400);
    });
  });

  describe('API Key Configuration', () => {
    it('should return 500 when FAL_API_KEY not configured', async () => {
      delete process.env['FAL_API_KEY'];
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/video/upscale-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(500);
    });
  });

  describe('Status Polling', () => {
    it('should return in progress status', async () => {
      mockAuthenticatedUser(mockSupabase);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'IN_PROGRESS' }),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/upscale-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.done).toBe(false);
      expect(data.status).toBe('IN_PROGRESS');
    });

    it('should return in queue status', async () => {
      mockAuthenticatedUser(mockSupabase);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'IN_QUEUE' }),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/upscale-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      const data = await response.json();
      expect(data.done).toBe(false);
    });

    it('should return failed status', async () => {
      mockAuthenticatedUser(mockSupabase);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'FAILED', error: 'Processing error' }),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/upscale-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      const data = await response.json();
      expect(data.done).toBe(true);
      expect(data.error).toBeDefined();
    });
  });

  describe('Completed Status', () => {
    it('should download and save upscaled video', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'COMPLETED' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            video: { url: 'https://fal.ai/upscaled.mp4' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(2048),
        });

      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.com/upscaled.mp4' },
        }),
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'asset-123' },
        error: null,
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/upscale-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.done).toBe(true);
      expect(data.asset).toBeDefined();
    });

    it('should handle missing video URL', async () => {
      mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'COMPLETED' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/upscale-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(500);
    });

    it('should handle upload errors with cleanup', async () => {
      mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'COMPLETED' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ video: { url: 'https://fal.ai/video.mp4' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(2048),
        });

      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: { message: 'Upload failed' } }),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/upscale-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(500);
    });

    it('should cleanup storage on database error', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockRemove = jest.fn().mockResolvedValue({ error: null });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'COMPLETED' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ video: { url: 'https://fal.ai/video.mp4' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(2048),
        });

      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.com/video.mp4' },
        }),
        remove: mockRemove,
      });

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/upscale-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(500);
      expect(mockRemove).toHaveBeenCalled();
    });
  });
});
