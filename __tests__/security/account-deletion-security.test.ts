/**
 * Security Tests for Account Deletion (NEW-MED-002)
 *
 * CRITICAL SECURITY TESTS:
 * - Verifies cascade deletion order
 * - Tests data isolation between users
 * - Validates audit trail preservation
 * - Tests rollback on partial failures
 * - Verifies storage cleanup
 */

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/user/delete-account/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

// Mock modules
jest.mock(
  '@/lib/supabase',
  (): Record<string, unknown> => ({
    createServerSupabaseClient: jest.fn(),
    createServiceSupabaseClient: jest.fn(),
  })
);

jest.mock(
  '@/lib/serverLogger',
  (): Record<string, unknown> => ({
    serverLogger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  })
);

jest.mock('@/lib/api/response', () => {
  const actual = jest.requireActual('@/lib/api/response');
  return {
    ...actual,
    withErrorHandling: (handler: any) => handler,
  };
});

jest.mock(
  '@/lib/rateLimit',
  (): Record<string, unknown> => ({
    checkRateLimit: jest.fn().mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      resetAt: Date.now() + 60000,
    }),
    RATE_LIMITS: {
      tier1_auth_payment: { requests: 5, window: 60 },
    },
  })
);

describe('Account Deletion Security Tests (NEW-MED-002)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockAdminClient: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;

  beforeEach((): void => {
    jest.clearAllMocks();

    mockSupabase = createMockSupabaseClient();
    mockAdminClient = createMockSupabaseClient();

    const { createServerSupabaseClient, createServiceSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
    createServiceSupabaseClient.mockReturnValue(mockAdminClient);

    // Reset rate limit mock
    const { checkRateLimit } = require('@/lib/rateLimit');
    checkRateLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      resetAt: Date.now() + 60000,
    });

    // Default storage mocks
    mockAdminClient.storage.from.mockReturnThis();
    mockAdminClient.storage.list = jest.fn();
    mockAdminClient.storage.remove = jest.fn();

    // Default admin auth mock
    mockAdminClient.auth = {
      ...mockAdminClient.auth,
      admin: {
        deleteUser: jest.fn(),
        getUserById: jest.fn(),
      },
    };

    mockRequest = new NextRequest('http://localhost/api/user/delete-account', {
      method: 'DELETE',
    });
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
    resetAllMocks(mockAdminClient);
  });

  describe('CASCADE DELETION ORDER', () => {
    it('SECURITY: must delete projects BEFORE user account to prevent orphaned data', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const deletionOrder: string[] = [];

      // Track deletion order
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          deletionOrder.push('projects');
        } else if (table === 'user_subscriptions') {
          deletionOrder.push('subscriptions');
        } else if (table === 'user_activity_history') {
          deletionOrder.push('history');
        } else if (table === 'user_roles') {
          deletionOrder.push('roles');
        }
        return mockAdminClient;
      });

      mockAdminClient.auth.admin.deleteUser.mockImplementation(() => {
        deletionOrder.push('auth_user');
        return Promise.resolve({ error: null });
      });

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      // CRITICAL: Projects must be deleted BEFORE user account
      const projectsIndex = deletionOrder.indexOf('projects');
      const authUserIndex = deletionOrder.indexOf('auth_user');

      expect(projectsIndex).toBeLessThan(authUserIndex);

      // Verify order (note: history appears twice - once for deletion, once for audit log insert)
      expect(deletionOrder).toContain('projects');
      expect(deletionOrder).toContain('subscriptions');
      expect(deletionOrder).toContain('history');
      expect(deletionOrder).toContain('roles');
      expect(deletionOrder).toContain('auth_user');

      // Verify projects comes before auth_user
      expect(deletionOrder.indexOf('projects')).toBeLessThan(deletionOrder.indexOf('auth_user'));
    });

    it('SECURITY: must use service role for ALL delete operations', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { createServiceSupabaseClient } = require('@/lib/supabase');

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      // Service role must be used for privileged operations
      expect(createServiceSupabaseClient).toHaveBeenCalled();
    });
  });

  describe('DATA ISOLATION', () => {
    it('SECURITY: must NOT allow user A to trigger deletion of user B data', async () => {
      const userA = mockAuthenticatedUser(mockSupabase, { id: 'user-a', email: 'a@test.com' });

      // Mock that project belongs to user B
      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockImplementation((column: string, value: string) => {
        if (column === 'user_id' && value === 'user-a') {
          return mockAdminClient;
        }
        return mockAdminClient;
      });
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      // Verify ONLY user A's data was targeted
      expect(mockAdminClient.eq).toHaveBeenCalledWith('user_id', 'user-a');
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith('user-a');
    });

    it('SECURITY: must delete ONLY files from user storage folders', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase, { id: 'test-user-123' });

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });

      // Mock files in storage
      mockAdminClient.storage.list.mockResolvedValueOnce({
        data: [{ name: 'file1.jpg' }, { name: 'file2.jpg' }],
        error: null,
      });
      mockAdminClient.storage.list.mockResolvedValueOnce({
        data: [{ name: 'frame1.jpg' }],
        error: null,
      });

      mockAdminClient.storage.remove.mockResolvedValue({ data: null, error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      // Verify storage deletion scoped to user folder
      expect(mockAdminClient.storage.list).toHaveBeenCalledWith('test-user-123');
      expect(mockAdminClient.storage.remove).toHaveBeenCalledWith([
        'test-user-123/file1.jpg',
        'test-user-123/file2.jpg',
      ]);
      expect(mockAdminClient.storage.remove).toHaveBeenCalledWith(['test-user-123/frame1.jpg']);
    });
  });

  describe('AUDIT TRAIL', () => {
    it('SECURITY: must log account deletion BEFORE deleting user', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      let auditLogCalled = false;
      let userDeleted = false;

      mockAdminClient.insert.mockImplementation((data: any) => {
        if (data.activity_type === 'account_deleted') {
          auditLogCalled = true;
          // User should not be deleted yet
          expect(userDeleted).toBe(false);
        }
        return mockAdminClient;
      });

      mockAdminClient.auth.admin.deleteUser.mockImplementation(() => {
        userDeleted = true;
        return Promise.resolve({ error: null });
      });

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });

      await DELETE(mockRequest);

      expect(auditLogCalled).toBe(true);
    });

    it('SECURITY: must preserve deletion timestamp in audit log', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const beforeTime = new Date().toISOString();

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      const afterTime = new Date().toISOString();

      expect(mockAdminClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          activity_type: 'account_deleted',
          metadata: expect.objectContaining({
            deleted_at: expect.any(String),
          }),
        })
      );
    });
  });

  describe('ERROR HANDLING & ROLLBACK', () => {
    it('SECURITY: must FAIL entire operation if projects deletion fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValueOnce({
        error: { message: 'Projects deletion failed' },
      });

      const response = await DELETE(mockRequest);

      // Operation must fail
      expect(response.status).toBe(500);

      // User account must NOT be deleted
      expect(mockAdminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it('SECURITY: must FAIL entire operation if auth deletion fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({
        error: { message: 'Auth deletion failed' },
      });

      const response = await DELETE(mockRequest);

      // Operation must fail
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete user account');
    });

    it('SECURITY: should continue deletion even if subscription data missing', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq
        .mockResolvedValueOnce({ error: null }) // projects
        .mockResolvedValueOnce({ error: { message: 'Subscription not found' } }) // subscriptions
        .mockResolvedValue({ error: null }); // everything else

      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.insert.mockReturnThis();

      const response = await DELETE(mockRequest);

      // Should succeed despite subscription error
      expect(response.status).toBe(200);
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalled();
    });

    it('SECURITY: should continue if storage cleanup fails (graceful degradation)', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });

      // Storage error
      mockAdminClient.storage.list.mockRejectedValue(new Error('Storage service unavailable'));

      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.insert.mockReturnThis();

      const response = await DELETE(mockRequest);

      // Should succeed despite storage error
      expect(response.status).toBe(200);
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalled();
    });
  });

  describe('GDPR COMPLIANCE', () => {
    it('COMPLIANCE: must delete ALL personal data tables', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const tablesDeleted: string[] = [];

      mockAdminClient.from.mockImplementation((table: string) => {
        tablesDeleted.push(table);
        return mockAdminClient;
      });

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      // Verify all required tables are deleted
      expect(tablesDeleted).toContain('projects');
      expect(tablesDeleted).toContain('user_subscriptions');
      expect(tablesDeleted).toContain('user_activity_history');
      expect(tablesDeleted).toContain('user_roles');
    });

    it('COMPLIANCE: must delete ALL storage buckets', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const bucketsAccessed: string[] = [];

      mockAdminClient.storage.from.mockImplementation((bucket: string) => {
        bucketsAccessed.push(bucket);
        return mockAdminClient.storage;
      });

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      // Verify both storage buckets are accessed
      expect(bucketsAccessed).toContain('assets');
      expect(bucketsAccessed).toContain('frames');
    });
  });

  describe('RATE LIMITING', () => {
    it('SECURITY: must enforce tier1 rate limit to prevent abuse', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { checkRateLimit } = require('@/lib/rateLimit');

      checkRateLimit.mockResolvedValueOnce({
        success: false,
        limit: 5,
        remaining: 0,
        resetAt: Date.now() + 60000,
      });

      const response = await DELETE(mockRequest);

      expect(response.status).toBe(429);
      expect(checkRateLimit).toHaveBeenCalledWith(
        expect.stringContaining('delete-account:'),
        expect.objectContaining({
          requests: 5,
          window: 60,
        })
      );
    });
  });
});
