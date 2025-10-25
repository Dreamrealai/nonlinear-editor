/**
 * Tests for POST /api/admin/delete-user - Admin Delete User Account
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/delete-user/route';
import { createMockSupabaseClient, resetAllMocks } from '@/test-utils/mockSupabase';

// Mock service Supabase client
jest.mock('@/lib/supabase', (): Record<string, unknown> => ({
  createServiceSupabaseClient: jest.fn(),
}));

// Mock withAdminAuth wrapper
jest.mock('@/lib/api/withAuth', (): Record<string, unknown> => ({
  withAdminAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
    const mockAdmin = {
      id: 'admin-123',
      email: 'admin@example.com',
      user_metadata: { is_admin: true },
    };
    return handler(req, { user: mockAdmin, supabase: null, params: context?.params || {} });
  }),
  logAdminAction: jest.fn(),
}));

// Mock server logger
jest.mock('@/lib/serverLogger', (): Record<string, unknown> => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock validation
jest.mock('@/lib/api/validation', (): Record<string, unknown> => ({
  validateUUID: jest.fn((id: string, field: string) => {
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return { valid: false, errors: [{ field, message: `${field} must be a valid UUID` }] };
    }
    return { valid: true, errors: [] };
  }),
  validateAll: jest.fn((validations) => {
    const errors = validations.flatMap((v: any) => v.errors || []);
    return { valid: errors.length === 0, errors };
  }),
}));

describe('POST /api/admin/delete-user', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validUserId = '550e8400-e29b-41d4-a716-446655440000';
  const adminId = 'admin-123';

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServiceSupabaseClient } = require('@/lib/supabase');
    createServiceSupabaseClient.mockReturnValue(mockSupabase);
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
  });

  describe('Input Validation', () => {
    it('should return 400 when userId is missing', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/delete-user', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    it('should return 400 for invalid UUID format', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/delete-user', {
        method: 'POST',
        body: JSON.stringify({ userId: 'not-a-uuid' }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('UUID');
    });

    it('should return 400 when admin tries to delete themselves', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/delete-user', {
        method: 'POST',
        body: JSON.stringify({ userId: adminId }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot delete your own account');
    });
  });

  describe('Success Cases', () => {
    it('should delete user successfully', async () => {
      // Mock getUserById response
      mockSupabase.auth.admin.getUserById = jest.fn().mockResolvedValue({
        data: {
          user: {
            id: validUserId,
            email: 'user@example.com',
          },
        },
        error: null,
      });

      // Mock deleteUser response
      mockSupabase.auth.admin.deleteUser = jest.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/delete-user', {
        method: 'POST',
        body: JSON.stringify({ userId: validUserId }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain('deleted successfully');
      expect(mockSupabase.auth.admin.getUserById).toHaveBeenCalledWith(validUserId);
      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith(validUserId);
    });

    it('should log admin action after successful deletion', async () => {
      const { logAdminAction } = require('@/lib/api/withAuth');

      mockSupabase.auth.admin.getUserById = jest.fn().mockResolvedValue({
        data: {
          user: {
            id: validUserId,
            email: 'user@example.com',
          },
        },
        error: null,
      });

      mockSupabase.auth.admin.deleteUser = jest.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/delete-user', {
        method: 'POST',
        body: JSON.stringify({ userId: validUserId }),
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(logAdminAction).toHaveBeenCalledWith(
        mockSupabase,
        'delete_user',
        adminId,
        validUserId,
        expect.objectContaining({
          adminEmail: 'admin@example.com',
          targetEmail: 'user@example.com',
        })
      );
    });

    it('should get user info before deletion for audit', async () => {
      mockSupabase.auth.admin.getUserById = jest.fn().mockResolvedValue({
        data: {
          user: {
            id: validUserId,
            email: 'deleted@example.com',
          },
        },
        error: null,
      });

      mockSupabase.auth.admin.deleteUser = jest.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/delete-user', {
        method: 'POST',
        body: JSON.stringify({ userId: validUserId }),
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(mockSupabase.auth.admin.getUserById).toHaveBeenCalledBefore(
        mockSupabase.auth.admin.deleteUser as jest.Mock
      );
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when deletion fails', async () => {
      mockSupabase.auth.admin.getUserById = jest.fn().mockResolvedValue({
        data: {
          user: {
            id: validUserId,
            email: 'user@example.com',
          },
        },
        error: null,
      });

      mockSupabase.auth.admin.deleteUser = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/delete-user', {
        method: 'POST',
        body: JSON.stringify({ userId: validUserId }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Failed to delete');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockSupabase.auth.admin.getUserById = jest
        .fn()
        .mockRejectedValue(new Error('Unexpected error'));

      const mockRequest = new NextRequest('http://localhost/api/admin/delete-user', {
        method: 'POST',
        body: JSON.stringify({ userId: validUserId }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
    });

    it('should handle malformed JSON body', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/delete-user', {
        method: 'POST',
        body: 'invalid json{{{',
        headers: { 'Content-Type': 'application/json' },
      });

      await expect(POST(mockRequest, { params: Promise.resolve({}) })).rejects.toThrow();
    });
  });

  describe('Security', () => {
    it('should prevent self-deletion', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/delete-user', {
        method: 'POST',
        body: JSON.stringify({ userId: adminId }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      expect(mockSupabase.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it('should use service role client for admin operations', async () => {
      const { createServiceSupabaseClient } = require('@/lib/supabase');

      mockSupabase.auth.admin.getUserById = jest.fn().mockResolvedValue({
        data: { user: { id: validUserId } },
        error: null,
      });

      mockSupabase.auth.admin.deleteUser = jest.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/delete-user', {
        method: 'POST',
        body: JSON.stringify({ userId: validUserId }),
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(createServiceSupabaseClient).toHaveBeenCalled();
    });
  });

  describe('Cascading Deletes', () => {
    it('should cascade delete user_profiles and related data', async () => {
      // This is handled at the database level, but we verify the deletion happens
      mockSupabase.auth.admin.getUserById = jest.fn().mockResolvedValue({
        data: {
          user: {
            id: validUserId,
            email: 'user@example.com',
          },
        },
        error: null,
      });

      mockSupabase.auth.admin.deleteUser = jest.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/delete-user', {
        method: 'POST',
        body: JSON.stringify({ userId: validUserId }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      // Only one delete operation - CASCADE handles related data at DB level
      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle deletion of non-existent user', async () => {
      mockSupabase.auth.admin.getUserById = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockSupabase.auth.admin.deleteUser = jest.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const mockRequest = new NextRequest('http://localhost/api/admin/delete-user', {
        method: 'POST',
        body: JSON.stringify({ userId: nonExistentId }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      // Should still attempt deletion (idempotent)
      expect(response.status).toBe(200);
    });
  });
});
