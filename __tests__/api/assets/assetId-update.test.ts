/**
 * Tests for PUT /api/assets/[assetId]/update - Asset Update with Versioning
 */

import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/assets/[assetId]/update/route';
import {
  createMockSupabaseClient,
  createMockAsset,
  createMockProject,
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

jest.mock('@/lib/services/assetVersionService', () => ({
  AssetVersionService: jest.fn().mockImplementation(() => ({
    createVersion: jest.fn().mockResolvedValue({
      versionId: 'version-123',
      versionNumber: 2,
    }),
  })),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-456'),
}));

jest.mock('sanitize-filename', () => jest.fn((name) => name));

describe('PUT /api/assets/[assetId]/update', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;
  const validAssetId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Default storage mocks
    mockSupabase.storage.from.mockReturnThis();
    mockSupabase.storage.upload.mockResolvedValue({
      data: { path: 'test/path/file.jpg' },
      error: null,
    });
    mockSupabase.storage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/file.jpg' },
    });

    // Default project verification mock
    const { verifyProjectOwnership } = require('@/lib/api/project-verification');
    verifyProjectOwnership.mockResolvedValue({
      hasAccess: true,
      project: createMockProject(),
    });
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg');

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/update`, {
        method: 'PUT',
        body: formData as unknown as BodyInit,
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid UUID', async () => {
      mockAuthenticatedUser(mockSupabase);

      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg');

      mockRequest = new NextRequest('http://localhost/api/assets/invalid-uuid/update', {
        method: 'PUT',
        body: formData as unknown as BodyInit,
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: 'invalid-uuid' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('assetId');
    });

    it('should return 400 when no file provided', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      const formData = new FormData();

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/update`, {
        method: 'PUT',
        body: formData as unknown as BodyInit,
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('No file provided');
    });

    it('should return 413 when file exceeds 100MB limit', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      const formData = new FormData();
      const largeFile = {
        name: 'large.mp4',
        size: 101 * 1024 * 1024, // 101MB
        type: 'video/mp4',
        arrayBuffer: jest.fn(),
      };
      formData.append('file', largeFile as any);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/update`, {
        method: 'PUT',
        body: formData as unknown as BodyInit,
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(413);
      const data = await response.json();
      expect(data.error).toContain('too large');
    });
  });

  describe('Asset Authorization', () => {
    it('should return 404 when asset not found', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Asset not found' },
      });

      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg');

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/update`, {
        method: 'PUT',
        body: formData as unknown as BodyInit,
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Asset not found');
    });

    it('should return 403 when user does not own project', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id, project_id: 'other-project' });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({
        hasAccess: false,
      });

      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg');

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/update`, {
        method: 'PUT',
        body: formData as unknown as BodyInit,
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Success Cases', () => {
    it('should update asset with new file and create version', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        current_version: 1,
        storage_url: 'supabase://assets/old-file.jpg',
      });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({ error: null });

      const formData = new FormData();
      const mockFile = {
        name: 'updated.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      formData.append('file', mockFile as any);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/update`, {
        method: 'PUT',
        body: formData as unknown as BodyInit,
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.assetId).toBe(validAssetId);
      expect(data.storageUrl).toBeDefined();
      expect(data.publicUrl).toBeDefined();
      expect(data.versionNumber).toBe(2);
    });

    it('should accept changeReason parameter', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({ error: null });

      const formData = new FormData();
      const mockFile = {
        name: 'updated.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      formData.append('file', mockFile as any);
      formData.append('changeReason', 'Fixed color correction');

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/update`, {
        method: 'PUT',
        body: formData as unknown as BodyInit,
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
    });

    it('should accept versionLabel parameter', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({ error: null });

      const formData = new FormData();
      const mockFile = {
        name: 'updated.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      formData.append('file', mockFile as any);
      formData.append('versionLabel', 'v2.0-final');

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/update`, {
        method: 'PUT',
        body: formData as unknown as BodyInit,
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when storage upload fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockSupabase.storage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage error' },
      });

      const formData = new FormData();
      const mockFile = {
        name: 'updated.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      formData.append('file', mockFile as any);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/update`, {
        method: 'PUT',
        body: formData as unknown as BodyInit,
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Storage error');
    });

    it('should return 500 when version creation fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      const { AssetVersionService } = require('@/lib/services/assetVersionService');
      AssetVersionService.mockImplementationOnce(() => ({
        createVersion: jest.fn().mockRejectedValue(new Error('Version creation failed')),
      }));

      const formData = new FormData();
      const mockFile = {
        name: 'updated.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      formData.append('file', mockFile as any);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/update`, {
        method: 'PUT',
        body: formData as unknown as BodyInit,
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(500);
    });

    it('should return 500 when asset update fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({
        error: { message: 'Database error' },
      });

      const formData = new FormData();
      const mockFile = {
        name: 'updated.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      formData.append('file', mockFile as any);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/update`, {
        method: 'PUT',
        body: formData as unknown as BodyInit,
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(500);
    });
  });
});
