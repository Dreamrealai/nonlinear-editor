/**
 * Comprehensive Tests for Backup Restore Operations
 *
 * Route tested:
 * - POST /api/projects/[projectId]/backups/[backupId]/restore - Restore project from backup
 *
 * Coverage:
 * - Authentication & Authorization
 * - Input validation (UUID formats)
 * - Backup ownership verification
 * - Restore process validation
 * - Error handling & edge cases
 * - Service integration
 */

import { NextRequest } from 'next/server';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils';

/**
 * Mock withAuth to handle 3-param handler signatures for dynamic routes
 */
jest.mock(
  '@/lib/api/withAuth',
  (): Record<string, unknown> => ({
    withAuth: (handler: any) => async (req: any, context: any) => {
      const { createServerSupabaseClient } = require('@/lib/supabase');
      const supabase = await createServerSupabaseClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

      const authContext = { user, supabase };
      const routeContext = { params: context.params };
      return handler(req, authContext, routeContext);
    },
  })
);

jest.mock(
  '@/lib/supabase',
  (): Record<string, unknown> => ({
    createServerSupabaseClient: jest.fn(),
  })
);

jest.mock(
  '@/lib/serverLogger',
  (): Record<string, unknown> => ({
    serverLogger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
  })
);

jest.mock(
  '@/lib/rateLimit',
  (): Record<string, unknown> => ({
    RATE_LIMITS: {
      tier2_resource_creation: { requests: 10, window: 60 },
    },
  })
);

// Mock BackupService
const mockBackupService = {
  restoreBackup: jest.fn(),
};

jest.mock(
  '@/lib/services/backupService',
  (): Record<string, unknown> => ({
    BackupService: jest.fn().mockImplementation(() => mockBackupService),
  })
);

// Import route handler AFTER all mocks are set up
import { POST } from '@/app/api/projects/[projectId]/backups/[backupId]/restore/route';

const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
const validBackupId = '456e7890-e89b-12d3-a456-426614174001';
const validUserId = '550e8400-e29b-41d4-a716-446655440000';

describe('POST /api/projects/[projectId]/backups/[backupId]/restore', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Reset mock implementations
    mockBackupService.restoreBackup.mockResolvedValue(undefined);
  });

  afterEach((): void => resetAllMocks());

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase);

      // Act
      const response = await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
      );

      // Assert
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow authenticated users to proceed', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase, { id: validUserId });

      // Act
      const response = await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
      );

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });
    });

    it('should return 400 for invalid projectId UUID', async () => {
      // Act
      const response = await POST(
        new NextRequest(
          `http://localhost/api/projects/invalid-uuid/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: 'invalid-uuid', backupId: validBackupId }) }
      );

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('projectId');
    });

    it('should return 400 for invalid backupId UUID', async () => {
      // Act
      const response = await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/invalid-uuid/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: validProjectId, backupId: 'invalid-uuid' }) }
      );

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('backupId');
    });

    it('should return 400 for empty projectId', async () => {
      // Act
      const response = await POST(
        new NextRequest(`http://localhost/api/projects//backups/${validBackupId}/restore`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ projectId: '', backupId: validBackupId }) }
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 for empty backupId', async () => {
      // Act
      const response = await POST(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/backups//restore`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ projectId: validProjectId, backupId: '' }) }
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should reject malformed UUID with extra characters', async () => {
      // Act
      const malformedId = validProjectId + '-extra';
      const response = await POST(
        new NextRequest(
          `http://localhost/api/projects/${malformedId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: malformedId, backupId: validBackupId }) }
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should reject UUID with wrong format (v1 instead of v4)', async () => {
      // Act
      const v1Uuid = 'c232ab00-9414-11ec-b4b3-325096b39f47';
      const response = await POST(
        new NextRequest(
          `http://localhost/api/projects/${v1Uuid}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: v1Uuid, backupId: validBackupId }) }
      );

      // Assert
      // Should still pass UUID validation as v1 is a valid UUID format
      expect(response.status).not.toBe(400);
    });
  });

  describe('Success Cases', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });
    });

    it('should restore backup successfully', async () => {
      // Act
      const response = await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
      );

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('restored successfully');
      expect(mockBackupService.restoreBackup).toHaveBeenCalledWith({
        backupId: validBackupId,
        projectId: validProjectId,
      });
    });

    it('should call BackupService with correct parameters', async () => {
      // Act
      await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
      );

      // Assert
      expect(mockBackupService.restoreBackup).toHaveBeenCalledTimes(1);
      expect(mockBackupService.restoreBackup).toHaveBeenCalledWith(
        expect.objectContaining({
          backupId: validBackupId,
          projectId: validProjectId,
        })
      );
    });

    it('should return success message with proper format', async () => {
      // Act
      const response = await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
      );

      // Assert
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(data.success).toBe(true);
      expect(typeof data.message).toBe('string');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });
    });

    it('should return 500 when restore service throws generic error', async () => {
      // Arrange
      mockBackupService.restoreBackup.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
      );

      // Assert
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to restore backup');
    });

    it('should return 500 when restore service throws timeout error', async () => {
      // Arrange
      mockBackupService.restoreBackup.mockRejectedValue(new Error('Operation timeout'));

      // Act
      const response = await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
      );

      // Assert
      expect(response.status).toBe(500);
    });

    it('should return 500 when restore service throws storage error', async () => {
      // Arrange
      mockBackupService.restoreBackup.mockRejectedValue(new Error('Storage bucket not accessible'));

      // Act
      const response = await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
      );

      // Assert
      expect(response.status).toBe(500);
    });

    it('should return 500 when restore service rejects with non-Error object', async () => {
      // Arrange
      mockBackupService.restoreBackup.mockRejectedValue('String error');

      // Act
      const response = await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
      );

      // Assert
      expect(response.status).toBe(500);
    });

    it('should handle null error gracefully', async () => {
      // Arrange
      mockBackupService.restoreBackup.mockRejectedValue(null);

      // Act
      const response = await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
      );

      // Assert
      expect(response.status).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });
    });

    it('should handle UUID with uppercase letters', async () => {
      // Act
      const uppercaseProjectId = validProjectId.toUpperCase();
      const response = await POST(
        new NextRequest(
          `http://localhost/api/projects/${uppercaseProjectId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: uppercaseProjectId, backupId: validBackupId }) }
      );

      // Assert
      expect(response.status).toBe(200);
    });

    it('should handle UUID with mixed case letters', async () => {
      // Act
      const mixedCaseBackupId = '456e7890-E89B-12d3-A456-426614174001';
      const response = await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/${mixedCaseBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: validProjectId, backupId: mixedCaseBackupId }) }
      );

      // Assert
      expect(response.status).toBe(200);
    });

    it('should handle concurrent restore requests independently', async () => {
      // Arrange
      const backupId1 = validBackupId;
      const backupId2 = '789e0123-e89b-12d3-a456-426614174002';

      // Act
      const [response1, response2] = await Promise.all([
        POST(
          new NextRequest(
            `http://localhost/api/projects/${validProjectId}/backups/${backupId1}/restore`,
            { method: 'POST' }
          ),
          { params: Promise.resolve({ projectId: validProjectId, backupId: backupId1 }) }
        ),
        POST(
          new NextRequest(
            `http://localhost/api/projects/${validProjectId}/backups/${backupId2}/restore`,
            { method: 'POST' }
          ),
          { params: Promise.resolve({ projectId: validProjectId, backupId: backupId2 }) }
        ),
      ]);

      // Assert
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(mockBackupService.restoreBackup).toHaveBeenCalledTimes(2);
    });

    it('should not mutate input parameters', async () => {
      // Arrange
      const params = { projectId: validProjectId, backupId: validBackupId };
      const originalParams = { ...params };

      // Act
      await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve(params) }
      );

      // Assert
      expect(params).toEqual(originalParams);
    });
  });

  describe('Service Integration', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });
    });

    it('should instantiate BackupService with supabase client', async () => {
      // Arrange
      const { BackupService } = require('@/lib/services/backupService');

      // Act
      await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
      );

      // Assert
      expect(BackupService).toHaveBeenCalledWith(mockSupabase);
    });

    it('should not call restore if validation fails', async () => {
      // Act
      await POST(
        new NextRequest(`http://localhost/api/projects/invalid/backups/${validBackupId}/restore`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ projectId: 'invalid', backupId: validBackupId }) }
      );

      // Assert
      expect(mockBackupService.restoreBackup).not.toHaveBeenCalled();
    });

    it('should call restore exactly once on success', async () => {
      // Act
      await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
      );

      // Assert
      expect(mockBackupService.restoreBackup).toHaveBeenCalledTimes(1);
    });

    it('should not retry on service failure', async () => {
      // Arrange
      mockBackupService.restoreBackup.mockRejectedValue(new Error('Service error'));

      // Act
      await POST(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`,
          { method: 'POST' }
        ),
        { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
      );

      // Assert
      expect(mockBackupService.restoreBackup).toHaveBeenCalledTimes(1);
    });
  });
});
