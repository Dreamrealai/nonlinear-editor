/**
 * Tests for POST /api/assets/[assetId]/versions/[versionId]/revert - Revert Asset to Previous Version
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/assets/[assetId]/versions/[versionId]/revert/route';
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
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/rateLimit', () => ({
  RATE_LIMITS: { tier2_resource_creation: { requests: 10, window: 60 } },
}));

jest.mock('@/lib/api/project-verification', () => ({
  verifyProjectOwnership: jest.fn().mockResolvedValue({ hasAccess: true }),
}));

jest.mock('@/lib/services/assetVersionService', () => ({
  AssetVersionService: jest.fn().mockImplementation(() => ({
    revertToVersion: jest.fn().mockResolvedValue({
      success: true,
      assetId: '123e4567-e89b-12d3-a456-426614174000',
      newStorageUrl: 'supabase://assets/reverted.jpg',
      revertedToVersion: 1,
      backupVersion: 3,
    }),
  })),
}));

describe('POST /api/assets/[assetId]/versions/[versionId]/revert', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validAssetId = '123e4567-e89b-12d3-a456-426614174000';
  const validVersionId = '456e7890-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const response = await POST(
        new NextRequest(`http://localhost/api/assets/${validAssetId}/versions/${validVersionId}/revert`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ assetId: validAssetId, versionId: validVersionId }) }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid assetId UUID', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await POST(
        new NextRequest(`http://localhost/api/assets/invalid/versions/${validVersionId}/revert`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ assetId: 'invalid', versionId: validVersionId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('assetId');
    });

    it('should return 400 for invalid versionId UUID', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await POST(
        new NextRequest(`http://localhost/api/assets/${validAssetId}/versions/invalid/revert`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ assetId: validAssetId, versionId: 'invalid' }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('versionId');
    });
  });

  describe('Asset Authorization', () => {
    it('should return 404 when asset not found', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const response = await POST(
        new NextRequest(`http://localhost/api/assets/${validAssetId}/versions/${validVersionId}/revert`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ assetId: validAssetId, versionId: validVersionId }) }
      );

      expect(response.status).toBe(404);
    });

    it('should return 403 when user does not own project', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: { project_id: 'test-project', current_version: 2 },
        error: null,
      });

      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValueOnce({ hasAccess: false });

      const response = await POST(
        new NextRequest(`http://localhost/api/assets/${validAssetId}/versions/${validVersionId}/revert`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ assetId: validAssetId, versionId: validVersionId }) }
      );

      expect(response.status).toBe(403);
    });
  });

  describe('Success Cases', () => {
    it('should revert asset to previous version successfully', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: { project_id: 'test-project', current_version: 2 },
        error: null,
      });

      const response = await POST(
        new NextRequest(`http://localhost/api/assets/${validAssetId}/versions/${validVersionId}/revert`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ assetId: validAssetId, versionId: validVersionId }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.assetId).toBe(validAssetId);
      expect(data.newStorageUrl).toBeDefined();
      expect(data.revertedToVersion).toBe(1);
      expect(data.backupVersion).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when version service fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: { project_id: 'test-project', current_version: 2 },
        error: null,
      });

      const { AssetVersionService } = require('@/lib/services/assetVersionService');
      AssetVersionService.mockImplementationOnce(() => ({
        revertToVersion: jest.fn().mockRejectedValue(new Error('Revert failed')),
      }));

      const response = await POST(
        new NextRequest(`http://localhost/api/assets/${validAssetId}/versions/${validVersionId}/revert`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ assetId: validAssetId, versionId: validVersionId }) }
      );

      expect(response.status).toBe(500);
    });
  });
});
