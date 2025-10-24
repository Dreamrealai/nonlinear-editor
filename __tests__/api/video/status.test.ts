/**
 * Tests for GET /api/video/status - Video Generation Status Check
 */

import type { NextRequest } from 'next/server';
import { GET } from '@/app/api/video/status/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

// Mock modules
jest.mock('@/lib/supabase', () => {
  const { createMockSupabaseClient } = jest.requireActual('@/test-utils/mockSupabase');
  const mockClient = createMockSupabaseClient();

  return {
    createServerSupabaseClient: jest.fn(async () => mockClient),
    ensureHttpsProtocol: jest.fn((url) => url),
    __getMockClient: () => mockClient,
  };
});

jest.mock('@/lib/veo', () => ({
  checkOperationStatus: jest.fn(),
}));

jest.mock('@/lib/fal-video', () => ({
  checkFalVideoStatus: jest.fn(),
}));

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({
    success: true,
    limit: 30,
    remaining: 29,
    resetAt: Date.now() + 60_000,
  }),
  RATE_LIMITS: {
    tier3_status_read: { max: 30, windowMs: 60_000 },
  },
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

const createRequest = (path: string, init: RequestInit = {}) =>
  new Request(`http://localhost${path}`, init);

const { checkRateLimit } = require('@/lib/rateLimit');
const { checkFalVideoStatus } = require('@/lib/fal-video');
const { checkOperationStatus } = require('@/lib/veo');

describe('GET /api/video/status', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    const { __getMockClient } = require('@/lib/supabase');
    mockSupabase = __getMockClient();

    // Setup default storage mocks
    mockSupabase.storage.from.mockReturnThis();
    mockSupabase.storage.upload.mockResolvedValue({
      data: { path: 'test-path' },
      error: null,
    });
    mockSupabase.storage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/video.mp4' },
    });
    (checkRateLimit as jest.Mock).mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      resetAt: Date.now() + 60_000,
    });
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      mockRequest = createRequest(
        '/api/video/status?operationName=test&projectId=123'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
    });

    it('should return 429 when rate limit exceeded', async () => {
      mockAuthenticatedUser(mockSupabase);
      (checkRateLimit as jest.Mock).mockResolvedValueOnce({
        success: false,
        limit: 30,
        remaining: 0,
        resetAt: Date.now() + 60_000,
      });

      mockRequest = createRequest(
        '/api/video/status?operationName=test&projectId=123'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toBe('Rate limit exceeded');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when operationName is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockRequest = createRequest('/api/video/status?projectId=123') as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.field).toBe('operationName');
    });

    it('should return 400 when projectId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockRequest = createRequest('/api/video/status?operationName=test') as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.field).toBe('projectId');
    });
  });

  describe('FAL Video Status', () => {
    it('should check FAL operation status', async () => {
      mockAuthenticatedUser(mockSupabase);
      checkFalVideoStatus.mockResolvedValue({
        done: false,
        error: null,
      });

      mockRequest = createRequest(
        '/api/video/status?operationName=fal:seedance-1.0-pro:request-123&projectId=test-project-id'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(checkFalVideoStatus).toHaveBeenCalledWith('request-123', 'seedance-1.0-pro');
      const data = await response.json();
      expect(data.done).toBe(false);
    });

    it('should handle completed FAL video generation', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      // Mock FAL result
      checkFalVideoStatus.mockResolvedValue({
        done: true,
        result: {
          video: {
            url: 'https://fal.ai/video.mp4',
            content_type: 'video/mp4',
          },
        },
      });

      // Mock fetch for video download
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      }) as unknown as typeof fetch;

      // Mock database insert
      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'asset-123',
          storage_url: 'supabase://assets/test-path',
        },
        error: null,
      });

      mockRequest = createRequest(
        '/api/video/status?operationName=fal:seedance-1.0-pro:request-123&projectId=test-project-id'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.done).toBe(true);
      expect(data.asset).toBeDefined();
      expect(mockSupabase.storage.upload).toHaveBeenCalled();
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should return error when FAL video generation fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      checkFalVideoStatus.mockResolvedValue({
        done: true,
        error: 'Generation failed',
      });

      mockRequest = createRequest(
        '/api/video/status?operationName=fal:seedance-1.0-pro:request-123&projectId=test-project-id'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.done).toBe(true);
      expect(data.error).toBe('Generation failed');
    });

    it('should validate FAL operation name format', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = createRequest(
        '/api/video/status?operationName=fal:invalid&projectId=test-project-id'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });
  });

  describe('Veo Video Status', () => {
    it('should check Veo operation status', async () => {
      mockAuthenticatedUser(mockSupabase);
      checkOperationStatus.mockResolvedValue({
        done: false,
        metadata: { progressPercentage: 50 },
      });

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=test-project-id'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(checkOperationStatus).toHaveBeenCalledWith('operations/veo-123');
      const data = await response.json();
      expect(data.done).toBe(false);
      expect(data.progress).toBe(50);
    });

    it('should handle completed Veo video with base64 data', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      // Mock base64 video data
      const testVideoData = Buffer.from('test video data').toString('base64');
      checkOperationStatus.mockResolvedValue({
        done: true,
        response: {
          videos: [
            {
              bytesBase64Encoded: testVideoData,
              mimeType: 'video/mp4',
            },
          ],
        },
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'asset-456',
          storage_url: 'supabase://assets/test-path',
        },
        error: null,
      });

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=test-project-id'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.done).toBe(true);
      expect(data.asset).toBeDefined();
      expect(mockSupabase.storage.upload).toHaveBeenCalled();
    });

    it('should download Veo video from GCS URI', async () => {
      mockAuthenticatedUser(mockSupabase);

      process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify({
        type: 'service_account',
        project_id: 'test',
      });

      checkOperationStatus.mockResolvedValue({
        done: true,
        response: {
          videos: [
            {
              gcsUri: 'gs://test-bucket/video.mp4',
              mimeType: 'video/mp4',
            },
          ],
        },
      });

      // Mock GoogleAuth
      const mockGetClient = jest.fn().mockResolvedValue({
        getAccessToken: jest.fn().mockResolvedValue({ token: 'test-token' }),
      });
      jest.mock('google-auth-library', () => ({
        GoogleAuth: jest.fn().mockImplementation(() => ({
          getClient: mockGetClient,
        })),
      }));

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      }) as unknown as typeof fetch;

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: { id: 'asset-789' },
        error: null,
      });

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-456&projectId=test-project-id'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.done).toBe(true);

      delete process.env.GOOGLE_SERVICE_ACCOUNT;
    });

    it('should return error when Veo operation fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      checkOperationStatus.mockResolvedValue({
        done: true,
        error: {
          message: 'Generation failed',
        },
      });

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=test-project-id'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.done).toBe(true);
      expect(data.error).toBe('Generation failed');
    });
  });

  describe('Storage and Database', () => {
    it('should upload video to storage and create asset record', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const testVideoData = Buffer.from('test video').toString('base64');
      checkOperationStatus.mockResolvedValue({
        done: true,
        response: {
          videos: [
            {
              bytesBase64Encoded: testVideoData,
              mimeType: 'video/mp4',
            },
          ],
        },
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: { id: 'asset-123' },
        error: null,
      });

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=test-project-id'
      ) as unknown as NextRequest;

      await GET(mockRequest, { params: Promise.resolve({}) });

      expect(mockSupabase.storage.upload).toHaveBeenCalledWith(
        expect.stringContaining('test-user-id/test-project-id'),
        expect.any(Buffer),
        expect.objectContaining({
          contentType: 'video/mp4',
        })
      );

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          project_id: 'test-project-id',
          type: 'video',
          source: 'genai',
        })
      );
    });

    it('should clean up storage on database insert failure', async () => {
      mockAuthenticatedUser(mockSupabase);

      const testVideoData = Buffer.from('test video').toString('base64');
      checkOperationStatus.mockResolvedValue({
        done: true,
        response: {
          videos: [
            {
              bytesBase64Encoded: testVideoData,
              mimeType: 'video/mp4',
            },
          ],
        },
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockSupabase.storage.remove.mockResolvedValue({
        data: null,
        error: null,
      });

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=test-project-id'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      expect(mockSupabase.storage.remove).toHaveBeenCalled();
    });

    it('should create activity history entry on success', async () => {
      mockAuthenticatedUser(mockSupabase);

      const testVideoData = Buffer.from('test video').toString('base64');
      checkOperationStatus.mockResolvedValue({
        done: true,
        response: {
          videos: [
            {
              bytesBase64Encoded: testVideoData,
              mimeType: 'video/mp4',
            },
          ],
        },
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: { id: 'asset-123' },
        error: null,
      });

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=test-project-id'
      ) as unknown as NextRequest;

      await GET(mockRequest, { params: Promise.resolve({}) });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_type: 'video_generation',
          title: 'Video Generated',
          model: 'veo',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when status check fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      checkOperationStatus.mockRejectedValue(new Error('API error'));

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=test-project-id'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('API error');
    });

    it('should handle storage upload failure', async () => {
      mockAuthenticatedUser(mockSupabase);

      checkOperationStatus.mockResolvedValue({
        done: true,
        response: {
          videos: [
            {
              bytesBase64Encoded: Buffer.from('test').toString('base64'),
              mimeType: 'video/mp4',
            },
          ],
        },
      });

      mockSupabase.storage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage error' },
      });

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=test-project-id'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
    });
  });
});
