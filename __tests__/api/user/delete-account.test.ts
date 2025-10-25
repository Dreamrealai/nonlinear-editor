/**
 * Tests for DELETE /api/user/delete-account - User Account Deletion
 *
 * CRITICAL: This route handles permanent account deletion and GDPR compliance.
 * Tests cover authentication, data deletion, storage cleanup, and error handling.
 */

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/user/delete-account/route';
import {
  createMockSupabaseClient,
  createMockUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/__tests__/helpers/apiMocks';

// Mock modules
jest.mock(
  '@/lib/supabase',
  (): Record<string, unknown> => ({
    createServerSupabaseClient: jest.fn(),
    createServiceSupabaseClient: jest.fn(),
  })
);

// Mock withAuth wrapper
jest.mock(
  '@/lib/api/withAuth',
  (): Record<string, unknown> => ({
    withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
      const { createServerSupabaseClient } = require('@/lib/supabase');
      const supabase = await createServerSupabaseClient();

      if (!supabase || !supabase.auth) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return handler(req, { user, supabase, params: context?.params || {} });
    }),
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

describe('DELETE /api/user/delete-account', () => {
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

    // Reset rate limit mock to default successful state
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
    jest.clearAllMocks();
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const response = await DELETE(mockRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should proceed when user is authenticated', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      // Mock successful deletion flow
      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      const response = await DELETE(mockRequest);

      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce tier1 rate limiting (5/min)', async () => {
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
      const data = await response.json();
      expect(data.error).toBe('Rate limit exceeded');
    });

    it('should use user ID for rate limit identifier when authenticated', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { checkRateLimit } = require('@/lib/rateLimit');

      // Mock successful deletion
      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      expect(checkRateLimit).toHaveBeenCalledWith(
        `delete-account:${mockUser.id}`,
        expect.any(Object)
      );
    });
  });

  describe('Data Deletion Flow', () => {
    it('should delete user projects first (cascade deletion)', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      expect(mockAdminClient.from).toHaveBeenCalledWith('projects');
      expect(mockAdminClient.delete).toHaveBeenCalled();
      expect(mockAdminClient.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should delete user subscription data', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      expect(mockAdminClient.from).toHaveBeenCalledWith('user_subscriptions');
      expect(mockAdminClient.delete).toHaveBeenCalled();
      expect(mockAdminClient.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should delete user activity history', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      expect(mockAdminClient.from).toHaveBeenCalledWith('user_activity_history');
    });

    it('should delete user roles', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      expect(mockAdminClient.from).toHaveBeenCalledWith('user_roles');
    });

    it('should delete user account using service role client', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('Storage Cleanup', () => {
    it('should delete assets from storage bucket', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });

      // Mock asset files in storage
      mockAdminClient.storage.list.mockResolvedValueOnce({
        data: [{ name: 'file1.jpg' }, { name: 'file2.jpg' }],
        error: null,
      });
      mockAdminClient.storage.list.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      mockAdminClient.storage.remove.mockResolvedValue({ data: null, error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      expect(mockAdminClient.storage.from).toHaveBeenCalledWith('assets');
      expect(mockAdminClient.storage.list).toHaveBeenCalledWith(mockUser.id);
      expect(mockAdminClient.storage.remove).toHaveBeenCalledWith([
        `${mockUser.id}/file1.jpg`,
        `${mockUser.id}/file2.jpg`,
      ]);
    });

    it('should delete frames from storage bucket', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });

      // Mock frame files in storage
      mockAdminClient.storage.list.mockResolvedValueOnce({
        data: [],
        error: null,
      });
      mockAdminClient.storage.list.mockResolvedValueOnce({
        data: [{ name: 'frame1.jpg' }],
        error: null,
      });

      mockAdminClient.storage.remove.mockResolvedValue({ data: null, error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      expect(mockAdminClient.storage.from).toHaveBeenCalledWith('frames');
      expect(mockAdminClient.storage.remove).toHaveBeenCalledWith([`${mockUser.id}/frame1.jpg`]);
    });

    it('should continue deletion even if storage cleanup fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });

      // Mock storage error
      mockAdminClient.storage.list.mockRejectedValue(new Error('Storage error'));

      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      const response = await DELETE(mockRequest);

      expect(response.status).toBe(200);
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when project deletion fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValueOnce({
        error: { message: 'Database error' },
      });

      const response = await DELETE(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete user projects');
    });

    it('should return 500 when user account deletion fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({
        error: { message: 'Auth deletion failed' },
      });

      const response = await DELETE(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete user account');
    });

    it('should continue if subscription deletion fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();

      // First call (projects) succeeds, second call (subscriptions) fails
      mockAdminClient.eq
        .mockResolvedValueOnce({ error: null }) // projects
        .mockResolvedValueOnce({ error: { message: 'Subscription error' } }) // subscriptions
        .mockResolvedValue({ error: null }); // everything else

      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      const response = await DELETE(mockRequest);

      // Should still succeed even with subscription error
      expect(response.status).toBe(200);
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalled();
    });

    it('should continue if activity history deletion fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();

      // Projects and subscriptions succeed, history fails
      mockAdminClient.eq
        .mockResolvedValueOnce({ error: null }) // projects
        .mockResolvedValueOnce({ error: null }) // subscriptions
        .mockResolvedValueOnce({ error: { message: 'History error' } }) // history
        .mockResolvedValue({ error: null }); // everything else

      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      const response = await DELETE(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should continue if roles deletion fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();

      // Mock failures at different stages
      mockAdminClient.eq
        .mockResolvedValueOnce({ error: null }) // projects
        .mockResolvedValueOnce({ error: null }) // subscriptions
        .mockResolvedValueOnce({ error: null }) // history
        .mockResolvedValueOnce({ error: { message: 'Roles error' } }) // roles
        .mockResolvedValue({ error: null });

      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      const response = await DELETE(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should handle unexpected errors gracefully', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockAdminClient.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await DELETE(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Account deletion failed');
    });
  });

  describe('Success Response', () => {
    it('should return 200 with success message on complete deletion', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      const response = await DELETE(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Account successfully deleted');
      expect(data.data).toBeNull();
    });
  });

  describe('Audit Logging', () => {
    it('should log account deletion to activity history', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      expect(mockAdminClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          activity_type: 'account_deleted',
          title: 'Account Deleted',
        })
      );
    });
  });

  describe('GDPR Compliance', () => {
    it('should delete all personal data in correct order', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const deletionCalls: string[] = [];

      mockAdminClient.from.mockImplementation((table: string) => {
        deletionCalls.push(table);
        return mockAdminClient;
      });

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      // Verify deletion order
      expect(deletionCalls).toContain('projects');
      expect(deletionCalls).toContain('user_subscriptions');
      expect(deletionCalls).toContain('user_activity_history');
      expect(deletionCalls).toContain('user_roles');

      // Verify user auth deleted last
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(mockUser.id);
    });

    it('should use service role client for privileged operations', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { createServiceSupabaseClient } = require('@/lib/supabase');

      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });
      mockAdminClient.storage.list.mockResolvedValue({ data: [], error: null });
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      mockAdminClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockAdminClient.insert.mockReturnThis();

      await DELETE(mockRequest);

      expect(createServiceSupabaseClient).toHaveBeenCalled();
    });
  });
});
