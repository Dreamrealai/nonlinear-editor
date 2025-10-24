/**
 * Tests for Project Backup Routes:
 * - GET /api/projects/[projectId]/backups - List backups
 * - POST /api/projects/[projectId]/backups - Create backup
 * - POST /api/projects/[projectId]/backups/[backupId]/restore - Restore backup
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/projects/[projectId]/backups/route';
import { POST as restoreBackup } from '@/app/api/projects/[projectId]/backups/[backupId]/restore/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

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

jest.mock('@/lib/supabase', () => ({ createServerSupabaseClient: jest.fn() }));
jest.mock('@/lib/serverLogger', () => ({ serverLogger: { info: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/rateLimit', () => ({ RATE_LIMITS: { tier3_status_read: { requests: 60, window: 60 }, tier2_resource_creation: { requests: 10, window: 60 } } }));
jest.mock('@/lib/services/backupService', () => ({
  BackupService: jest.fn().mockImplementation(() => ({
    listBackups: jest.fn().mockResolvedValue([
      { id: 'backup-1', created_at: '2024-01-01', backup_type: 'manual', backup_name: 'Test Backup' },
    ]),
    createBackup: jest.fn().mockResolvedValue({ id: 'new-backup', created_at: '2024-01-02' }),
    restoreBackup: jest.fn().mockResolvedValue(undefined),
  })),
}));

const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
const validBackupId = '456e7890-e89b-12d3-a456-426614174000';

describe('GET /api/projects/[projectId]/backups', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => resetAllMocks());

  it('should return 401 when not authenticated', async () => {
    mockUnauthenticatedUser(mockSupabase);
    const response = await GET(new NextRequest(`http://localhost/api/projects/${validProjectId}/backups`), { params: Promise.resolve({ projectId: validProjectId }) });
    expect(response.status).toBe(401);
  });

  it('should list backups for project', async () => {
    mockAuthenticatedUser(mockSupabase);
    const response = await GET(new NextRequest(`http://localhost/api/projects/${validProjectId}/backups`), { params: Promise.resolve({ projectId: validProjectId }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.backups).toHaveLength(1);
    expect(data.count).toBe(1);
  });

  it('should return 400 for invalid projectId', async () => {
    mockAuthenticatedUser(mockSupabase);
    const response = await GET(new NextRequest('http://localhost/api/projects/invalid/backups'), { params: Promise.resolve({ projectId: 'invalid' }) });
    expect(response.status).toBe(400);
  });

  it('should return 500 on service error', async () => {
    mockAuthenticatedUser(mockSupabase);
    const { BackupService } = require('@/lib/services/backupService');
    BackupService.mockImplementationOnce(() => ({
      listBackups: jest.fn().mockRejectedValue(new Error('Service error')),
    }));
    const response = await GET(new NextRequest(`http://localhost/api/projects/${validProjectId}/backups`), { params: Promise.resolve({ projectId: validProjectId }) });
    expect(response.status).toBe(500);
  });
});

describe('POST /api/projects/[projectId]/backups', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => resetAllMocks());

  it('should return 401 when not authenticated', async () => {
    mockUnauthenticatedUser(mockSupabase);
    const response = await POST(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups`, { method: 'POST', body: JSON.stringify({ backupType: 'manual' }) }),
      { params: Promise.resolve({ projectId: validProjectId }) }
    );
    expect(response.status).toBe(401);
  });

  it('should create manual backup', async () => {
    mockAuthenticatedUser(mockSupabase);
    const response = await POST(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups`, { method: 'POST', body: JSON.stringify({ backupType: 'manual', backupName: 'My Backup' }) }),
      { params: Promise.resolve({ projectId: validProjectId }) }
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should create auto backup', async () => {
    mockAuthenticatedUser(mockSupabase);
    const response = await POST(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups`, { method: 'POST', body: JSON.stringify({ backupType: 'auto' }) }),
      { params: Promise.resolve({ projectId: validProjectId }) }
    );
    expect(response.status).toBe(200);
  });
});

describe('POST /api/projects/[projectId]/backups/[backupId]/restore', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => resetAllMocks());

  it('should return 401 when not authenticated', async () => {
    mockUnauthenticatedUser(mockSupabase);
    const response = await restoreBackup(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`, { method: 'POST' }),
      { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
    );
    expect(response.status).toBe(401);
  });

  it('should restore backup successfully', async () => {
    mockAuthenticatedUser(mockSupabase);
    const response = await restoreBackup(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`, { method: 'POST' }),
      { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('restored successfully');
  });

  it('should return 400 for invalid projectId', async () => {
    mockAuthenticatedUser(mockSupabase);
    const response = await restoreBackup(
      new NextRequest(`http://localhost/api/projects/invalid/backups/${validBackupId}/restore`, { method: 'POST' }),
      { params: Promise.resolve({ projectId: 'invalid', backupId: validBackupId }) }
    );
    expect(response.status).toBe(400);
  });

  it('should return 400 for invalid backupId', async () => {
    mockAuthenticatedUser(mockSupabase);
    const response = await restoreBackup(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/invalid/restore`, { method: 'POST' }),
      { params: Promise.resolve({ projectId: validProjectId, backupId: 'invalid' }) }
    );
    expect(response.status).toBe(400);
  });

  it('should return 500 on service error', async () => {
    mockAuthenticatedUser(mockSupabase);
    const { BackupService } = require('@/lib/services/backupService');
    BackupService.mockImplementationOnce(() => ({
      restoreBackup: jest.fn().mockRejectedValue(new Error('Restore failed')),
    }));
    const response = await restoreBackup(
      new NextRequest(`http://localhost/api/projects/${validProjectId}/backups/${validBackupId}/restore`, { method: 'POST' }),
      { params: Promise.resolve({ projectId: validProjectId, backupId: validBackupId }) }
    );
    expect(response.status).toBe(500);
  });
});
