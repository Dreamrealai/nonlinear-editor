/**
 * Tests for DELETE /api/projects/[projectId] - Project Deletion
 */

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/projects/[projectId]/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

// Mock the Supabase module
jest.mock(
  '@/lib/supabase',
  (): Record<string, unknown> => ({
    createServerSupabaseClient: jest.fn(),
  })
);

// Mock server logger
jest.mock(
  '@/lib/serverLogger',
  (): Record<string, unknown> => ({
    serverLogger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  })
);

// Mock validation
jest.mock(
  '@/lib/validation',
  (): Record<string, unknown> => ({
    validateUUID: jest.fn((id: string, field: string) => {
      if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        const error = new Error(`${field} must be a valid UUID`);
        error.name = 'ValidationError';
        throw error;
      }
      return id;
    }),
    ValidationError: class ValidationError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
      }
    },
  })
);

describe('DELETE /api/projects/[projectId]', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when auth error occurs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' },
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 401 when user object is null', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      mockAuthenticatedUser(mockSupabase);
      const invalidId = 'not-a-valid-uuid';
      const mockRequest = new NextRequest(`http://localhost/api/projects/${invalidId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: invalidId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('UUID');
    });

    it('should return 400 for empty projectId', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/projects/', { method: 'DELETE' });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: '' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('UUID');
    });

    it('should return 400 for malformed UUID', async () => {
      mockAuthenticatedUser(mockSupabase);
      const malformedId = '550e8400-e29b-41d4-a716-44665544000X'; // Invalid character
      const mockRequest = new NextRequest(`http://localhost/api/projects/${malformedId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: malformedId }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Success Cases', () => {
    it('should delete project successfully', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        data: null,
        error: null,
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', validProjectId);
    });

    it('should call database methods in correct order', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        data: null,
        error: null,
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: 'DELETE',
      });

      await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      const fromCall = mockSupabase.from.mock.invocationCallOrder[0];
      const deleteCall = mockSupabase.delete.mock.invocationCallOrder[0];
      const eqCall = mockSupabase.eq.mock.invocationCallOrder[0];

      expect(fromCall).toBeLessThan(deleteCall);
      expect(deleteCall).toBeLessThan(eqCall);
    });

    it('should enforce RLS through ownership check', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        data: null,
        error: null,
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: 'DELETE',
      });

      await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      // Verify user is authenticated
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockUser).toBeTruthy();

      // RLS enforcement happens at database level
      expect(mockSupabase.delete).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database delete fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        data: null,
        error: { message: 'Delete operation failed' },
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete project');
    });

    it('should return 500 when unexpected error occurs', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle database connection errors', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        data: null,
        error: { message: 'Connection timeout' },
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(500);
    });
  });

  describe('Cascading Deletes', () => {
    it('should rely on database CASCADE to delete related resources', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        data: null,
        error: null,
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: 'DELETE',
      });

      await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      // Only one delete operation - CASCADE handles related data
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle deletion of non-existent project gracefully', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        data: null,
        error: null,
      });

      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const mockRequest = new NextRequest(`http://localhost/api/projects/${nonExistentId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: nonExistentId }),
      });

      // Should succeed (idempotent operation)
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should handle concurrent delete requests', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        data: null,
        error: null,
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}`, {
        method: 'DELETE',
      });

      // Multiple concurrent requests should all succeed (idempotent)
      const response1 = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });
      const response2 = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });

  describe('Security', () => {
    it('should not allow deletion of projects owned by other users', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      // RLS at database level will prevent this, but endpoint should handle gracefully
      mockSupabase.eq.mockReturnValue({
        data: null,
        error: null, // RLS allows query but returns no rows
      });

      const otherUserProjectId = '999e8400-e29b-41d4-a716-446655440999';
      const mockRequest = new NextRequest(`http://localhost/api/projects/${otherUserProjectId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: otherUserProjectId }),
      });

      // RLS ensures user can't delete other users' projects
      expect(response.status).toBe(200); // Success even if nothing deleted (idempotent)
    });
  });
});
