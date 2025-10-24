/**
 * Tests for POST /api/assets/upload - Asset Upload
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/assets/upload/route';
import {
  createMockSupabaseClient,
  createMockProject,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockQuerySuccess,
  mockQueryError,
  mockStorageUploadSuccess,
  mockStorageUploadError,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

// Mock modules
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
  ensureHttpsProtocol: jest.fn((url) => url),
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock withErrorHandling to pass through without catching errors in tests
jest.mock('@/lib/api/response', () => {
  const actual = jest.requireActual('@/lib/api/response');
  return {
    ...actual,
    withErrorHandling: (handler: any) => handler,
  };
});

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-123'),
}));

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    resetAt: Date.now() + 60000,
  }),
  RATE_LIMITS: {
    tier2_resource_creation: { requests: 10, window: 60 },
  },
}));

jest.mock('@/lib/api/project-verification', () => ({
  verifyProjectOwnership: jest.fn(),
}));

describe('POST /api/assets/upload', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Default storage mocks
    mockSupabase.storage.from.mockReturnThis();
    mockSupabase.storage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/test.jpg' },
    });

    // Default project verification mock - returns success
    const { verifyProjectOwnership } = require('@/lib/api/project-verification');
    verifyProjectOwnership.mockResolvedValue({
      hasAccess: true,
      project: createMockProject(),
    });
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg');
      formData.append('projectId', '123e4567-e89b-12d3-a456-426614174000');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when no file provided', async () => {
      mockAuthenticatedUser(mockSupabase);

      const formData = new FormData();
      formData.append('projectId', '123e4567-e89b-12d3-a456-426614174000');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('No file provided');
    });

    it('should return 400 when no projectId provided', async () => {
      mockAuthenticatedUser(mockSupabase);

      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Project ID required');
    });

    it('should return 400 when file exceeds size limit', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockQuerySuccess(mockSupabase, createMockProject());

      // Create a file larger than 100MB
      const largeSize = 101 * 1024 * 1024;
      const mockFile = {
        name: 'large.jpg',
        size: largeSize,
        type: 'image/jpeg',
        arrayBuffer: jest.fn(),
      };

      const formData = new FormData();
      formData.append('file', mockFile as any);
      formData.append('projectId', '123e4567-e89b-12d3-a456-426614174000');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('File too large');
      expect(data.details).toContain('100MB');
    });

    it('should return 400 for invalid image MIME type', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockQuerySuccess(mockSupabase, createMockProject());

      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'application/exe' }), 'test.exe');
      formData.append('projectId', '123e4567-e89b-12d3-a456-426614174000');
      formData.append('type', 'image');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid file type');
    });

    it('should accept valid image MIME types', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockQuerySuccess(mockSupabase, createMockProject({ user_id: mockUser.id }));
      mockStorageUploadSuccess(mockSupabase);
      mockSupabase.insert.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ error: null });

      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];

      for (const mimeType of validTypes) {
        const formData = new FormData();
        const mockFile = {
          name: 'test.jpg',
          size: 1024,
          type: mimeType,
          arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
        };
        formData.append('file', mockFile as any);
        formData.append('projectId', '123e4567-e89b-12d3-a456-426614174000');

        mockRequest = new NextRequest('http://localhost/api/assets/upload', {
          method: 'POST',
          body: formData as any,
        });

        const response = await POST(mockRequest, { params: Promise.resolve({}) });
        expect(response.status).toBe(200);
      }
    });

    it('should accept valid video MIME types', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockQuerySuccess(mockSupabase, createMockProject({ user_id: mockUser.id }));
      mockStorageUploadSuccess(mockSupabase);
      mockSupabase.insert.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ error: null });

      const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

      for (const mimeType of validTypes) {
        const formData = new FormData();
        const mockFile = {
          name: 'test.mp4',
          size: 1024,
          type: mimeType,
          arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
        };
        formData.append('file', mockFile as any);
        formData.append('projectId', '123e4567-e89b-12d3-a456-426614174000');
        formData.append('type', 'video');

        mockRequest = new NextRequest('http://localhost/api/assets/upload', {
          method: 'POST',
          body: formData as any,
        });

        const response = await POST(mockRequest, { params: Promise.resolve({}) });
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Project Authorization', () => {
    it('should return 404 when project not found', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockQueryError(mockSupabase, 'Project not found');

      // Override project verification to return not found
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValueOnce({
        hasAccess: false,
        error: 'Project not found or access denied',
        status: 404,
      });

      const formData = new FormData();
      const mockFile = {
        name: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn(),
      };
      formData.append('file', mockFile as any);
      formData.append('projectId', 'nonexistent-project');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('not found');
    });

    it('should return 404 when user does not own project', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows found' },
      });

      // Override project verification to return not found
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValueOnce({
        hasAccess: false,
        error: 'Project not found or access denied',
        status: 404,
      });

      const formData = new FormData();
      const mockFile = {
        name: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn(),
      };
      formData.append('file', mockFile as any);
      formData.append('projectId', 'other-users-project');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(404);
    });

    it('should verify project ownership with user_id', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockQuerySuccess(mockSupabase, createMockProject({ user_id: mockUser.id }));
      mockStorageUploadSuccess(mockSupabase);
      mockSupabase.insert.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ error: null });

      const formData = new FormData();
      const mockFile = {
        name: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      formData.append('file', mockFile as any);
      formData.append('projectId', '123e4567-e89b-12d3-a456-426614174000');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '123e4567-e89b-12d3-a456-426614174000');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });
  });

  describe('File Upload Success', () => {
    it('should upload file and create asset record', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockQuerySuccess(mockSupabase, createMockProject({ user_id: mockUser.id }));
      mockStorageUploadSuccess(mockSupabase);
      mockSupabase.insert.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ error: null });

      const formData = new FormData();
      const mockFile = {
        name: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      formData.append('file', mockFile as any);
      formData.append('projectId', '123e4567-e89b-12d3-a456-426614174000');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(mockSupabase.storage.upload).toHaveBeenCalled();
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: mockUser.id,
          type: 'image',
          mime_type: 'image/jpeg',
          source: 'upload',
        })
      );
    });

    it('should generate unique filename with UUID', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockQuerySuccess(mockSupabase, createMockProject({ user_id: mockUser.id }));
      mockStorageUploadSuccess(mockSupabase);
      mockSupabase.insert.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ error: null });

      const formData = new FormData();
      const mockFile = {
        name: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      formData.append('file', mockFile as any);
      formData.append('projectId', '123e4567-e89b-12d3-a456-426614174000');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(mockSupabase.storage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/mock-uuid-123\./),
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it('should organize files in correct folder structure', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockQuerySuccess(mockSupabase, createMockProject({ user_id: mockUser.id }));
      mockStorageUploadSuccess(mockSupabase);
      mockSupabase.insert.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ error: null });

      const formData = new FormData();
      const mockFile = {
        name: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      formData.append('file', mockFile as any);
      formData.append('projectId', '123e4567-e89b-12d3-a456-426614174000');
      formData.append('type', 'image');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(mockSupabase.storage.upload).toHaveBeenCalledWith(
        expect.stringContaining(`${mockUser.id}/test-project-id/image/`),
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it('should return asset information in response', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockQuerySuccess(mockSupabase, createMockProject({ user_id: mockUser.id }));
      mockStorageUploadSuccess(mockSupabase);
      mockSupabase.insert.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ error: null });

      const formData = new FormData();
      const mockFile = {
        name: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      formData.append('file', mockFile as any);
      formData.append('projectId', '123e4567-e89b-12d3-a456-426614174000');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data).toHaveProperty('assetId');
      expect(data).toHaveProperty('storageUrl');
      expect(data).toHaveProperty('publicUrl');
      expect(data).toHaveProperty('success', true);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when storage upload fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockQuerySuccess(mockSupabase, createMockProject({ user_id: mockUser.id }));
      mockStorageUploadError(mockSupabase, 'Storage quota exceeded');

      const formData = new FormData();
      const mockFile = {
        name: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      formData.append('file', mockFile as any);
      formData.append('projectId', '123e4567-e89b-12d3-a456-426614174000');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Storage quota exceeded');
    });

    it('should delete uploaded file when database insert fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockQuerySuccess(mockSupabase, createMockProject({ user_id: mockUser.id }));
      mockStorageUploadSuccess(mockSupabase);
      mockSupabase.insert.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({
        error: { message: 'Database error' },
      });
      mockSupabase.storage.remove.mockResolvedValue({
        data: null,
        error: null,
      });

      const formData = new FormData();
      const mockFile = {
        name: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      formData.append('file', mockFile as any);
      formData.append('projectId', '123e4567-e89b-12d3-a456-426614174000');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      expect(mockSupabase.storage.remove).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const formData = new FormData();
      const mockFile = {
        name: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn(),
      };
      formData.append('file', mockFile as any);
      formData.append('projectId', '123e4567-e89b-12d3-a456-426614174000');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Activity History', () => {
    it('should log upload to activity history', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockQuerySuccess(mockSupabase, createMockProject({ user_id: mockUser.id }));
      mockStorageUploadSuccess(mockSupabase);
      mockSupabase.insert.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ error: null });

      const formData = new FormData();
      const mockFile = {
        name: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      formData.append('file', mockFile as any);
      formData.append('projectId', '123e4567-e89b-12d3-a456-426614174000');

      mockRequest = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_type: 'image_upload',
          user_id: mockUser.id,
          project_id: '123e4567-e89b-12d3-a456-426614174000',
        })
      );
    });
  });
});
