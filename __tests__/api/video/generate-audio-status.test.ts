/**
 * Tests for GET /api/video/generate-audio-status - Check Audio Generation Status
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/video/generate-audio-status/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
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

jest.mock('@/lib/api/response', () => {
  const actual = jest.requireActual('@/lib/api/response');
  return {
    ...actual,
    withErrorHandling: jest.fn((handler) => handler),
  };
});

// Mock global fetch
global.fetch = jest.fn();

describe('GET /api/video/generate-audio-status', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validRequestId = 'test-request-id-123';
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';
  const validAssetId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Set FAL_API_KEY by default
    process.env['FAL_API_KEY'] = 'test-fal-api-key';

    // Mock successful status fetch by default
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'IN_PROGRESS' }),
      text: async () => 'Success',
    });
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
    delete process.env['FAL_API_KEY'];
    jest.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when requestId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('requestId');
    });

    it('should return 400 when projectId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('projectId');
    });
  });

  describe('API Key Configuration', () => {
    it('should return 500 when FAL_API_KEY is not configured', async () => {
      delete process.env['FAL_API_KEY'];
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('FAL_API_KEY');
    });
  });

  describe('Status Check', () => {
    it('should check status with FAL.ai API', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      await GET(mockRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        `https://queue.fal.run/requests/${validRequestId}/status`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Key test-fal-api-key',
          }),
        })
      );
    });

    it('should handle status check errors', async () => {
      mockAuthenticatedUser(mockSupabase);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Request not found',
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(404);
    });

    it('should handle status check timeout', async () => {
      mockAuthenticatedUser(mockSupabase);
      (global.fetch as jest.Mock).mockImplementation(() => {
        const error = new Error('Timeout');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(504);
      const data = await response.json();
      expect(data.error).toContain('timeout');
    });
  });

  describe('Processing Status', () => {
    it('should return processing status when job is in progress', async () => {
      mockAuthenticatedUser(mockSupabase);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'IN_PROGRESS', progress: 50 }),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('processing');
      expect(data.progress).toBe(50);
    });
  });

  describe('Failed Status', () => {
    it('should handle FAILED status', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'FAILED', error: 'Generation failed' }),
      });

      mockSupabase.update.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('failed');
      expect(data.error).toContain('failed');
    });

    it('should handle ERROR status', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ERROR' }),
      });

      mockSupabase.update.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      const data = await response.json();
      expect(data.status).toBe('failed');
    });
  });

  describe('Completed Status - Download and Storage', () => {
    it('should download and upload audio on completion', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      // Mock status check
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'COMPLETED' }),
        })
        // Mock result fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            audio: { url: 'https://fal.ai/audio.mp3' },
          }),
        })
        // Mock audio download
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
          headers: {
            get: () => 'audio/mpeg',
          },
        });

      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/audio.mp3' },
        }),
      });

      mockSupabase.single
        .mockResolvedValueOnce({
          data: { name: 'Test Video' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'asset-123', url: 'https://storage.example.com/audio.mp3' },
          error: null,
        });

      mockSupabase.update.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}&projectId=${validProjectId}&assetId=${validAssetId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('completed');
      expect(data.asset).toBeDefined();
      expect(data.audioUrl).toBe('https://storage.example.com/audio.mp3');
    });

    it('should handle missing audio URL in result', async () => {
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
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('audio URL');
    });

    it('should handle audio download failure', async () => {
      mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'COMPLETED' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            audio: { url: 'https://fal.ai/audio.mp3' },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
        });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(500);
    });

    it('should handle storage upload failure', async () => {
      mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'COMPLETED' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            audio: { url: 'https://fal.ai/audio.mp3' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: { message: 'Upload failed' } }),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('upload');
    });

    it('should handle database asset creation failure', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'COMPLETED' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            audio: { url: 'https://fal.ai/audio.mp3' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/audio.mp3' },
        }),
      });

      mockSupabase.single
        .mockResolvedValueOnce({
          data: { name: 'Test Video' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Insert failed' },
        });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(500);
    });
  });

  describe('Alternative Audio URL Formats', () => {
    it('should handle audio_url field', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'COMPLETED' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            audio_url: 'https://fal.ai/audio.mp3',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/audio.mp3' },
        }),
      });

      mockSupabase.single
        .mockResolvedValueOnce({
          data: { name: 'Test Video' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'asset-123' },
          error: null,
        });

      mockSupabase.update.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(200);
    });

    it('should handle output.url field', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'COMPLETED' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            output: { url: 'https://fal.ai/audio.mp3' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });

      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/audio.mp3' },
        }),
      });

      mockSupabase.single
        .mockResolvedValueOnce({
          data: { name: 'Test Video' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'asset-123' },
          error: null,
        });

      mockSupabase.update.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/video/generate-audio-status?requestId=${validRequestId}&projectId=${validProjectId}`
      );

      const response = await GET(mockRequest);
      expect(response.status).toBe(200);
    });
  });
});
