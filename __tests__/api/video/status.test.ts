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
    isSupabaseServiceConfigured: jest.fn(() => true),
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

// serverLogger is mocked globally in __mocks__/lib/serverLogger.ts

// Mock API response helpers - use actual implementation with instrumented withErrorHandling
jest.mock('@/lib/api/response', () => {
  const actual = jest.requireActual('@/lib/api/response');
  return {
    ...actual,
    withErrorHandling: (handler) => {
      return async (...args) => {
        try {
          return await handler(...args);
        } catch (error) {
          console.log('ERROR CAUGHT BY withErrorHandling:', error);
          return actual.withErrorHandling(handler)(...args);
        }
      };
    },
  };
});

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

    // IMPORTANT: Re-setup Supabase mock after clearAllMocks
    const { __getMockClient, createServerSupabaseClient } = require('@/lib/supabase');
    mockSupabase = __getMockClient();
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Setup default auth mock (needs to be reset after clearAllMocks)
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    });

    // Setup default storage mocks
    mockSupabase.storage.from.mockReturnThis();
    mockSupabase.storage.upload.mockResolvedValue({
      data: { path: 'test-path' },
      error: null,
    });
    mockSupabase.storage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/video.mp4' },
    });
    mockSupabase.storage.remove.mockResolvedValue({
      data: null,
      error: null,
    });

    // Setup default database mocks with full chain
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.single.mockResolvedValue({
      data: {
        id: 'asset-123',
        user_id: 'test-user-id',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'video',
        source: 'genai',
        storage_url: 'supabase://assets/test-path',
        metadata: {},
        created_at: new Date().toISOString(),
      },
      error: null,
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

      console.log('NODE_ENV at test time:', process.env.NODE_ENV);
      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      if (response.status === 500) {
        const errorData = await response.json();
        console.log('Got 500 error:', errorData);
      }
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
        '/api/video/status?operationName=fal:seedance-1.0-pro:request-123&projectId=550e8400-e29b-41d4-a716-446655440000'
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

      mockRequest = createRequest(
        '/api/video/status?operationName=fal:seedance-1.0-pro:request-123&projectId=550e8400-e29b-41d4-a716-446655440000'
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
        '/api/video/status?operationName=fal:seedance-1.0-pro:request-123&projectId=550e8400-e29b-41d4-a716-446655440000'
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
        '/api/video/status?operationName=fal:invalid&projectId=550e8400-e29b-41d4-a716-446655440000'
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
        '/api/video/status?operationName=operations/veo-123&projectId=550e8400-e29b-41d4-a716-446655440000'
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

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=550e8400-e29b-41d4-a716-446655440000'
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

      // Mock with complete service account credentials
      process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify({
        type: 'service_account',
        project_id: 'test-project',
        private_key_id: 'test-key-id',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7W6L2hnCfPfAz\n-----END PRIVATE KEY-----\n',
        client_email: 'test@test-project.iam.gserviceaccount.com',
        client_id: '123456789',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com',
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

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      }) as unknown as typeof fetch;

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-456&projectId=550e8400-e29b-41d4-a716-446655440000'
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
        '/api/video/status?operationName=operations/veo-123&projectId=550e8400-e29b-41d4-a716-446655440000'
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

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=550e8400-e29b-41d4-a716-446655440000'
      ) as unknown as NextRequest;

      await GET(mockRequest, { params: Promise.resolve({}) });

      expect(mockSupabase.storage.upload).toHaveBeenCalledWith(
        expect.stringContaining('test-user-id/550e8400-e29b-41d4-a716-446655440000'),
        expect.any(Buffer),
        expect.objectContaining({
          contentType: 'video/mp4',
        })
      );

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          project_id: '550e8400-e29b-41d4-a716-446655440000',
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

      // Override the default mock to return an error
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=550e8400-e29b-41d4-a716-446655440000'
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

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=550e8400-e29b-41d4-a716-446655440000'
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
        '/api/video/status?operationName=operations/veo-123&projectId=550e8400-e29b-41d4-a716-446655440000'
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
        '/api/video/status?operationName=operations/veo-123&projectId=550e8400-e29b-41d4-a716-446655440000'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
    });

    it('should handle external service 429 rate limit (Veo)', async () => {
      mockAuthenticatedUser(mockSupabase);

      const rateLimitError = new Error('Quota exceeded');
      (rateLimitError as any).status = 429;
      checkOperationStatus.mockRejectedValue(rateLimitError);

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=550e8400-e29b-41d4-a716-446655440000'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toContain('Quota exceeded');
    });

    it('should handle external service 429 rate limit (FAL)', async () => {
      mockAuthenticatedUser(mockSupabase);

      const rateLimitError = new Error('Rate limit exceeded on external service');
      (rateLimitError as any).status = 429;
      checkFalVideoStatus.mockRejectedValue(rateLimitError);

      mockRequest = createRequest(
        '/api/video/status?operationName=fal:seedance-1.0-pro:request-123&projectId=550e8400-e29b-41d4-a716-446655440000'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toContain('Rate limit exceeded');
    });

    it('should handle invalid API key for external service', async () => {
      mockAuthenticatedUser(mockSupabase);

      const authError = new Error('Invalid API key');
      (authError as any).status = 401;
      checkFalVideoStatus.mockRejectedValue(authError);

      mockRequest = createRequest(
        '/api/video/status?operationName=fal:seedance-1.0-pro:request-123&projectId=550e8400-e29b-41d4-a716-446655440000'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Invalid API key');
    });

    it('should handle malformed video ID', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = createRequest(
        '/api/video/status?operationName=&projectId=550e8400-e29b-41d4-a716-446655440000'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.field).toBe('operationName');
    });

    it('should handle invalid FAL endpoint format', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = createRequest(
        '/api/video/status?operationName=fal:only-one-part&projectId=550e8400-e29b-41d4-a716-446655440000'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid FAL operation name format');
    });

    it('should handle failed video download from FAL', async () => {
      mockAuthenticatedUser(mockSupabase);

      checkFalVideoStatus.mockResolvedValue({
        done: true,
        result: {
          video: {
            url: 'https://fal.ai/video.mp4',
            content_type: 'video/mp4',
          },
        },
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }) as unknown as typeof fetch;

      mockRequest = createRequest(
        '/api/video/status?operationName=fal:seedance-1.0-pro:request-123&projectId=550e8400-e29b-41d4-a716-446655440000'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Failed to download FAL video');
    });

    it('should handle missing Google service account for GCS download', async () => {
      mockAuthenticatedUser(mockSupabase);

      delete process.env.GOOGLE_SERVICE_ACCOUNT;

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

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=550e8400-e29b-41d4-a716-446655440000'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('GOOGLE_SERVICE_ACCOUNT');
    });

    it('should handle invalid GCS URI format', async () => {
      mockAuthenticatedUser(mockSupabase);

      process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify({
        type: 'service_account',
        project_id: 'test-project',
        private_key_id: 'test-key-id',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7W6L2hnCfPfAz\n-----END PRIVATE KEY-----\n',
        client_email: 'test@test-project.iam.gserviceaccount.com',
        client_id: '123456789',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com',
      });

      checkOperationStatus.mockResolvedValue({
        done: true,
        response: {
          videos: [
            {
              gcsUri: 'gs://invalid-uri-no-path',
              mimeType: 'video/mp4',
            },
          ],
        },
      });

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=550e8400-e29b-41d4-a716-446655440000'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Invalid GCS URI');

      delete process.env.GOOGLE_SERVICE_ACCOUNT;
    });

    it('should handle no video artifact returned by Veo', async () => {
      mockAuthenticatedUser(mockSupabase);

      checkOperationStatus.mockResolvedValue({
        done: true,
        response: {
          videos: [],
        },
      });

      mockRequest = createRequest(
        '/api/video/status?operationName=operations/veo-123&projectId=550e8400-e29b-41d4-a716-446655440000'
      ) as unknown as NextRequest;

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('No downloadable video');
    });
  });
});
