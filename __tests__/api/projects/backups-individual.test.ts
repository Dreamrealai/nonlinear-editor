/**
 * Tests for Individual Backup Routes:
 * - GET /api/projects/[projectId]/backups/[backupId] - Get backup details (download)
 * - DELETE /api/projects/[projectId]/backups/[backupId] - Delete backup
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

/**
 * Mock withAuth to handle both 2-param and 3-param handler signatures
 */
jest.mock(
  '@/lib/api/withAuth',
  () => ({
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

      // Check if this is a dynamic route (has params)
      if (context?.params !== undefined) {
        const routeContext = { params: context.params };
        return handler(req, authContext, routeContext);
      } else {
        return handler(req, authContext);
      }
    },
  })
);

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
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      child: jest.fn(
        () => ({
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
          debug: jest.fn(),
        })
      ),
    },
  })
);

jest.mock(
  '@/lib/rateLimit',
  () => ({
    RATE_LIMITS: {
      tier3_status_read: { requests: 60, window: 60 },
      tier2_resource_creation: { requests: 10, window: 60 },
    },
  })
);

jest.mock(
  '@/lib/auditLog',
  () => ({
    auditSecurityEvent: jest.fn().mockResolvedValue(undefined),
    auditRateLimitViolation: jest.fn().mockResolvedValue(undefined),
    AuditAction: { SECURITY_UNAUTHORIZED_ACCESS: 'security.unauthorized_access' },
  })
);

// Mock BackupService
const mockBackup = {
  id: 'backup-1',
  project_id: 'project-1',
  user_id: 'user-1',
  backup_name: 'Test Backup',
  backup_type: 'manual',
  project_data: {
    id: 'project-1',
    title: 'Test Project',
    user_id: 'user-1',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  timeline_data: { clips: [] },
  assets_snapshot: [],
  created_at: '2024-01-01',
};

jest.mock(
  '@/lib/services/backupService',
  () => ({
    BackupService: jest.fn().mockImplementation(() => ({
      getBackup: jest.fn().mockResolvedValue(mockBackup),
      deleteBackup: jest.fn().mockResolvedValue(undefined),
      exportBackupAsJSON: jest.fn().mockReturnValue(JSON.stringify(mockBackup, null, 2)),
    })),
  })
);

// Import route handlers AFTER all mocks are set up
import { GET, DELETE } from '@/app/api/projects/[projectId]/backups/[backupId]/route';

const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
const validBackupId = '456e7890-e89b-12d3-a456-426614174000';

describe('GET /api/projects/[projectId]/backups/[backupId]', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach((): void => {
    if (mockSupabase) {
      resetAllMocks(mockSupabase);
    }
  });

  it('should return 401 when not authenticated', async () => {
    // Arrange
    mockUnauthenticatedUser(mockSupabase);

    // Act
    const response = await GET(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/${validBackupId}`),
      { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
    );

    // Assert
    expect(response.status).toBe(401);
  });

  it('should return backup as JSON download', async () => {
    // Arrange
    mockAuthenticatedUser(mockSupabase);

    // Act
    const response = await GET(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/${validBackupId}`),
      { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    expect(response.headers.get('Content-Disposition')).toContain('backup-');
  });

  it('should return 404 when backup not found', async () => {
    // Arrange
    mockAuthenticatedUser(mockSupabase);
    const { BackupService } = require('@/lib/services/backupService');
    BackupService.mockImplementationOnce(() => ({
      getBackup: jest.fn().mockResolvedValue(null),
    }));

    // Act
    const response = await GET(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/${validBackupId}`),
      { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
    );

    // Assert
    expect(response.status).toBe(404);
  });

  it('should return 403 when backup does not belong to project', async () => {
    // Arrange
    mockAuthenticatedUser(mockSupabase);
    const { BackupService } = require('@/lib/services/backupService');
    BackupService.mockImplementationOnce(() => ({
      getBackup: jest.fn().mockResolvedValue({
        ...mockBackup,
        project_id: 'different-project-id',
      }),
    }));

    // Act
    const response = await GET(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/${validBackupId}`),
      { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
    );

    // Assert
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('does not belong to project');
  });

  it('should return 400 for invalid projectId', async () => {
    // Arrange
    mockAuthenticatedUser(mockSupabase);

    // Act
    const response = await GET(
      new NextRequest(`http://localhost/api/projects/invalid/backups/${validBackupId}`),
      { params: Promise.resolve({ projectId: 'invalid', backupId: validBackupId }) }
    );

    // Assert
    expect(response.status).toBe(400);
  });

  it('should return 400 for invalid backupId', async () => {
    // Arrange
    mockAuthenticatedUser(mockSupabase);

    // Act
    const response = await GET(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/invalid`),
      { params: Promise.resolve({ projectId: validProjectId, backupId: 'invalid' }) }
    );

    // Assert
    expect(response.status).toBe(400);
  });

  it('should return 400 when projectId is missing', async () => {
    // Arrange
    mockAuthenticatedUser(mockSupabase);

    // Act
    const response = await GET(
      new NextRequest(`http://localhost/api/projects//backups/${validBackupId}`),
      { params: Promise.resolve({ projectId: '', backupId: validBackupId }) }
    );

    // Assert
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('required');
  });

  it('should return 500 on service error', async () => {
    // Arrange
    mockAuthenticatedUser(mockSupabase);
    const { BackupService } = require('@/lib/services/backupService');
    BackupService.mockImplementationOnce(() => ({
      getBackup: jest.fn().mockRejectedValue(new Error('Database error')),
    }));

    // Act
    const response = await GET(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/${validBackupId}`),
      { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
    );

    // Assert
    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/projects/[projectId]/backups/[backupId]', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach((): void => {
    if (mockSupabase) {
      resetAllMocks(mockSupabase);
    }
  });

  it('should return 401 when not authenticated', async () => {
    // Arrange
    mockUnauthenticatedUser(mockSupabase);

    // Act
    const response = await DELETE(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/${validBackupId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
    );

    // Assert
    expect(response.status).toBe(401);
  });

  it('should delete backup successfully', async () => {
    // Arrange
    mockAuthenticatedUser(mockSupabase);

    // Act
    const response = await DELETE(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/${validBackupId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
    );

    // Assert
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('deleted successfully');
  });

  it('should return 404 when backup not found', async () => {
    // Arrange
    mockAuthenticatedUser(mockSupabase);
    const { BackupService } = require('@/lib/services/backupService');
    BackupService.mockImplementationOnce(() => ({
      getBackup: jest.fn().mockResolvedValue(null),
      deleteBackup: jest.fn(),
    }));

    // Act
    const response = await DELETE(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/${validBackupId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
    );

    // Assert
    expect(response.status).toBe(404);
  });

  it('should return 403 when backup does not belong to project', async () => {
    // Arrange
    mockAuthenticatedUser(mockSupabase);
    const { BackupService } = require('@/lib/services/backupService');
    BackupService.mockImplementationOnce(() => ({
      getBackup: jest.fn().mockResolvedValue({
        ...mockBackup,
        project_id: 'different-project-id',
      }),
      deleteBackup: jest.fn(),
    }));

    // Act
    const response = await DELETE(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/${validBackupId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
    );

    // Assert
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('does not belong to project');
  });

  it('should return 400 for invalid projectId', async () => {
    // Arrange
    mockAuthenticatedUser(mockSupabase);

    // Act
    const response = await DELETE(
      new NextRequest(`http://localhost/api/projects/invalid/backups/${validBackupId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ projectId: 'invalid', backupId: validBackupId }) }
    );

    // Assert
    expect(response.status).toBe(400);
  });

  it('should return 400 for invalid backupId', async () => {
    // Arrange
    mockAuthenticatedUser(mockSupabase);

    // Act
    const response = await DELETE(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/invalid`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ projectId: validProjectId, backupId: 'invalid' }) }
    );

    // Assert
    expect(response.status).toBe(400);
  });

  it('should return 500 on delete failure', async () => {
    // Arrange
    mockAuthenticatedUser(mockSupabase);
    const { BackupService } = require('@/lib/services/backupService');
    BackupService.mockImplementationOnce(() => ({
      getBackup: jest.fn().mockResolvedValue(mockBackup),
      deleteBackup: jest.fn().mockRejectedValue(new Error('Delete failed')),
    }));

    // Act
    const response = await DELETE(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/${validBackupId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
    );

    // Assert
    expect(response.status).toBe(500);
  });

  it('should verify backup ownership before deleting', async () => {
    // Arrange
    mockAuthenticatedUser(mockSupabase);
    const { BackupService } = require('@/lib/services/backupService');
    const mockGetBackup = jest.fn().mockResolvedValue(mockBackup);
    const mockDeleteBackup = jest.fn().mockResolvedValue(undefined);

    BackupService.mockImplementationOnce(() => ({
      getBackup: mockGetBackup,
      deleteBackup: mockDeleteBackup,
    }));

    // Act
    await DELETE(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/${validBackupId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
    );

    // Assert
    expect(mockGetBackup).toHaveBeenCalledWith(validBackupId);
    expect(mockDeleteBackup).toHaveBeenCalledWith(validBackupId);
  });
});
