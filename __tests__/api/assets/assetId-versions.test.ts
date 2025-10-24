/**
 * Tests for GET /api/assets/[assetId]/versions - Asset Version History
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/assets/[assetId]/versions/route';
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
    limit: 60,
    remaining: 59,
    resetAt: Date.now() + 60000,
  }),
  RATE_LIMITS: {
    tier3_status_read: { requests: 60, window: 60 },
  },
}));

jest.mock('@/lib/api/project-verification', () => ({
  verifyProjectOwnership: jest.fn(),
}));

jest.mock('@/lib/services/assetVersionService', () => ({
  AssetVersionService: jest.fn().mockImplementation(() => ({
    getVersionHistory: jest.fn().mockResolvedValue([
      {
        id: 'version-1',
        asset_id: '123e4567-e89b-12d3-a456-426614174000',
        version_number: 2,
        storage_url: 'supabase://assets/version-2.jpg',
        file_size: 2048,
        mime_type: 'image/jpeg',
        change_reason: 'Color correction',
        created_at: '2024-01-02T00:00:00Z',
        created_by: 'test-user-id',
      },
      {
        id: 'version-2',
        asset_id: '123e4567-e89b-12d3-a456-426614174000',
        version_number: 1,
        storage_url: 'supabase://assets/version-1.jpg',
        file_size: 1024,
        mime_type: 'image/jpeg',
        change_reason: 'Initial version',
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'test-user-id',
      },
    ]),
  })),
}));

describe('GET /api/assets/[assetId]/versions', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;
  const validAssetId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

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

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/versions`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid UUID', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest('http://localhost/api/assets/invalid-uuid/versions', {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ assetId: 'invalid-uuid' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('assetId');
    });
  });

  describe('Asset Authorization', () => {
    it('should return 404 when asset not found', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Asset not found' },
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/versions`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Asset not found');
    });

    it('should return 403 when user does not own project', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = {
        project_id: 'other-project-id',
        current_version: 2,
      };

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({
        hasAccess: false,
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/versions`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Success Cases', () => {
    it('should return version history successfully', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = {
        project_id: 'test-project-id',
        current_version: 2,
      };

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/versions`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.versions).toBeDefined();
      expect(data.versions).toHaveLength(2);
      expect(data.currentVersion).toBe(2);
      expect(data.totalVersions).toBe(2);
    });

    it('should return version details with correct fields', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = {
        project_id: 'test-project-id',
        current_version: 2,
      };

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/versions`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      const firstVersion = data.versions[0];
      expect(firstVersion).toHaveProperty('id');
      expect(firstVersion).toHaveProperty('asset_id');
      expect(firstVersion).toHaveProperty('version_number');
      expect(firstVersion).toHaveProperty('storage_url');
      expect(firstVersion).toHaveProperty('file_size');
      expect(firstVersion).toHaveProperty('mime_type');
      expect(firstVersion).toHaveProperty('change_reason');
      expect(firstVersion).toHaveProperty('created_at');
      expect(firstVersion).toHaveProperty('created_by');
    });

    it('should return empty array when no versions exist', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = {
        project_id: 'test-project-id',
        current_version: 1,
      };

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      const { AssetVersionService } = require('@/lib/services/assetVersionService');
      AssetVersionService.mockImplementationOnce(() => ({
        getVersionHistory: jest.fn().mockResolvedValue([]),
      }));

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/versions`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.versions).toEqual([]);
      expect(data.totalVersions).toBe(0);
    });

    it('should default to version 1 when current_version is null', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = {
        project_id: 'test-project-id',
        current_version: null,
      };

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/versions`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.currentVersion).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when version service fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = {
        project_id: 'test-project-id',
        current_version: 2,
      };

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      const { AssetVersionService } = require('@/lib/services/assetVersionService');
      AssetVersionService.mockImplementationOnce(() => ({
        getVersionHistory: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/versions`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to get version history');
    });
  });
});
